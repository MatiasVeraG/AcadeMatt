import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase para AcadeMatt
const firebaseConfig = {
  apiKey: "AIzaSyC7ZoCg3ZQhG3XkpnEOLaZnKFRR5x5e1lU",
  authDomain: "academatt.firebaseapp.com",
  projectId: "academatt",
  storageBucket: "academatt.firebasestorage.app",
  messagingSenderId: "153275954492",
  appId: "1:153275954492:web:b875f1c521fb2e8f10da39"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
