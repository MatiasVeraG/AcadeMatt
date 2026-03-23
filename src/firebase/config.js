import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const sanitizeEnv = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const normalizeAuthDomain = (value) => {
  const clean = sanitizeEnv(value);
  if (!clean) return clean;
  return clean.replace(/^https?:\/\//i, '').replace(/\/$/, '');
};

// Configuración de Firebase — valores cargados desde variables de entorno
// (definidas en .env.local para desarrollo, en el dashboard del host para producción)
const firebaseConfig = {
  apiKey:            sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain:        normalizeAuthDomain(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId:         sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket:     sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId:             sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
