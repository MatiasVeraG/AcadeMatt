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

  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId es requerido' });
  }

  const cleanConversationId = sanitizeString(conversationId, 128);
  if (cleanConversationId.length < 10) {
    return res.status(400).json({ error: 'conversationId con formato inválido' });
  }

  const convDoc = await db.collection('conversations').doc(cleanConversationId).get();
  if (!convDoc.exists) {
    return res.status(404).json({ error: 'Conversación no encontrada' });
  }
  if (convDoc.data().studentId !== decoded.uid) {
    return res.status(403).json({ error: 'No autorizado para esta conversación' });
  }

  try {
    const tutorsSnapshot = await db.collection('users')
      .where('role', '==', 'tutor')
      .where('available', '==', true)
      .get();

    if (tutorsSnapshot.empty) {
      // Try fallback: use the admin-configured default tutor
      const configSnap = await db.collection('config').doc('settings').get();
      const defaultTutorId = configSnap.exists ? configSnap.data().defaultTutorId : null;

      if (defaultTutorId) {
        const defaultTutorDoc = await db.collection('users').doc(defaultTutorId).get();
        if (defaultTutorDoc.exists) {
          const defaultTutorName = defaultTutorDoc.data().displayName || 'Tutor';
          const assignedAt = new Date().toISOString();
          await db.collection('conversations').doc(cleanConversationId).update({
            tutorId: defaultTutorId,
            tutorName: defaultTutorName,
            status: 'assigned',
            assignedAt,
          });
          await db.collection('conversations').doc(cleanConversationId)
            .collection('messages').add({
              senderId: 'system',
              senderName: 'Sistema',
              senderRole: 'system',
              text: assignmentMessage(defaultTutorName),
              timestamp: assignedAt,
              read: false,
            });
          return res.json({ success: true, tutorAssigned: true, tutorId: defaultTutorId, tutorName: defaultTutorName, fallback: true });
        }
      }

      // No available tutors and no fallback configured
      await db.collection('conversations').doc(cleanConversationId)
        .collection('messages').add({
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          text: 'Sorry, no tutors are available at the moment. We will contact you when one becomes available.',
          timestamp: new Date().toISOString(),
          read: false,
        });
      return res.json({ success: true, tutorAssigned: false });
    }

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

    tutorLoads.sort((a, b) => a.load - b.load);
    const selected = tutorLoads[0];
    const assignedAt = new Date().toISOString();

    await db.collection('conversations').doc(cleanConversationId).update({
      tutorId: selected.tutorId,
      tutorName: selected.tutorName,
      status: 'assigned',
      assignedAt,
    });

    await db.collection('conversations').doc(cleanConversationId)
      .collection('messages').add({
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        text: assignmentMessage(selected.tutorName),
        timestamp: assignedAt,
        read: false,
      });

    res.json({ success: true, tutorAssigned: true, tutorId: selected.tutorId, tutorName: selected.tutorName });

  } catch (error) {
    console.error('[AssignTutor] Error:', error.message);
    res.status(500).json({ error: 'Error al asignar tutor' });
  }
}
