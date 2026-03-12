import { db } from './_lib/firebase.js';
import { verifyToken } from './_lib/auth.js';
import { applyCors } from './_lib/cors.js';
import { sanitizeString } from './_lib/sanitize.js';

const assignmentMessage = (tutorName) =>
  `${tutorName} has been assigned as your tutor and will respond shortly.`;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  // Verify admin role - always read from DB, never trust client claims
  const adminDoc = await db.collection('users').doc(decoded.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción' });
  }

  const { conversationId, tutorId } = req.body;
  if (!conversationId || !tutorId) {
    return res.status(400).json({ error: 'conversationId y tutorId son requeridos' });
  }

  const cleanConversationId = sanitizeString(conversationId, 128);
  const cleanTutorId = sanitizeString(tutorId, 128);

  if (cleanConversationId.length < 10 || cleanTutorId.length < 10) {
    return res.status(400).json({ error: 'Parámetros con formato inválido' });
  }

  try {
    const [convDoc, tutorDoc] = await Promise.all([
      db.collection('conversations').doc(cleanConversationId).get(),
      db.collection('users').doc(cleanTutorId).get(),
    ]);

    if (!convDoc.exists) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    if (!tutorDoc.exists) {
      return res.status(404).json({ error: 'Tutor no encontrado' });
    }

    const tutorName = tutorDoc.data().displayName || 'Tutor';
    const assignedAt = new Date().toISOString();

    await db.collection('conversations').doc(cleanConversationId).update({
      tutorId: cleanTutorId,
      tutorName,
      status: 'assigned',
      assignedAt,
    });

    await db.collection('conversations').doc(cleanConversationId)
      .collection('messages').add({
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        text: assignmentMessage(tutorName),
        timestamp: assignedAt,
        read: false,
      });

    return res.json({ success: true, tutorId: cleanTutorId, tutorName });
  } catch (error) {
    console.error('[AdminAssignTutor] Error:', error.message);
    res.status(500).json({ error: 'Error al asignar tutor' });
  }
}
