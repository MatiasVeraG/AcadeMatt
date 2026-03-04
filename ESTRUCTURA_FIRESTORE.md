# 📊 Estructura de Firestore - AcadeMatt

## Colecciones Principales

### 1. `users` (ya existe)
```javascript
users/{userId}
  - displayName: string
  - email: string
  - role: "student" | "tutor" | "admin"
  - createdAt: timestamp
  - photoURL: string | null
  - available: boolean (NUEVO - para tutores)
  - lastActive: timestamp (NUEVO)
```

### 2. `conversations` (NUEVA)
```javascript
conversations/{conversationId}
  - studentId: string (UID del estudiante)
  - studentName: string
  - tutorId: string | null (vacío hasta asignación)
  - tutorName: string | null
  - status: "pending" | "assigned" | "completed" | "cancelled"
  - subject: string (ej: "Cálculo Diferencial")
  - createdAt: timestamp
  - assignedAt: timestamp | null
  - completedAt: timestamp | null
  - lastMessageAt: timestamp
  - unreadCount: number
```

### 3. `conversations/{conversationId}/messages` (SUBCOLLECTION)
```javascript
messages/{messageId}
  - senderId: string (UID)
  - senderName: string
  - senderRole: "student" | "tutor" | "system"
  - text: string
  - timestamp: timestamp
  - read: boolean
```

## 🎯 Lógica de Asignación por Capacidad

### Proceso:
1. **Estudiante inicia consulta** → Se crea `conversation` con `status: "pending"`, `tutorId: null`
2. **Función de asignación ejecuta:**
   - Busca tutores con `role: "tutor"` Y `available: true`
   - Para cada tutor, cuenta conversations con `status: "assigned"` Y `tutorId: tutorId`
   - Selecciona el tutor con menor conteo
   - Actualiza la conversation: `tutorId`, `status: "assigned"`, `assignedAt`
3. **Notificación al tutor** (push o email)
4. **Chat en tiempo real** usando `onSnapshot` en messages

## 🔄 Estados de Conversación

- **pending**: Esperando asignación de tutor
- **assigned**: Tutor asignado, conversación activa
- **completed**: Servicio finalizado (pago confirmado)
- **cancelled**: Cancelada por estudiante o admin

## 👥 Disponibilidad de Tutores

- Campo `available` en `users` (boolean)
- Solo tutores con `available: true` reciben asignaciones
- Toggle en el panel del tutor para cambiar disponibilidad
- Al hacer logout, se marca automáticamente como `available: false`

## 📊 Dashboard de Tutores

- Ver todas las conversations con `tutorId: {currentUserId}` Y `status: "assigned"`
- Lista de chats activos
- Click para abrir chat individual
- Botón para marcar como completado
