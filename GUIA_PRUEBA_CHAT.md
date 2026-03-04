# 🚀 Guía: Cómo Probar el Chat en Tiempo Real con Asignación por Capacidad

## ✅ Sistema Implementado

Tu plataforma ahora tiene:
- ✅ Chat en tiempo real con Firestore
- ✅ Asignación automática de tutores por capacidad (Capacity-Based)
- ✅ Sistema de disponibilidad para tutores
- ✅ Dashboard para tutores con lista de consultas
- ✅ Interfaz para estudiantes con formulario de nueva consulta
- ✅ Roles diferenciados (Estudiante, Tutor, Admin)

---

## 🎯 Cómo Probar (3 Usuarios)

### 📋 Paso 1: Crear 3 Usuarios

#### 1.1 Usuario Admin (Tú)
Ya lo tienes configurado:
- ✅ Email: matias.veragenes@gmail.com
- ✅ Rol: Admin

#### 1.2 Crear Tutor 1
1. Abre ventana **incógnito** en tu navegador
2. Ve a http://localhost:5175/
3. Clic en "Iniciar Consulta"
4. **Regístrate:**
   - Nombre: "Profesor Carlos"
   - Email: `tutor1@academatt.com`
   - Contraseña: `123456`
5. Vuelve a tu cuenta admin → Panel Admin
6. Busca "Profesor Carlos" en la lista
7. Cambia su rol de "Estudiante" a **"Tutor"**
8. En la ventana incógnito: Cierra sesión y vuelve a entrar

#### 1.3 Crear Tutor 2
Repite el proceso:
- Nombre: "Profesora Ana"
- Email: `tutor2@academatt.com`
- Contraseña: `123456`
- Cambiar rol a **"Tutor"** desde Panel Admin

#### 1.4 Crear Estudiante
Otra ventana incógnito:
- Nombre: "Juan Estudiante"
- Email: `estudiante1@academatt.com`
- Contraseña: `123456`
- Este se queda como **"Estudiante"** (no cambiar rol)

---

## 🧪 Paso 2: Probar Asignación por Capacidad

### Escenario 1: Un Tutor Disponible

**Tutor 1 (Profesor Carlos):**
1. Inicia sesión como `tutor1@academatt.com`
2. Verás el "Dashboard de Tutores"
3. **Activa tu disponibilidad**: Toggle verde ON ✅
4. Deberías ver: "Recibiendo consultas"

**Estudiante (Juan):**
1. Inicia sesión como `estudiante1@academatt.com`
2. Verás el formulario "Iniciar Nueva Consulta"
3. Selecciona o escribe: "Cálculo Diferencial"
4. Clic en "Iniciar Consulta"
5. **Verás mensajes del sistema:**
   - "Tu consulta ha sido recibida..."
   - "¡Excelente! Profesor Carlos ha sido asignado..."
6. Ahora puedes chatear en tiempo real

**Tutor 1 (Profesor Carlos):**
1. Actualiza tu dashboard
2. Verás la conversación con "Juan Estudiante"
3. Clic en la conversación
4. **Podrás responder en tiempo real** ✨

---

### Escenario 2: Dos Tutores con Diferentes Cargas

**Preparación:**
1. **Tutor 1** activo con 1 conversación (la que ya creamos)
2. **Tutor 2** (Profesora Ana) activa su disponibilidad

**Crear segunda consulta:**
1. En otra ventana incógnito, registra otro estudiante:
   - Nombre: "María Estudiante"
   - Email: `estudiante2@academatt.com`
2. María crea consulta: "Álgebra Lineal"
3. **Sistema debe asignar a Tutor 2** (Profesora Ana) porque tiene menos carga

**Crear tercera consulta:**
1. Registra `estudiante3@academatt.com`
2. Crea consulta: "Física I"
3. **Sistema debe asignar a Tutor 2** nuevamente (ahora ambos tienen 1)

**Crear cuarta consulta:**
1. Registra `estudiante4@academatt.com`
2. Crea consulta: "Química"
3. **Sistema debe asignar a Tutor 1** (ahora tienen 1 vs 2)

---

## 🔄 Paso 3: Probar Sistema de Disponibilidad

### Tutor se marca como NO disponible

**Tutor 1:**
1. En tu dashboard, **desactiva el toggle** (gris)
2. Deberías ver: "No disponible"

**Nuevo estudiante:**
1. Crea una nueva consulta
2. **Sistema solo asignará a Tutor 2** (el único disponible)

