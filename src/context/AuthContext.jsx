import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, onSnapshot, deleteDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registrar nuevo usuario
  const signup = async (email, password, displayName, role = 'student') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar perfil
      await updateProfile(user, { displayName });

      // Guardar información adicional en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName,
        role: role,
        createdAt: new Date().toISOString(),
        photoURL: user.photoURL || null,
        available: role === 'tutor' ? false : null, // Solo tutores tienen disponibilidad
        lastActive: new Date().toISOString()
      });

      return user;
    } catch (error) {
      throw error;
    }
  };

  // Iniciar sesión
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  // Iniciar sesión con Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Si es nuevo usuario, crear documento
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          role: 'student',
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL,
          available: null,
          lastActive: new Date().toISOString()
        });
      }

      return user;
    } catch (error) {
      throw error;
    }
  };

  // Enviar email de recuperación de contraseña
  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      // Si es tutor, marcar como no disponible
      if (currentUser && userRole === 'tutor') {
        await setDoc(doc(db, 'users', currentUser.uid), {
          available: false,
          lastActive: new Date().toISOString()
        }, { merge: true });
      }
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  // Cambiar rol de usuario (solo para admins)
  const updateUserRole = async (userId, newRole) => {
    try {
      // Verificar que el usuario actual es admin
      if (userRole !== 'admin') {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      // Validar que el rol es válido
      const validRoles = ['student', 'tutor', 'admin'];
      if (!validRoles.includes(newRole)) {
        throw new Error('Rol inválido');
      }

      // Actualizar rol en Firestore
      await setDoc(doc(db, 'users', userId), {
        role: newRole
      }, { merge: true });

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Obtener todos los usuarios (solo para admins)
  const getAllUsers = async () => {
    try {
      if (userRole !== 'admin') {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return usersList;
    } catch (error) {
      throw error;
    }
  };

  // Cambiar disponibilidad del tutor
  const setAvailability = async (available) => {
    try {
      if (userRole !== 'tutor') {
        throw new Error('Solo los tutores pueden cambiar su disponibilidad');
      }

      await setDoc(doc(db, 'users', currentUser.uid), {
        available: available,
        lastActive: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Crear nueva conversación
  const createConversation = async (subject) => {
    try {
      if (!currentUser) {
        throw new Error('Debes iniciar sesión');
      }

      // Crear conversación
      const conversationData = {
        studentId: currentUser.uid,
        studentName: currentUser.displayName,
        tutorId: null,
        tutorName: null,
        status: 'pending',
        subject: subject,
        createdAt: new Date().toISOString(),
        assignedAt: null,
        completedAt: null,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0
      };

      const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);

      // Mensaje inicial del sistema
      await addDoc(collection(db, 'conversations', conversationRef.id, 'messages'), {
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        text: '¡Hola! Tu consulta ha sido recibida. Estamos buscando al mejor tutor disponible para ayudarte.',
        timestamp: new Date().toISOString(),
        read: false
      });

      // Asignar tutor por capacidad.
      // Si falla, marcar la conversación como fallida (el estudiante no tiene
      // permisos de delete en Firestore, así que usamos update en su lugar).
      try {
        await assignTutorByCapacity(conversationRef.id);
      } catch (assignError) {
        try {
          await updateDoc(doc(db, 'conversations', conversationRef.id), {
            status: 'failed',
            failedAt: new Date().toISOString(),
          });
        } catch (cleanupError) {
          console.error('Error al limpiar conversación huérfana:', cleanupError);
        }
        throw assignError;
      }

      return conversationRef.id;
    } catch (error) {
      throw error;
    }
  };

  // Asignar tutor por capacidad — delegado al backend (usa Admin SDK)
  const assignTutorByCapacity = async (conversationId) => {
    const token = await currentUser.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    const response = await fetch(`${apiUrl}/api/assign-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al asignar tutor');
    }
    const data = await response.json();
    return data.tutorId || null;
  };

  // Enviar mensaje en una conversación
  const sendMessage = async (conversationId, text) => {
    try {
      if (!currentUser) {
        throw new Error('Debes iniciar sesión');
      }

      const messageData = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderRole: userRole,
        text: text,
        timestamp: new Date().toISOString(),
        read: false
      };

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);

      // Increment unread counter for the *other* party
      const recipientUnreadField = userRole === 'student' ? 'tutorUnread' : 'studentUnread';
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessageAt: new Date().toISOString(),
        lastMessageText: text.substring(0, 120),
        [recipientUnreadField]: increment(1)
      });

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Cerrar una consulta con un estado de resultado
  const closeConversation = async (conversationId, closingStatus = 'successful') => {
    await updateDoc(doc(db, 'conversations', conversationId), {
      status: 'completed',
      completedAt: new Date().toISOString(),
      closingStatus,
    });
  };

  // Archivar una consulta para el usuario actual
  const archiveConversation = async (conversationId) => {
    const field = userRole === 'student' ? 'archivedForStudent' : 'archivedForTutor';
    await updateDoc(doc(db, 'conversations', conversationId), { [field]: true });
  };

  // Dejar una reseña para una consulta finalizada (una por consulta)
  const submitReview = async (conversationId, { rating, text, tutorId, tutorName, subject, closingStatus }) => {
    if (!currentUser) throw new Error('Debes iniciar sesión');
    // Prevent duplicate reviews
    await addDoc(collection(db, 'reviews'), {
      conversationId,
      studentId: currentUser.uid,
      studentName: currentUser.displayName || 'Estudiante',
      tutorId: tutorId || null,
      tutorName: tutorName || 'Tutor',
      subject: subject || '',
      rating,
      text: text.trim().substring(0, 600),
      closingStatus: closingStatus || 'successful',
      createdAt: new Date().toISOString(),
    });
    // Mark conversation so modal doesn't show again
    await updateDoc(doc(db, 'conversations', conversationId), { reviewSubmitted: true });
  };

  // Obtener conversaciones del usuario actual
  const getUserConversations = async () => {
    try {
      if (!currentUser) {
        throw new Error('Debes iniciar sesión');
      }

      let conversationsQuery;

      if (userRole === 'student') {
        // Estudiantes ven sus propias conversaciones
        conversationsQuery = query(
          collection(db, 'conversations'),
          where('studentId', '==', currentUser.uid),
          orderBy('lastMessageAt', 'desc')
        );
      } else if (userRole === 'tutor') {
        // Tutores ven conversaciones asignadas
        conversationsQuery = query(
          collection(db, 'conversations'),
          where('tutorId', '==', currentUser.uid),
          where('status', '==', 'assigned'),
          orderBy('lastMessageAt', 'desc')
        );
      } else if (userRole === 'admin') {
        // Admins ven todas
        conversationsQuery = query(
          collection(db, 'conversations'),
          orderBy('lastMessageAt', 'desc')
        );
      }

      const conversationsSnapshot = await getDocs(conversationsQuery);
      
      const conversationsList = [];
      conversationsSnapshot.forEach((doc) => {
        conversationsList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return conversationsList;
    } catch (error) {
      throw error;
    }
  };

  // Obtener rol del usuario desde Firestore
  const fetchUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role;
      }
      return 'student'; // Default
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'student';
    }
  };

  // Crear oferta de pago: llama al backend que genera el checkout en Lemon Squeezy
  // y persiste la oferta en Firestore.
  const createOffer = async (conversationId, amount, description) => {
    if (!currentUser) throw new Error('Debes iniciar sesión');
    if (userRole !== 'tutor' && userRole !== 'admin') {
      throw new Error('Solo los tutores pueden crear ofertas');
    }

    const token = await currentUser.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

    // Fetch conversation to get studentId and subject
    const convDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (!convDoc.exists()) throw new Error('Conversación no encontrada');
    const convData = convDoc.data();

    const response = await fetch(`${apiUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        studentId: convData.studentId,
        tutorId: currentUser.uid,
        tutorName: currentUser.displayName,
        amount: parseFloat(amount),
        description: description || '',
        subject: convData.subject || 'Asesoría Académica',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = [errorData.error, errorData.detail].filter(Boolean).join(' — ') || `Error del servidor: ${response.status}`;
      throw new Error(msg);
    }

    return response.json(); // { success, offerId, checkoutUrl }
  };

  // Escuchar cambios en autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const role = await fetchUserRole(user.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserRole,
    getAllUsers,
    setAvailability,
    createConversation,
    sendMessage,
    closeConversation,
    archiveConversation,
    submitReview,
    getUserConversations,
    createOffer,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
