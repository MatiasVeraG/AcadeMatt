# ⚡ CONFIGURACIÓN RÁPIDA - 5 MINUTOS

## 1️⃣ Crea tu Proyecto Firebase (2 min)

1. Ve a: **https://console.firebase.google.com/**
2. Clic en **"Agregar proyecto"** o **"Add project"**
3. Nombre: **AcadeMatt**
4. Deshabilita Google Analytics (más rápido)
5. Clic en **"Crear proyecto"**

## 2️⃣ Configura la App Web (1 min)

1. En tu proyecto, clic en el ícono **</>** (Web)
2. Nombre de app: **AcadeMatt Web**
3. Clic en **"Registrar app"**
4. **COPIA** el código `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "academatt-xxxxx.firebaseapp.com",
  projectId: "academatt-xxxxx",
  ...
};
```

5. **PEGA** estos valores en: `src/firebase/config.js`

## 3️⃣ Habilita Autenticación (1 min)

1. Menú izquierdo → **Authentication** → **Get started**
2. Tab **"Sign-in method"**
3. Habilita **Email/Password**:
   - Clic en "Email/Password"
   - Activa el primer switch (Email/Password)
   - Guarda
4. Habilita **Google** (opcional pero recomendado):
   - Clic en "Google"
   - Activa el switch
   - Selecciona email de soporte
   - Guarda

## 4️⃣ Crea Firestore Database (1 min)

1. Menú izquierdo → **Firestore Database** → **Create database**
2. Selecciona **"Start in test mode"**
3. Ubicación: **us-central** (o la más cercana)
4. Clic en **"Enable"**

## ✅ ¡LISTO!

Refresca la página de tu app (http://localhost:5173/) y ya deberías poder:
- Registrarte con email
- Iniciar sesión con Google
- Ver tu perfil en el sidebar
- Cerrar sesión

---

**⚠️ IMPORTANTE:** 
- Las reglas están en modo "test" (permiten todo por 30 días)
- Antes de producción, actualiza las reglas de seguridad (ver FIREBASE_SETUP.md)