**Sin tutores disponibles:**
1. **Tutor 2** también desactiva su disponibilidad
2. Nuevo estudiante crea consulta
3. **Mensaje del sistema:** "Lo sentimos, no hay tutores disponibles..."

---

## 💬 Paso 4: Probar Chat en Tiempo Real

### Abre dos ventanas lado a lado:
- **Izquierda:** Estudiante
- **Derecha:** Tutor

1. **Estudiante** escribe: "Hola, necesito ayuda con derivadas"
2. **El mensaje aparece INSTANTÁNEAMENTE en la ventana del tutor** ✨
3. **Tutor** responde: "Claro, ¿qué tema específico?"
4. **El mensaje aparece INSTANTÁNEAMENTE en la ventana del estudiante** ✨
5. Continúa conversando en tiempo real

---

## 📊 Paso 5: Vista de Admin

Como admin, puedes:
1. Ver **todas las conversaciones** (de todos los estudiantes y tutores)
2. Cambiar roles en tiempo real
3. Gestionar disponibilidad de tutores

---

## 🔧 Estructura de Datos en Firestore

Después de probar, revisa en **Firebase Console → Firestore Database**:

### Colección `users`:
```
users/
  {uid}/
    - displayName: "Profesor Carlos"
    - role: "tutor"
    - available: true ✅
    - lastActive: "2026-03-04..."
```

### Colección `conversations`:
```
conversations/
  {conversationId}/
    - studentId: "uid_estudiante"
    - tutorId: "uid_tutor_asignado"
    - status: "assigned"
    - subject: "Cálculo Diferencial"
    - createdAt: timestamp
    - assignedAt: timestamp
    
    messages/
      {messageId}/
        - senderId: "uid"
        - senderName: "Juan Estudiante"
        - senderRole: "student"
        - text: "Hola, necesito ayuda..."
        - timestamp: timestamp
```

---

## 🎨 Flujo Visual

### Estudiante:
1. **Hero** → Clic "Iniciar Consulta"
2. **Login/Register**
3. **StartConsultation** → Formulario con temas
4. **Chat** → Conversación en tiempo real

### Tutor:
1. **Hero** → Clic "Iniciar Consulta"
2. **Login/Register**
3. **TutorDashboard** → Lista de consultas asignadas + Toggle disponibilidad
4. **Chat** → Responder consultas

### Admin:
- Todo lo anterior **+** Panel Admin para gestionar roles

---

## ⚡ Funcionalidades Clave

### Asignación Inteligente:
- ✅ Solo tutores con `available: true` reciben consultas
- ✅ Se asigna al tutor con **menor cantidad** de conversaciones activas
- ✅ Balanceo automático de carga
- ✅ Mensaje si no hay tutores disponibles

### Chat en Tiempo Real:
- ✅ Mensajes del sistema (gris)
- ✅ Mensajes del tutor (blanco con borde)
- ✅ Mensajes del estudiante (azul degradado)
- ✅ Actualización instantánea con `onSnapshot`
- ✅ Scroll automático al último mensaje

### Disponibilidad:
- ✅ Toggle visual para tutores
- ✅ Automáticamente `false` al hacer logout
- ✅ Solo tutores disponibles reciben asignaciones

---

## 🐛 Solución de Problemas

### "No aparece la conversación en el tutor"
- Verifica que el tutor tenga `available: true`
- Actualiza el dashboard con el botón "Actualizar Lista"
- Revisa en Firestore que exista la conversación con `tutorId` asignado

### "Error al crear conversación"
- Verifica reglas de Firestore (test mode debe estar activo)
- Revisa la consola del navegador (F12) para errores

### "Los mensajes no se ven en tiempo real"
- Verifica que ambos usuarios estén en la misma conversación
- Revisa que Firestore esté en "test mode"
- Comprueba la consola para errores de permisos

---

## 🎉 ¡Sistema Completamente Funcional!

Ahora tienes:
- 🔥 Chat en tiempo real
- 🤖 Asignación inteligente por capacidad
- 👥 Sistema de roles completo
- ⚡ Disponibilidad dinámica
- 📊 Dashboard para tutores
- 🎨 Interfaz limpia y profesional

**¿Siguiente paso?** Podrías agregar:
- Notificaciones push cuando llega un mensaje
- Sistema de calificaciones post-consulta
- Historial de conversaciones completadas
- Estadísticas de uso para admins
- Integración de pagos real con Stripe
