# 🧠 Algoritmo de Asignación por Capacidad (Capacity-Based Assignment)

## 📖 Descripción General

El sistema de **Asignación por Capacidad** es una evolución inteligente del algoritmo Round Robin tradicional. En lugar de asignar tutores de forma rotativa ciega, el sistema analiza en tiempo real la carga de trabajo de cada tutor y asigna las nuevas consultas al que tenga menor cantidad de conversaciones activas.

---

## 🎯 Objetivo

Garantizar una distribución equitativa de la carga de trabajo entre tutores, evitando que algunos se sobrecarguen mientras otros están libres.

---

## 🔍 Funcionamiento Paso a Paso

### 1. Estudiante Crea Consulta

```javascript
// En StartConsultation.jsx
const conversationId = await createConversation('Cálculo Diferencial');
```

**Se crea documento en Firestore:**
```javascript
conversations/{conversationId}
  - studentId: "uid_estudiante"
  - studentName: "Juan Pérez"
  - tutorId: null              // ⚠️ Vacío inicialmente
  - tutorName: null
  - status: "pending"          // ⚠️ Pendiente
  - subject: "Cálculo Diferencial"
  - createdAt: timestamp
```

---

### 2. Sistema Busca Tutores Disponibles

```javascript
// En AuthContext.jsx → assignTutorByCapacity()
const tutorsQuery = query(
  collection(db, 'users'),
  where('role', '==', 'tutor'),
  where('available', '==', true)  // ✅ Solo disponibles
);
```

**Resultado:**
```javascript
[
  { id: "tutor1_uid", displayName: "Profesor Carlos", available: true },
  { id: "tutor2_uid", displayName: "Profesora Ana", available: true }
]
```

**Si no hay tutores disponibles:**
```javascript
if (tutorsSnapshot.empty) {
  // Mensaje: "No hay tutores disponibles"
  return;
}
```

---

### 3. Contar Carga de Cada Tutor

Para cada tutor disponible, el sistema cuenta cuántas conversaciones activas tiene:

```javascript
for (const tutorDoc of tutorsSnapshot.docs) {
  const tutorId = tutorDoc.id;
  
  // Buscar conversaciones activas
  const assignedConversationsQuery = query(
    collection(db, 'conversations'),
    where('tutorId', '==', tutorId),
    where('status', '==', 'assigned')  // Solo activas
  );
  
  const assignedConversations = await getDocs(assignedConversationsQuery);
  
  tutorLoads.push({
    tutorId: tutorId,
    tutorName: tutorData.displayName,
    load: assignedConversations.size  // ⚡ Carga = cantidad de chats activos
  });
}
```

**Resultado:**
```javascript
tutorLoads = [
  { tutorId: "tutor1_uid", tutorName: "Profesor Carlos", load: 3 },
  { tutorId: "tutor2_uid", tutorName: "Profesora Ana", load: 1 }
]
```

---

### 4. Ordenar por Menor Carga

```javascript
tutorLoads.sort((a, b) => a.load - b.load);
```

**Resultado ordenado:**
```javascript
[
  { tutorId: "tutor2_uid", tutorName: "Profesora Ana", load: 1 },  // ✅ Primera
  { tutorId: "tutor1_uid", tutorName: "Profesor Carlos", load: 3 }
]
```

---

### 5. Asignar al Tutor con Menor Carga

```javascript
const selectedTutor = tutorLoads[0];  // ✅ Profesora Ana (load: 1)

// Actualizar conversación
await updateDoc(doc(db, 'conversations', conversationId), {
  tutorId: selectedTutor.tutorId,
  tutorName: selectedTutor.tutorName,
  status: 'assigned',           // ⚠️ Cambia a asignado
  assignedAt: new Date().toISOString()
});
```

**Conversation actualizada:**
```javascript
conversations/{conversationId}
  - studentId: "uid_estudiante"
  - tutorId: "tutor2_uid"      // ✅ Asignado
  - tutorName: "Profesora Ana"
  - status: "assigned"         // ✅ Activa
  - assignedAt: "2026-03-04..."
```

---

### 6. Notificar al Estudiante

```javascript
await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
  senderId: 'system',
  senderRole: 'system',
  text: '¡Excelente! Profesora Ana ha sido asignada como tu tutora.',
  timestamp: new Date().toISOString()
});
```

---

## 📊 Ejemplo de Asignación Secuencial

### Estado Inicial:
```
Profesor Carlos: 0 conversaciones
Profesora Ana: 0 conversaciones
```

