import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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

      // Asignar tutor por capacidad
      await assignTutorByCapacity(conversationRef.id);

      return conversationRef.id;
    } catch (error) {
      throw error;
    }
  };

  // Asignar tutor por capacidad (Capacity-Based Assignment)
  const assignTutorByCapacity = async (conversationId) => {
    try {
      // Buscar tutores disponibles
      const tutorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'tutor'),
        where('available', '==', true)
      );

      const tutorsSnapshot = await getDocs(tutorsQuery);

      if (tutorsSnapshot.empty) {
        // No hay tutores disponibles
        await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          senderId: 'system',
          senderName: 'Sistema',
          senderRole: 'system',
          text: 'Lo sentimos, no hay tutores disponibles en este momento. Te contactaremos cuando uno esté disponible.',
          timestamp: new Date().toISOString(),
          read: false
        });
        return;
      }

      // Contar conversaciones asignadas por tutor
      const tutorLoads = [];

      for (const tutorDoc of tutorsSnapshot.docs) {
        const tutorId = tutorDoc.id;
        const tutorData = tutorDoc.data();

        // Contar conversaciones activas del tutor
        const assignedConversationsQuery = query(
          collection(db, 'conversations'),
          where('tutorId', '==', tutorId),
          where('status', '==', 'assigned')
        );

        const assignedConversations = await getDocs(assignedConversationsQuery);

        tutorLoads.push({
          tutorId: tutorId,
          tutorName: tutorData.displayName,
          load: assignedConversations.size
        });
      }

      // Ordenar por menor carga
      tutorLoads.sort((a, b) => a.load - b.load);

      // Seleccionar tutor con menor carga
      const selectedTutor = tutorLoads[0];

      // Actualizar conversación con tutor asignado
      await updateDoc(doc(db, 'conversations', conversationId), {
        tutorId: selectedTutor.tutorId,
        tutorName: selectedTutor.tutorName,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      });

      // Mensaje de asignación
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        senderName: 'Sistema',
        senderRole: 'system',
        text: `¡Excelente! ${selectedTutor.tutorName} ha sido asignado como tu tutor. Te responderá pronto.`,
        timestamp: new Date().toISOString(),
        read: false
      });

      return selectedTutor.tutorId;
    } catch (error) {
      console.error('Error asignando tutor:', error);
      throw error;
    }
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

      // Actualizar lastMessageAt en la conversación
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessageAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      throw error;
    }
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
    updateUserRole,
    getAllUsers,
    setAvailability,
    createConversation,
    sendMessage,
    getUserConversations,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
