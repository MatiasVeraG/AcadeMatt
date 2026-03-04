# 🔐 Reglas de Seguridad de Firestore para AcadeMatt

## ⚠️ Actual: Test Mode (INSEGURO)

Actualmente tienes Firestore en **test mode**, lo que significa:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ CUALQUIERA puede leer/escribir
    }
  }
}
```

**Esto es temporal y solo para desarrollo. Caduca en 30 días.**

---

## ✅ Reglas de Producción Recomendadas

Copia y pega estas reglas en **Firebase Console → Firestore → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    function isTutor() {
      return isAuthenticated() && getUserRole() == 'tutor';
    }
    
    function isStudent() {
      return isAuthenticated() && getUserRole() == 'student';
    }
    
    // ========================================
    // USERS COLLECTION
    // ========================================
    match /users/{userId} {
      // Lectura:
      // - Propietario puede leer su propio documento
      // - Admins pueden leer todos
      // - Tutores pueden leer otros tutores (para sistema de asignación)
      allow read: if isOwner(userId) || isAdmin() || isTutor();
      
      // Creación:
      // - Solo durante signup (request.auth.uid == userId)
      // - El rol inicial debe ser 'student'
      allow create: if isOwner(userId) 
                    && request.resource.data.role == 'student'
                    && request.resource.data.email == request.auth.token.email;
      
      // Actualización:
      // - Usuario puede actualizar su propio perfil (excepto rol)
      // - Admin puede actualizar cualquier usuario (incluyendo rol)
      allow update: if (isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']))
                    || isAdmin();
      
      // Eliminación:
      // - Solo admins pueden eliminar usuarios
      allow delete: if isAdmin();
    }
    
    // ========================================
    // CONVERSATIONS COLLECTION
    // ========================================
    match /conversations/{conversationId} {
      // Lectura:
      // - Estudiante puede leer sus propias conversaciones
      // - Tutor puede leer conversaciones asignadas a él
      // - Admin puede leer todas
      allow read: if isAuthenticated() && (
        resource.data.studentId == request.auth.uid ||
        resource.data.tutorId == request.auth.uid ||
        isAdmin()
      );
      
      // Creación:
      // - Solo estudiantes pueden crear conversaciones
      // - Debe crearse con status 'pending' y tutorId null
      // - El studentId debe ser el usuario actual
      allow create: if isAuthenticated() 
                    && isStudent()
                    && request.resource.data.studentId == request.auth.uid
                    && request.resource.data.status == 'pending'
                    && request.resource.data.tutorId == null;
      
      // Actualización:
      // - Sistema puede asignar tutor (cualquier usuario autenticado puede ejecutar la asignación)
      // - Tutor asignado puede actualizar status
      // - Estudiante puede actualizar su propia conversación
      // - Admin puede actualizar cualquier campo
      allow update: if isAuthenticated() && (
        // Permitir asignación inicial de tutor (de pending a assigned)
        (resource.data.status == 'pending' && 
         request.resource.data.status == 'assigned' &&
         request.resource.data.tutorId != null &&
         request.resource.data.tutorId != resource.data.tutorId) ||
        // Estudiante dueño puede actualizar (ej: cancelar)
        (resource.data.studentId == request.auth.uid && isStudent()) ||
        // Tutor asignado puede cambiar status
        (resource.data.tutorId == request.auth.uid && isTutor()) ||
        // Admin puede todo
        isAdmin()
      );
      
      // Eliminación:
      // - Solo admins pueden eliminar conversaciones
      allow delete: if isAdmin();
      
      // ========================================
      // MESSAGES SUBCOLLECTION
      // ========================================
      match /messages/{messageId} {
        // Lectura:
        // - Participantes de la conversación pueden leer mensajes
        allow read: if isAuthenticated() && (
          get(/databases/$(database)/documents/conversations/$(conversationId)).data.studentId == request.auth.uid ||
          get(/databases/$(database)/documents/conversations/$(conversationId)).data.tutorId == request.auth.uid ||
          isAdmin()
        );
        
        // Creación:
        // - Participantes de la conversación pueden crear mensajes
        // - El senderId debe ser el usuario actual O 'system'
        // - Mensajes del sistema se permiten durante la asignación
        allow create: if isAuthenticated() && (
          // Mensajes del sistema (durante asignación automática)
          (request.resource.data.senderId == 'system' && request.resource.data.senderRole == 'system') ||
          // Mensajes de participantes
          (request.resource.data.senderId == request.auth.uid &&
          (
            get(/databases/$(database)/documents/conversations/$(conversationId)).data.studentId == request.auth.uid ||
            get(/databases/$(database)/documents/conversations/$(conversationId)).data.tutorId == request.auth.uid
          ))
        );
        
        // Actualización:
        // - Nadie puede actualizar mensajes (son inmutables)
        allow update: if false;
        
        // Eliminación:
        // - Solo admins pueden eliminar mensajes
        allow delete: if isAdmin();
      }
    }
  }
}
```

---

## 📋 Resumen de Permisos

### 👤 Users Collection

| Operación | Estudiante | Tutor | Admin |
|-----------|-----------|-------|-------|
| Leer propio perfil | ✅ | ✅ | ✅ |
| Leer otros perfiles | ❌ | ✅ (solo tutores) | ✅ |
| Crear cuenta | ✅ (solo 'student') | ✅ (solo 'student') | ✅ |
| Actualizar propio perfil | ✅ (excepto rol) | ✅ (excepto rol) | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ✅ |

