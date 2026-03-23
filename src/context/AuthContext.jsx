import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, onSnapshot, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

const getRouteByRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'tutor') return '/tutor';
  return '/marketplace';
};

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
  const signupInProgressRef = useRef(false);

  // Registrar nuevo usuario
  const signup = async (email, password, displayName, role = 'student') => {
    signupInProgressRef.current = true;
    setCurrentUser(null);
    setUserRole(null);
    let createdUser = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      createdUser = user;

      // Actualizar perfil
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Guardar información adicional en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName || null,
        role: role,
        createdAt: serverTimestamp(),
        balance: 0,
        photoURL: user.photoURL || null,
        available: role === 'tutor' ? false : null, // Solo tutores tienen disponibilidad
        lastActive: new Date().toISOString()
      });

      await sendEmailVerification(user);
      await signOut(auth);

      return { user, role, requiresEmailVerification: true };
    } catch (error) {
      // If Firestore profile creation fails after auth user creation,
      // remove the auth user to avoid orphan accounts in Authentication.
      if (createdUser && error.code !== 'auth/email-already-in-use') {
        try {
          await deleteUser(createdUser);
        } catch (_) {
          // ignore cleanup errors; we still throw original error
        }
      }

      if (error.code === 'auth/email-already-in-use') {
        const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);

        if (methods.includes('google.com') && !methods.includes('password')) {
          const providerError = new Error('auth/email-in-use-with-google');
          providerError.code = 'auth/email-in-use-with-google';
          throw providerError;
        }

        try {
          const existingCredential = await signInWithEmailAndPassword(auth, email, password);
          const existingUser = existingCredential.user;

          if (!existingUser.emailVerified) {
            await sendEmailVerification(existingUser);
            await signOut(auth);
            const resendError = new Error('auth/email-already-in-use-unverified');
            resendError.code = 'auth/email-already-in-use-unverified';
            throw resendError;
          }

          await signOut(auth);
        } catch (signInError) {
          if (signInError?.code === 'auth/email-already-in-use-unverified') {
            throw signInError;
          }
          // If credentials don't match, fall back to the original Firebase error.
        }
      }
      throw error;
    } finally {
      signupInProgressRef.current = false;
    }
  };

  // Iniciar sesión
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        try {
          await sendEmailVerification(user);
        } catch (verificationErr) {
          console.warn('No se pudo reenviar email de verificacion:', verificationErr.message);
        }
        await signOut(auth);
        const err = new Error('auth/email-not-verified');
        err.code = 'auth/email-not-verified';
        throw err;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        const err = new Error('auth/profile-not-found');
        err.code = 'auth/profile-not-found';
        err.email = user.email || email;
        throw err;
      }

      const role = userDoc.data().role || 'student';
      setCurrentUser(user);
      setUserRole(role);
      return {
        user: userCredential.user,
        role,
        redirectPath: getRouteByRole(role)
      };
    } catch (error) {
      if (error.code === 'auth/invalid-credential') {
        const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
        const mappedCode = methods.length ? 'auth/wrong-password' : 'auth/user-not-found';
        const mapped = new Error(mappedCode);
        mapped.code = mappedCode;
        throw mapped;
      }
      throw error;
    }
  };

  // Iniciar sesión con Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // Important: do not keep Auth accounts that are not linked to an app profile.
        // This prevents orphan users in Firebase Authentication after Google login attempts.
        try {
          await deleteUser(user);
        } catch (_) {
          // If deletion fails, ensure we still sign out and return a controlled error.
        }

        try {
          await signOut(auth);
        } catch (_) {}

        const err = new Error('auth/profile-not-found');
        err.code = 'auth/profile-not-found';
        throw err;
      }

      const role = userDoc.data().role || 'student';
      setCurrentUser(user);
      setUserRole(role);
      return {
        user,
        role,
        redirectPath: getRouteByRole(role)
      };
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

  // Configurar tutor de respaldo (solo admins)
  const setDefaultTutor = async (tutorId) => {
    if (userRole !== 'admin') throw new Error('No tienes permisos para realizar esta acción');
    await setDoc(doc(db, 'config', 'settings'), { defaultTutorId: tutorId }, { merge: true });
  };

  // Leer tutor de respaldo
  const getDefaultTutor = async () => {
    const snap = await getDoc(doc(db, 'config', 'settings'));
    return snap.exists() ? (snap.data().defaultTutorId || null) : null;
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
        text: 'Hello! Your consultation has been received. We are finding the best available tutor for you.',
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
    try {
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
    } catch (error) {
      if (error?.name === 'TypeError') {
        throw new Error('Backend service is offline. Start the local API server on port 3001 and try again.');
      }
      throw error;
    }
  };

  // Enviar mensaje en una conversación
  const sendMessage = async (conversationId, text, fileData = null) => {
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
        read: false,
        ...(fileData && {
          fileURL: fileData.downloadURL,
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          fileSize: fileData.fileSize,
        }),
      };

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);

      // Update conversation metadata + unread counter — best-effort, not critical
      try {
        const recipientUnreadField = userRole === 'student' ? 'tutorUnread' : 'studentUnread';
        const lastText = text || (fileData ? `📎 ${fileData.fileName}` : '');
        await updateDoc(doc(db, 'conversations', conversationId), {
          lastMessageAt: new Date().toISOString(),
          lastMessageText: lastText.substring(0, 120),
          [recipientUnreadField]: increment(1)
        });
      } catch (metaErr) {
        console.warn('sendMessage: metadata update failed (message was sent):', metaErr.message);
      }

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
      filesArchived: false,
    });
  };

  // Mover una consulta a "En Proceso" (solo tutor/admin)
  const moveToInProgress = async (conversationId) => {
    await updateDoc(doc(db, 'conversations', conversationId), { inProgressForTutor: true });
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
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  // Asignar tutor manualmente (solo admins)
  const adminAssignTutor = async (conversationId, tutorId) => {
    if (!currentUser) throw new Error('Debes iniciar sesión');
    if (userRole !== 'admin') throw new Error('Solo los administradores pueden realizar esta acción');
    const token = await currentUser.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
    const response = await fetch(`${apiUrl}/api/admin-assign-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, tutorId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Error al asignar tutor');
    }
    return response.json();
  };

  // Crear oferta de pago: llama al backend que genera el checkout en PayPal
  // y persiste la oferta en Firestore.
  const createOffer = async (conversationId, amount, description) => {
    if (!currentUser) throw new Error('Debes iniciar sesión');
    if (userRole !== 'tutor' && userRole !== 'admin') {
      throw new Error('Solo tutores o admins pueden crear ofertas');
    }

    const token = await currentUser.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

    // Fetch conversation to get studentId and subject
    const convDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (!convDoc.exists()) throw new Error('Conversación no encontrada');
    const convData = convDoc.data();

    let effectiveTutorId = currentUser.uid;
    let effectiveTutorName = currentUser.displayName;

    // If an admin creates the offer on an assigned conversation, keep earnings tied
    // to the assigned tutor account instead of the admin account.
    if (userRole === 'admin' && convData.tutorId) {
      effectiveTutorId = convData.tutorId;
      const tutorDoc = await getDoc(doc(db, 'users', convData.tutorId));
      if (tutorDoc.exists()) {
        effectiveTutorName = tutorDoc.data().displayName || effectiveTutorName;
      }
    }

    const response = await fetch(`${apiUrl}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        studentId: convData.studentId,
        tutorId: effectiveTutorId,
        tutorName: effectiveTutorName,
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
      if (signupInProgressRef.current) {
        // During signup we intentionally avoid publishing a temporary authenticated
        // state to the app, preventing a brief redirect to protected routes.
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      if (!user) {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const isPasswordProvider = user.providerData.some((provider) => provider.providerId === 'password');
      if (isPasswordProvider && !user.emailVerified && !signupInProgressRef.current) {
        try {
          await signOut(auth);
        } catch (_) {}
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const role = await fetchUserRole(user.uid);
      if (!role) {
        if (signupInProgressRef.current) {
          setCurrentUser(user);
          setUserRole(null);
          setLoading(false);
          return;
        }

        try {
          sessionStorage.setItem('auth_profile_missing', '1');
          sessionStorage.setItem('auth_profile_missing_email', user.email || '');
          sessionStorage.setItem('auth_profile_missing_name', user.displayName || '');
        } catch (_) {}
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      setUserRole(role);
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
    getRouteByRole,
    setDefaultTutor,
    getDefaultTutor,
    updateUserRole,
    getAllUsers,
    setAvailability,
    createConversation,
    sendMessage,
    closeConversation,
    archiveConversation,
    moveToInProgress,
    submitReview,
    getUserConversations,
    adminAssignTutor,
    createOffer,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
