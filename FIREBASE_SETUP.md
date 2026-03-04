# 🔥 GUÍA DE CONFIGURACIÓN DE FIREBASE

## Paso 1: Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto" o "Add project"
3. Nombre del proyecto: **AcadeMatt** (o el que prefieras)
4. Desactiva Google Analytics si no lo necesitas (opcional)
5. Espera a que se cree el proyecto

## Paso 2: Configurar Aplicación Web

1. En tu proyecto de Firebase, haz clic en el ícono **</>** (Web)
2. Nombre de la app: **AcadeMatt Web**
3. **NO** marques "Firebase Hosting" por ahora
4. Copia la configuración que te muestra (el objeto `firebaseConfig`)

## Paso 3: Configurar en el Proyecto

### Opción A: Variables de Entorno (Recomendado para producción)

1. Copia `.env.example` a `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. Pega tus credenciales de Firebase en `.env.local`

3. Actualiza `src/firebase/config.js` para usar las variables:
   ```javascript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID
   };
   ```

### Opción B: Configuración Directa (Para desarrollo rápido)

Reemplaza directamente en `src/firebase/config.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "academatt-12345.firebaseapp.com",
  projectId: "academatt-12345",
  storageBucket: "academatt-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Paso 4: Habilitar Métodos de Autenticación

1. En Firebase Console, ve a **Authentication** (menú izquierdo)
2. Haz clic en **Get started** o **Sign-in method**
3. Habilita los proveedores que quieras:
   - ✅ **Email/Password** (esencial)
   - ✅ **Google** (recomendado)
   - Otros: Facebook, GitHub, etc.

### Para habilitar Google:
1. Clic en "Google"
2. Activa el switch
3. Selecciona un email de soporte del proyecto
4. Guarda

## Paso 5: Configurar Firestore Database

1. Ve a **Firestore Database** en el menú
2. Clic en **Create database**
3. Selecciona **Start in test mode** (para desarrollo)
4. Elige una ubicación (ej: us-central)
5. Se creará automáticamente

### Reglas de Seguridad Básicas (temporal para desarrollo):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer su propia info
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chats: solo usuarios autenticados
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Paso 6: Estructura de Datos en Firestore

### Colección: `users`
```json
{
  "uid": {
    "email": "usuario@ejemplo.com",
    "displayName": "Juan Pérez",
    "role": "student",  // "student", "tutor", "admin"
    "photoURL": "https://...",
    "createdAt": "2026-03-04T...",
    "settings": {
      "notifications": true
    }
  }
}
```

### Colección: `chats`
```json
{
  "chatId": {
    "participants": ["uid1", "uid2"],
    "studentId": "uid1",
    "tutorId": "uid2",
    "status": "active",  // "active", "completed", "cancelled"
    "createdAt": "2026-03-04T...",
    "lastMessage": "Última mensaje...",
    "lastMessageAt": "2026-03-04T..."
  }
}
```

### Subcolección: `chats/{chatId}/messages`
```json
{
  "messageId": {
    "senderId": "uid1",
    "senderName": "Juan",
    "text": "Hola, necesito ayuda con...",
    "type": "text",  // "text", "proposal", "system"
    "timestamp": "2026-03-04T...",
    "read": false
  }
}
```

## Paso 7: Reiniciar el Servidor de Desarrollo

```bash
# Detener el servidor (Ctrl+C)
# Reiniciar:
npm run dev
```

## ✅ Verificación

Una vez configurado, deberías poder:
- ✅ Ver la landing page
- ✅ Hacer clic en "Iniciar Consulta"
- ✅ Ver página de Login/Register
- ✅ Registrarte con email/password
- ✅ Iniciar sesión con Google
- ✅ Ver el dashboard con tu información
- ✅ Cerrar sesión

## 🔒 Seguridad

### Para producción, actualiza las reglas de Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Función helper para verificar roles
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    match /chats/{chatId} {
      allow read: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
    }
    
    match /chats/{chatId}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }
  }
}
```

## 📚 Recursos Adicionales

- [Firebase Docs - Authentication](https://firebase.google.com/docs/auth)
- [Firebase Docs - Firestore](https://firebase.google.com/docs/firestore)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)

---

¿Tienes problemas? Revisa la consola del navegador (F12) para ver errores específicos.
