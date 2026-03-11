import crypto from 'crypto';
import { db } from './_lib/firebase.js';

// Disable Vercel's automatic body parsing — we need the raw body for HMAC verification
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Webhook is called by Lemon Squeezy servers — no CORS needed, no auth token
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-signature'];
    const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!signature || !LEMONSQUEEZY_WEBHOOK_SECRET) {
      console.warn('[Webhook] Missing signature or webhook secret not configured');
      return res.status(401).json({ error: 'Firma ausente o secreto no configurado' });
    }

    // Constant-time HMAC verification
    const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName = payload.meta?.event_name;
    console.log(`[Webhook] Event received: ${eventName}`);

    if (eventName === 'order_created') {
      const customData = payload.meta?.custom_data || {};
      const conversationId = customData.conversation_id || customData.query_id;

      if (!conversationId) {
        console.warn('[Webhook] No conversation_id in custom_data — skipping');
        return res.status(200).json({ received: true });
      }

      const offersSnapshot = await db.collection('offers')
        .where('conversationId', '==', conversationId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (offersSnapshot.empty) {
        console.warn(`[Webhook] No pending offer found for conversation: ${conversationId}`);
        return res.status(200).json({ received: true });
      }

      const offerDoc = offersSnapshot.docs[0];
      const offer = offerDoc.data();
      const paidAt = new Date().toISOString();

      await offerDoc.ref.update({
        status: 'paid',
        paidAt,
        lsOrderId: payload.data?.id || null,
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
          text: `✅ Payment confirmed for $${offer.amount.toFixed(2)} USD! The workspace is now enabled. Your tutor will begin working on your consultation.`,
          timestamp: paidAt,
          read: false,
        });

      await db.collection('notifications').add({
        userId: offer.tutorId,
        type: 'payment_received',
        conversationId,
        message: `💰 Payment received! The student paid $${offer.amount.toFixed(2)} USD. Your net earnings: $${offer.tutorEarnings.toFixed(2)} USD (10% platform fee deducted: $${offer.platformFee.toFixed(2)} USD).`,
        amount: offer.amount,
        tutorEarnings: offer.tutorEarnings,
        platformFee: offer.platformFee,
        read: false,
        createdAt: paidAt,
      });

      console.log(`[Webhook] Payment confirmed — conversation: ${conversationId} | amount: $${offer.amount}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    res.status(200).json({ received: true, warning: 'Internal processing error' });
  }
}
