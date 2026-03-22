import axios from 'axios';
import { db } from './_lib/firebase.js';

// Disable Vercel's automatic body parsing — we need the raw body for PayPal signature verification
export const config = {
  api: { bodyParser: false },
};

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function getPayPalAccessToken({ clientId, clientSecret, apiBaseUrl }) {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenResponse = await axios.post(
    `${apiBaseUrl}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return tokenResponse.data?.access_token;
}

async function verifyPayPalWebhookSignature({ apiBaseUrl, accessToken, webhookId, headers, payload }) {
  const verificationPayload = {
    transmission_id: headers['paypal-transmission-id'],
    transmission_time: headers['paypal-transmission-time'],
    cert_url: headers['paypal-cert-url'],
    auth_algo: headers['paypal-auth-algo'],
    transmission_sig: headers['paypal-transmission-sig'],
    webhook_id: webhookId,
    webhook_event: payload,
  };

  const verifyResponse = await axios.post(
    `${apiBaseUrl}/v1/notifications/verify-webhook-signature`,
    verificationPayload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return verifyResponse.data?.verification_status === 'SUCCESS';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, provider: 'paypal', message: 'Webhook endpoint activo' });
  }

  // Webhook is called by PayPal servers — no CORS needed, no auth token
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const payload = JSON.parse(rawBody.toString('utf8'));

    const {
      PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET,
      PAYPAL_WEBHOOK_ID,
      PAYPAL_ENV,
    } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID || !PAYPAL_ENV) {
      const missing = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'PAYPAL_ENV']
        .filter(k => !process.env[k]);
      console.error('[Webhook] Missing env vars:', missing);
      return res.status(500).json({ error: `Variables de entorno faltantes: ${missing.join(', ')}` });
    }

    const envKey = (PAYPAL_ENV || 'sandbox').toLowerCase();
    const apiBaseUrl = PAYPAL_API_BASE[envKey] || PAYPAL_API_BASE.sandbox;

    const requiredHeaders = [
      'paypal-transmission-id',
      'paypal-transmission-time',
      'paypal-transmission-sig',
      'paypal-cert-url',
      'paypal-auth-algo',
    ];

    const missingHeaders = requiredHeaders.filter(h => !req.headers[h]);
    if (missingHeaders.length > 0) {
      console.warn('[Webhook] Missing PayPal headers:', missingHeaders);
      return res.status(401).json({ error: `Faltan headers de firma PayPal: ${missingHeaders.join(', ')}` });
    }

    const accessToken = await getPayPalAccessToken({
      clientId: PAYPAL_CLIENT_ID,
      clientSecret: PAYPAL_CLIENT_SECRET,
      apiBaseUrl,
    });

    const isValidSignature = await verifyPayPalWebhookSignature({
      apiBaseUrl,
      accessToken,
      webhookId: PAYPAL_WEBHOOK_ID,
      headers: req.headers,
      payload,
    });

    if (!isValidSignature) {
      console.warn('[Webhook] Invalid PayPal signature');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const eventName = payload.event_type;
    console.log(`[Webhook] Event received: ${eventName}`);

    if (eventName === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = payload.resource || {};
      const paypalOrderId = capture.supplementary_data?.related_ids?.order_id || null;
      const paypalCaptureId = capture.id || null;

      if (!paypalOrderId) {
        console.warn('[Webhook] No paypalOrderId in capture payload — skipping');
        return res.status(200).json({ received: true });
      }

      const offersSnapshot = await db.collection('offers')
        .where('paypalOrderId', '==', paypalOrderId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (offersSnapshot.empty) {
        const existingOfferSnapshot = await db.collection('offers')
          .where('paypalOrderId', '==', paypalOrderId)
          .limit(1)
          .get();

        if (!existingOfferSnapshot.empty && existingOfferSnapshot.docs[0].data().status === 'paid') {
          console.log(`[Webhook] Event already processed for PayPal order: ${paypalOrderId}`);
          return res.status(200).json({ received: true, idempotent: true });
        }

        console.warn(`[Webhook] No pending offer found for PayPal order: ${paypalOrderId}`);
        return res.status(200).json({ received: true, ignored: true });
      }

      const offerDoc = offersSnapshot.docs[0];
      const offer = offerDoc.data();
      const conversationId = offer.conversationId;
      const paidAt = new Date().toISOString();
      const amount = Number(offer.amount || 0);
      const tutorEarnings = Number(offer.tutorEarnings || 0);
      const platformFee = Number(offer.platformFee || 0);

      await offerDoc.ref.update({
        status: 'paid',
        paidAt,
        paypalCaptureId,
        paypalEventId: payload.id || null,
      });

      await db.collection('conversations').doc(conversationId).update({
        offerStatus: 'paid',
        chatEnabled: true,
        paidAt,
      });

      await db.collection('conversations').doc(conversationId)
        .collection('messages').add({
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          text: `✅ Payment confirmed for $${amount.toFixed(2)} USD! The workspace is now enabled. Your tutor will begin working on your consultation.`,
          timestamp: paidAt,
          read: false,
        });

      await db.collection('notifications').add({
        userId: offer.tutorId,
        type: 'payment_received',
        conversationId,
        message: `💰 Payment received! The student paid $${amount.toFixed(2)} USD. Your net earnings: $${tutorEarnings.toFixed(2)} USD (10% platform fee deducted: $${platformFee.toFixed(2)} USD).`,
        amount,
        tutorEarnings,
        platformFee,
        read: false,
        createdAt: paidAt,
      });

      console.log(`[Webhook] Payment confirmed — conversation: ${conversationId} | amount: $${amount} | order: ${paypalOrderId}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    res.status(200).json({ received: true, warning: 'Internal processing error' });
  }
}
