import axios from 'axios';
import { db } from './_lib/firebase.js';
import { verifyToken } from './_lib/auth.js';
import { applyCors } from './_lib/cors.js';
import { sanitizeString, sanitizeAmount } from './_lib/sanitize.js';

const COMMISSION_RATE = 0.10;
const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

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

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  const { conversationId, studentId, tutorId, tutorName, amount, description, subject } = req.body;

  if (decoded.uid !== tutorId) {
    return res.status(403).json({ error: 'Solo el tutor asignado puede crear una oferta' });
  }

  const cleanConversationId = sanitizeString(conversationId, 128);
  const cleanStudentId      = sanitizeString(studentId, 128);
  const cleanTutorId        = sanitizeString(tutorId, 128);
  const cleanTutorName      = sanitizeString(tutorName, 100);
  const cleanDescription    = sanitizeString(description, 500);
  const cleanSubject        = sanitizeString(subject, 100);
  const cleanAmount         = sanitizeAmount(amount, 1, 10000);

  if (!cleanConversationId || !cleanStudentId || !cleanTutorId || cleanAmount === null) {
    return res.status(400).json({ error: 'Datos incompletos o precio inválido (mín $1, máx $10.000)' });
  }

  if (cleanConversationId.length < 10 || cleanStudentId.length < 10 || cleanTutorId.length < 10) {
    return res.status(400).json({ error: 'IDs con formato inválido' });
  }

  // Cancel existing pending offers
  const existingOffers = await db.collection('offers')
    .where('conversationId', '==', cleanConversationId)
    .where('status', '==', 'pending')
    .get();

  if (!existingOffers.empty) {
    const cancelBatch = db.batch();
    const cancelledAt = new Date().toISOString();
    existingOffers.docs.forEach(d => cancelBatch.update(d.ref, { status: 'cancelled', cancelledAt }));
    await cancelBatch.commit();
  }

  try {
    const {
      PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET,
      PAYPAL_ENV,
      FRONTEND_URL,
    } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_ENV) {
      const missing = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENV']
        .filter(k => !process.env[k]);
      console.error('[Checkout] Missing env vars:', missing);
      return res.status(500).json({ error: `Variables de entorno faltantes: ${missing.join(', ')}` });
    }

    const envKey = (PAYPAL_ENV || 'sandbox').toLowerCase();
    const apiBaseUrl = PAYPAL_API_BASE[envKey] || PAYPAL_API_BASE.sandbox;
    const redirectBase = FRONTEND_URL || 'http://localhost:5173';

    const accessToken = await getPayPalAccessToken({
      clientId: PAYPAL_CLIENT_ID,
      clientSecret: PAYPAL_CLIENT_SECRET,
      apiBaseUrl,
    });

    if (!accessToken) {
      return res.status(500).json({ error: 'No se pudo obtener token de PayPal' });
    }

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: cleanConversationId,
          custom_id: cleanConversationId,
          description: cleanDescription || `AcadeMatt: ${cleanSubject || 'Asesoria Academica'}`,
          amount: {
            currency_code: 'USD',
            value: cleanAmount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'AcadeMatt',
        user_action: 'PAY_NOW',
        return_url: `${redirectBase}/?payment=success`,
        cancel_url: `${redirectBase}/?payment=cancelled`,
      },
    };

    const paypalResponse = await axios.post(
      `${apiBaseUrl}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${cleanConversationId}-${Date.now()}`,
          Prefer: 'return=representation',
        },
      }
    );

    const orderId = paypalResponse.data?.id;
    const checkoutUrl = paypalResponse.data?.links?.find(link => link.rel === 'approve')?.href;

    if (!orderId || !checkoutUrl) {
      console.error('[Checkout] PayPal response missing orderId or approve URL');
      return res.status(500).json({ error: 'PayPal no devolvio URL de pago valida' });
    }

    const platformFee   = parseFloat((cleanAmount * COMMISSION_RATE).toFixed(2));
    const tutorEarnings = parseFloat((cleanAmount - platformFee).toFixed(2));

    const offerRef = await db.collection('offers').add({
      conversationId: cleanConversationId,
      studentId: cleanStudentId,
      tutorId: cleanTutorId,
      tutorName: cleanTutorName || 'Tutor',
      amount: cleanAmount,
      platformFee,
      tutorEarnings,
      description: cleanDescription,
      subject: cleanSubject,
      status: 'pending',
      checkoutUrl,
      paymentProvider: 'paypal',
      paypalOrderId: orderId,
      createdAt: new Date().toISOString(),
      paidAt: null,
    });

    await db.collection('conversations').doc(cleanConversationId).update({
      hasOffer: true,
      offerStatus: 'pending',
      offerId: offerRef.id,
    });

    res.json({ success: true, offerId: offerRef.id, checkoutUrl });

  } catch (error) {
    const paypalError = error.response?.data;
    const paypalStatus = error.response?.status;
    console.error('[Checkout] PayPal error status:', paypalStatus);
    console.error('[Checkout] PayPal error body:', JSON.stringify(paypalError || error.message));
    const detail = paypalError?.message || paypalError?.details?.[0]?.description || error.message;
    res.status(500).json({ error: 'Error al crear la orden de PayPal', detail, paypalStatus });
  }
}
