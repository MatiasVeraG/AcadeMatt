import axios from 'axios';
import { db } from './_lib/firebase.js';
import { verifyToken } from './_lib/auth.js';
import { applyCors } from './_lib/cors.js';
import { sanitizeString, sanitizeAmount } from './_lib/sanitize.js';

const COMMISSION_RATE = 0.10;

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
      LEMONSQUEEZY_API_KEY,
      LEMONSQUEEZY_STORE_ID,
      LEMONSQUEEZY_VARIANT_ID,
      FRONTEND_URL,
    } = process.env;

    if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID) {
      const missing = ['LEMONSQUEEZY_API_KEY', 'LEMONSQUEEZY_STORE_ID', 'LEMONSQUEEZY_VARIANT_ID']
        .filter(k => !process.env[k]);
      console.error('[Checkout] Missing env vars:', missing);
      return res.status(500).json({ error: `Variables de entorno faltantes: ${missing.join(', ')}` });
    }

    const amountInCents = Math.round(cleanAmount * 100);
    const redirectUrl = FRONTEND_URL || 'http://localhost:5173';

    const checkoutPayload = {
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: amountInCents,
          product_options: {
            name: `AcadeMatt: ${cleanSubject || 'Asesoría Académica'}`,
            description: cleanDescription || 'Servicio de tutoría académica personalizada',
            redirect_url: redirectUrl,
          },
          checkout_data: {
            custom: {
              conversation_id: cleanConversationId,
              student_id: cleanStudentId,
              teacher_id: cleanTutorId,
              query_id: cleanConversationId,
            },
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: String(LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: 'variants', id: String(LEMONSQUEEZY_VARIANT_ID) } },
        },
      },
    };

    const lsResponse = await axios.post(
      'https://api.lemonsqueezy.com/v1/checkouts',
      checkoutPayload,
      {
        headers: {
          Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
      }
    );

    const checkoutUrl = lsResponse.data.data.attributes.url;
    const checkoutId  = lsResponse.data.data.id;

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
      checkoutId,
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
    const lsError = error.response?.data;
    const lsStatus = error.response?.status;
    console.error('[Checkout] Lemon Squeezy error status:', lsStatus);
    console.error('[Checkout] Lemon Squeezy error body:', JSON.stringify(lsError || error.message));
    const detail = lsError?.errors?.[0]?.detail || lsError?.message || error.message;
    res.status(500).json({ error: 'Error al crear el checkout con Lemon Squeezy', detail, lsStatus });
  }
}
