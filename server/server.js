require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const admin = require('firebase-admin');

// ─── Firebase Admin Initialization ────────────────────────────────────────────
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    serviceAccount = require('./academatt-firebase-adminsdk-fbsvc-85e197442c.json');
  }
} catch {
  console.error(
    '❌  Firebase service account not found.\n' +
    '    Place serviceAccountKey.json in the server/ folder or set\n' +
    '    FIREBASE_SERVICE_ACCOUNT_JSON in your .env file.\n' +
    '    See .env.example for instructions.'
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Express Setup ─────────────────────────────────────────────────────────────
const app = express();

// Webhook endpoint needs the raw body to validate the HMAC signature —
// it must be registered BEFORE express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const {
  LEMONSQUEEZY_API_KEY,
  LEMONSQUEEZY_STORE_ID,
  LEMONSQUEEZY_VARIANT_ID,
  LEMONSQUEEZY_WEBHOOK_SECRET,
} = process.env;

const COMMISSION_RATE = 0.10; // 10% platform fee

// ─── Helper: verify Firebase ID token ─────────────────────────────────────────
async function verifyToken(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token ausente' });
    return null;
  }
  try {
    return await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    res.status(401).json({ error: 'No autorizado: token inválido' });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/checkout
// Creates a dynamic Lemon Squeezy checkout for a specific offer.
// Called by the tutor's frontend after entering a price and description.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  const { conversationId, studentId, tutorId, tutorName, amount, description, subject } = req.body;

  // Security: only the assigned tutor may create an offer
  if (decoded.uid !== tutorId) {
    return res.status(403).json({ error: 'Solo el tutor asignado puede crear una oferta' });
  }

  if (!conversationId || !studentId || !tutorId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Datos incompletos o precio inválido' });
  }

  // Prevent duplicate pending offers
  const existingOffer = await db.collection('offers')
    .where('conversationId', '==', conversationId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!existingOffer.empty) {
    return res.status(409).json({ error: 'Ya existe una oferta pendiente para esta consulta' });
  }

  try {
    const amountFloat = parseFloat(amount);
    const amountInCents = Math.round(amountFloat * 100);
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Build the Lemon Squeezy checkout payload
    const checkoutPayload = {
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: amountInCents,
          product_options: {
            name: `AcadeMatt: ${subject || 'Asesoría Académica'}`,
            description: description || 'Servicio de tutoría académica personalizada',
            redirect_url: redirectUrl,
          },
          checkout_data: {
            custom: {
              conversation_id: conversationId,
              student_id: studentId,
              teacher_id: tutorId,
              query_id: conversationId,
            },
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: String(LEMONSQUEEZY_STORE_ID) },
          },
          variant: {
            data: { type: 'variants', id: String(LEMONSQUEEZY_VARIANT_ID) },
          },
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
    const checkoutId = lsResponse.data.data.id;

    const platformFee = parseFloat((amountFloat * COMMISSION_RATE).toFixed(2));
    const tutorEarnings = parseFloat((amountFloat - platformFee).toFixed(2));

    // Persist offer in Firestore
    const offerRef = await db.collection('offers').add({
      conversationId,
      studentId,
      tutorId,
      tutorName: tutorName || 'Tutor',
      amount: amountFloat,
      platformFee,
      tutorEarnings,
      description: description || '',
      subject: subject || '',
      status: 'pending',
      checkoutUrl,
      checkoutId,
      createdAt: new Date().toISOString(),
      paidAt: null,
    });

    // Mark the conversation as having a pending offer
    await db.collection('conversations').doc(conversationId).update({
      hasOffer: true,
      offerStatus: 'pending',
      offerId: offerRef.id,
    });

    console.log(`[Checkout] Offer ${offerRef.id} created for conversation ${conversationId}`);
    res.json({ success: true, offerId: offerRef.id, checkoutUrl });

  } catch (error) {
    const lsError = error.response?.data;
    console.error('[Checkout] Lemon Squeezy error:', lsError || error.message);
    res.status(500).json({ error: 'Error al crear el checkout con Lemon Squeezy' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhook
// Receives signed events from Lemon Squeezy.
// Raw body is preserved so the HMAC-SHA256 signature can be verified.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];

    if (!signature || !LEMONSQUEEZY_WEBHOOK_SECRET) {
      console.warn('[Webhook] Missing signature or webhook secret not configured');
      return res.status(401).json({ error: 'Firma ausente o secreto no configurado' });
    }

    // Constant-time HMAC verification to prevent timing attacks
    const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(req.body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = JSON.parse(req.body.toString('utf8'));
    const eventName = payload.meta?.event_name;
    console.log(`[Webhook] Event received: ${eventName}`);

    if (eventName === 'order_created') {
      const customData = payload.meta?.custom_data || {};
      const conversationId = customData.conversation_id || customData.query_id;

      if (!conversationId) {
        console.warn('[Webhook] No conversation_id in custom_data — skipping');
        return res.status(200).json({ received: true });
      }

      // Find the matching pending offer
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

      // 1. Mark offer as paid (commission already computed at offer creation time)
      await offerDoc.ref.update({
        status: 'paid',
        paidAt,
        lsOrderId: payload.data?.id || null,
      });

      // 2. Enable the workspace / chat in the conversation
      await db.collection('conversations').doc(conversationId).update({
        offerStatus: 'paid',
        chatEnabled: true,
        paidAt,
      });

      // 3. Notify both parties via a system message in the chat
      await db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          text: `✅ ¡Pago confirmado por $${offer.amount.toFixed(2)} USD! El espacio de trabajo está habilitado. El tutor comenzará a trabajar en tu consulta.`,
          timestamp: paidAt,
          read: false,
        });

      // 4. Create a notification document for the tutor
      await db.collection('notifications').add({
        userId: offer.tutorId,
        type: 'payment_received',
        conversationId,
        message: `💰 ¡Pago recibido! El estudiante pagó $${offer.amount.toFixed(2)} USD. Tu ganancia neta: $${offer.tutorEarnings.toFixed(2)} USD (comisión del 10% descontada: $${offer.platformFee.toFixed(2)} USD).`,
        amount: offer.amount,
        tutorEarnings: offer.tutorEarnings,
        platformFee: offer.platformFee,
        read: false,
        createdAt: paidAt,
      });

      console.log(`[Webhook] Payment confirmed — conversation: ${conversationId} | amount: $${offer.amount} | tutor earnings: $${offer.tutorEarnings}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    // Always return 200 to prevent Lemon Squeezy from retrying on our logic errors
    res.status(200).json({ received: true, warning: 'Internal processing error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assign-tutor
// Assigns the available tutor with the lowest active-conversation load to a
// newly-created conversation.  Runs with Admin SDK so no Firestore rule
// restrictions apply — the client (student) cannot perform these cross-
// collection reads under the security rules.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/assign-tutor', async (req, res) => {
  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId es requerido' });
  }

  // Verify the conversation belongs to the requesting student
  const convDoc = await db.collection('conversations').doc(conversationId).get();
  if (!convDoc.exists) {
    return res.status(404).json({ error: 'Conversación no encontrada' });
  }
  if (convDoc.data().studentId !== decoded.uid) {
    return res.status(403).json({ error: 'No autorizado para esta conversación' });
  }

  try {
    // 1. Find all available tutors
    const tutorsSnapshot = await db.collection('users')
      .where('role', '==', 'tutor')
      .where('available', '==', true)
      .get();

    if (tutorsSnapshot.empty) {
      // No tutors available — add system message and return gracefully
      await db.collection('conversations').doc(conversationId)
        .collection('messages').add({
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          text: 'Lo sentimos, no hay tutores disponibles en este momento. Te contactaremos cuando uno esté disponible.',
          timestamp: new Date().toISOString(),
          read: false,
        });
      return res.json({ success: true, tutorAssigned: false });
    }

    // 2. Count active conversations per tutor
    const tutorLoads = await Promise.all(
      tutorsSnapshot.docs.map(async (tutorDoc) => {
        const assigned = await db.collection('conversations')
          .where('tutorId', '==', tutorDoc.id)
          .where('status', '==', 'assigned')
          .get();
        return {
          tutorId: tutorDoc.id,
          tutorName: tutorDoc.data().displayName || 'Tutor',
          load: assigned.size,
        };
      })
    );

    // 3. Pick tutor with the lowest load
    tutorLoads.sort((a, b) => a.load - b.load);
    const selected = tutorLoads[0];

    const assignedAt = new Date().toISOString();

    // 4. Update the conversation
    await db.collection('conversations').doc(conversationId).update({
      tutorId: selected.tutorId,
      tutorName: selected.tutorName,
      status: 'assigned',
      assignedAt,
    });

    // 5. System message
    await db.collection('conversations').doc(conversationId)
      .collection('messages').add({
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        text: `¡Excelente! ${selected.tutorName} ha sido asignado como tu tutor. Te responderá pronto.`,
        timestamp: assignedAt,
        read: false,
      });

    console.log(`[AssignTutor] Tutor ${selected.tutorId} assigned to conversation ${conversationId} (load: ${selected.load})`);
    res.json({ success: true, tutorAssigned: true, tutorId: selected.tutorId, tutorName: selected.tutorName });

  } catch (error) {
    console.error('[AssignTutor] Error:', error.message);
    res.status(500).json({ error: 'Error al asignar tutor' });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AcadeMatt API', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀  AcadeMatt server running on http://localhost:${PORT}`);
});