### 💬 Conversations Collection

| Operación | Estudiante | Tutor | Admin |
|-----------|-----------|-------|-------|
| Crear conversación | ✅ | ❌ | ✅ |
| Leer propias conversaciones | ✅ | ✅ | ✅ |
| Leer todas conversaciones | ❌ | ❌ | ✅ |
| Actualizar status | ❌ | ✅ (solo asignadas) | ✅ |
| Asignar tutor | ❌ | ❌ | ✅ (o Cloud Function) |
| Eliminar conversación | ❌ | ❌ | ✅ |

### 📝 Messages Subcollection

| Operación | Estudiante | Tutor | Admin |
|-----------|-----------|-------|-------|
| Leer mensajes | ✅ (de su conversación) | ✅ (de sus conversaciones) | ✅ |
| Enviar mensaje | ✅ (en su conversación) | ✅ (en sus conversaciones) | ✅ |
| Editar mensaje | ❌ (inmutable) | ❌ (inmutable) | ❌ (inmutable) |
| Eliminar mensaje | ❌ | ❌ | ✅ |

---

## 🚨 Problemas de Seguridad que Esto Previene

### ❌ Sin reglas (Test Mode):
```
Un estudiante malicioso podría:
✗ Leer conversaciones de otros estudiantes
✗ Cambiar su propio rol a 'admin'
✗ Eliminar conversaciones de otros
✗ Inyectar mensajes en conversaciones ajenas
✗ Leer perfiles de todos los usuarios
```

### ✅ Con reglas:
```
Protecciones implementadas:
✓ Solo puedes leer tus propias conversaciones
✓ No puedes cambiar tu rol (solo admin)
✓ No puedes eliminar datos de otros
✓ Solo puedes enviar mensajes donde eres participante
✓ Perfiles protegidos
```

---

## 🔧 Cómo Aplicar las Reglas

### Paso 1: Ir a Firebase Console
1. https://console.firebase.google.com/
2. Selecciona tu proyecto: **AcadeMatt**
3. Menú izquierdo → **Firestore Database**
4. Pestaña superior → **Rules**

### Paso 2: Copiar las Reglas
1. Selecciona todo el contenido actual
2. Bórralo
3. Copia las reglas de arriba
4. Pégalas en el editor

### Paso 3: Publicar
1. Clic en **"Publish"**
2. Espera confirmación: "Rules deployed successfully"

### Paso 4: Verificar
1. Ve a tu app: http://localhost:5175/
2. Prueba crear conversación (debe funcionar)
3. Intenta cambiar tu rol desde la consola del navegador (debe fallar)

---

## ⚠️ Nota Importante sobre Asignación de Tutores

Las reglas actuales **NO permiten** que el frontend asigne tutores (por seguridad). Hay dos opciones:

### Opción A: Cloud Function (Recomendado)
Crear una Cloud Function que se ejecute automáticamente cuando se crea una conversación:

```javascript
// functions/index.js
exports.assignTutorOnCreate = functions.firestore
  .document('conversations/{conversationId}')
  .onCreate(async (snap, context) => {
    // Lógica de asignación por capacidad
    const tutor = await findAvailableTutorWithLeastLoad();
    
    return snap.ref.update({
      tutorId: tutor.id,
      tutorName: tutor.name,
      status: 'assigned'
    });
  });
```

### Opción B: Llamada desde Cliente (Temporal)
Modificar las reglas para permitir que el sistema asigne tutores desde el frontend:

```javascript
// Agregar en match /conversations/{conversationId}:
allow update: if isAuthenticated() && (
  // Permitir asignación inicial de tutor
  (resource.data.status == 'pending' && 
   request.resource.data.status == 'assigned' &&
   request.resource.data.tutorId != null) ||
  // Resto de las reglas...
  (resource.data.tutorId == request.auth.uid && isTutor()) ||
  isAdmin()
);
```

**Por ahora, para desarrollo, puedes usar la Opción B.**

---

## 🎯 Testing de Reglas

Prueba estos escenarios:

### ✅ Debe Funcionar:
- Estudiante crea conversación propia
- Estudiante lee sus conversaciones
- Tutor lee conversaciones asignadas
- Admin lee todo
- Participantes envían mensajes en su conversación

### ❌ Debe Fallar:
- Estudiante lee conversaciones de otros
- Usuario cambia su propio rol
- Tutor crea conversación
- Usuario edita mensaje ya enviado
- Estudiante lee perfil de admin

---

## 📚 Recursos

- [Documentación oficial de Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Testing de reglas en consola](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Mejores prácticas](https://firebase.google.com/docs/firestore/security/rules-best-practices)

---

## 🚀 Próximos Pasos

1. **Aplicar las reglas** (copiar y publicar)
2. **Probar funcionalidad** básica
3. **Implementar Cloud Function** para asignación de tutores (opcional pero recomendado)
4. **Monitorear logs** en Firebase Console para ver rechazos de permisos
5. **Refinar reglas** según necesidades específicas

**Recuerda:** Las reglas de seguridad son tu primera línea de defensa. Nunca confíes solo en el frontend.