### Consulta 1 (Juan):
```
Sistema busca → Ambos tienen 0
Sistema asigna → Profesor Carlos (primero en la lista)

Resultado:
  Profesor Carlos: 1 conversación
  Profesora Ana: 0 conversaciones
```

### Consulta 2 (María):
```
Sistema busca → Ana: 0, Carlos: 1
Sistema asigna → Profesora Ana (menor carga)

Resultado:
  Profesor Carlos: 1 conversación
  Profesora Ana: 1 conversación
```

### Consulta 3 (Pedro):
```
Sistema busca → Ambos tienen 1
Sistema asigna → Profesor Carlos (primero en la lista)

Resultado:
  Profesor Carlos: 2 conversaciones
  Profesora Ana: 1 conversación
```

### Consulta 4 (Sofía):
```
Sistema busca → Ana: 1, Carlos: 2
Sistema asigna → Profesora Ana (menor carga)

Resultado:
  Profesor Carlos: 2 conversaciones
  Profesora Ana: 2 conversaciones
```

---

## ⚖️ Ventajas vs Round Robin

### Round Robin Tradicional:
```
Consulta 1 → Tutor A
Consulta 2 → Tutor B
Consulta 3 → Tutor A
Consulta 4 → Tutor B
```

**Problema:** Si Tutor A termina sus consultas rápido pero Tutor B tarda más, Tutor A seguirá recibiendo consultas aunque tenga menos carga.

### Capacity-Based (Nuestro Sistema):
```
Consulta 1 → Tutor A (carga: 0)
Consulta 2 → Tutor B (carga: 0)

Tutor A termina 1 conversación (ahora tiene 0)
Tutor B aún tiene 1 conversación

Consulta 3 → Tutor A (carga: 0 < 1)
Consulta 4 → Tutor A (carga: 1 = 1)
```

**Ventaja:** ⚡ Balanceo dinámico en tiempo real basado en carga actual.

---

## 🔐 Filtros de Seguridad

### 1. Solo Tutores Disponibles
```javascript
where('available', '==', true)
```
- Si un tutor desactiva su disponibilidad, no recibe más asignaciones
- Útil para pausas, descansos, fin de turno

### 2. Solo Conversaciones Activas
```javascript
where('status', '==', 'assigned')
```
- No cuenta conversaciones pendientes o completadas
- Refleja la carga real de trabajo actual

### 3. Validación de Rol
```javascript
where('role', '==', 'tutor')
```
- Solo usuarios con rol "tutor" pueden ser asignados
- Admins y estudiantes quedan excluidos

---

## 🚀 Optimizaciones Futuras

### 1. Peso por Complejidad
```javascript
tutorLoads.push({
  tutorId: tutorId,
  load: assignedConversations.size,
  weightedLoad: calculateWeightedLoad(conversations)  // Nuevo
});
```

Asignar peso según complejidad del tema:
- Cálculo Diferencial: peso 3
- Álgebra Básica: peso 1

### 2. Prioridad por Experiencia
```javascript
tutorLoads.sort((a, b) => {
  if (a.load === b.load) {
    return b.experience - a.experience;  // Mayor experiencia primero
  }
  return a.load - b.load;
});
```

### 3. Factor de Velocidad de Respuesta
```javascript
const avgResponseTime = calculateAvgResponseTime(tutorId);
if (avgResponseTime < 5) {
  load *= 0.8;  // Descuento si responde rápido
}
```

### 4. Cache de Cargas
```javascript
// En lugar de contar cada vez, mantener contador en el usuario
users/{tutorId}
  - activeConversations: 3  // Se actualiza con triggers
```

---

## 📈 Métricas de Éxito

Para medir la efectividad del algoritmo:

### 1. Desviación Estándar de Carga
```javascript
σ = √(Σ(xi - μ)² / n)
```
- Menor desviación = Mejor distribución

### 2. Tiempo Promedio de Primera Respuesta
```javascript
avgFirstResponse = Σ(assignedAt - firstTutorMessage) / totalConversations
```

### 3. Tasa de Asignación Exitosa
```javascript
successRate = (conversationsAssigned / totalConversations) * 100
```

---

## 🎯 Conclusión

El sistema de **Asignación por Capacidad** garantiza:
- ✅ Distribución equitativa de trabajo
- ✅ Ningún tutor se sobrecarga
- ✅ Respuestas más rápidas (tutores menos ocupados)
- ✅ Escalabilidad (funciona con 2 o 200 tutores)
- ✅ Transparencia (toda la lógica es auditable)

**Resultado:** Mejor experiencia tanto para estudiantes (respuestas rápidas) como para tutores (carga balanceada).
