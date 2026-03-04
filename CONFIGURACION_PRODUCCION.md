# 🚀 Configuración Completa de Producción - AcadeMatt

## 📋 Checklist de Configuración

Sigue estos pasos EN ORDEN para una configuración robusta y escalable:

- [ ] **1. Configurar Reglas de Seguridad**
- [ ] **2. Crear Índices Compuestos**  
- [ ] **3. Probar el Sistema**
- [ ] **4. Verificar en Firestore**

---

## 🔐 PASO 1: Configurar Reglas de Seguridad (3 minutos)

### ¿Qué son?
Las reglas de seguridad controlan quién puede leer/escribir datos en Firestore.

### Aplicar Reglas:

1. **Ve a:** https://console.firebase.google.com/
2. **Selecciona:** Proyecto "AcadeMatt"
3. **Menú izquierdo:** Firestore Database
4. **Pestaña superior:** **Rules**
5. **Borra todo** el contenido actual
6. **Abre:** `firestore.rules` en tu proyecto
7. **Copia TODO el contenido** del archivo
8. **Pégalo** en el editor de Firebase
9. **Clic en "Publish"** (botón superior derecho)
10. **Espera confirmación:** "Rules deployed successfully" ✅

### ✅ Verificación:
- No debería mostrar errores al publicar
- Si hay errores de sintaxis, revísalos antes de continuar

---

## 🔢 PASO 2: Crear Índices Compuestos

### Método Automático (RECOMENDADO) ⚡

**Este es el método más fácil y sin errores:**

1. **Sal de la pantalla de crear índice** (no hagas nada ahí)
2. **Recarga tu app** en http://localhost:5175/
3. **Inicia sesión como tutor** (Profesor Carlos)
4. **Verás un error en la consola** (F12) con un link que dice:
   ```
   The query requires an index. You can create it here: https://console.firebase...
   ```
5. **Copia ese link completo**
6. **Ábrelo en una nueva pestaña**
7. Firebase ya llenó todos los campos → **Clic en "Create Index"**
8. **Espera 1-2 minutos** hasta que diga "Enabled" ✅
9. **Recarga la app del tutor**
10. **Si aparece OTRO error de índice**, repite los pasos 5-9
11. **Repite** hasta que no haya más errores de índices

### Método Manual (Alternativo)

Si prefieres crearlos todos de una vez, consulta [CREAR_INDICES.md](CREAR_INDICES.md) para los 4 índices exactos.

---

## 🧪 PASO 3: Probar el Sistema Completo

### 3.1 Preparar Usuarios de Prueba

**Necesitas 3 usuarios:**

#### A) Admin (Tú)
- ✅ Ya configurado: matias.veragenes@gmail.com
- ✅ Rol: admin

#### B) Tutor (Ventana Incógnito 1)
1. Ve a http://localhost:5175/
2. Regístrate como:
   - Nombre: "Profesor Carlos"
   - Email: `tutor1@academatt.com`
   - Password: `123456`
3. **Vuelve a tu cuenta admin** → Panel Admin
4. **Cambia su rol a "Tutor"**
5. **En la ventana incógnito:** Logout y login de nuevo

#### C) Estudiante (Ventana Incógnito 2)
1. Ve a http://localhost:5175/
2. Regístrate como:
   - Nombre: "Juan Estudiante"  
   - Email: `estudiante1@academatt.com`
   - Password: `123456`
3. **Déjalo como "Estudiante"** (no cambiar rol)

---

### 3.2 Activar Disponibilidad del Tutor

**En la ventana del Profesor Carlos:**
1. Verás el "Dashboard de Tutores"
2. En la parte superior hay un card: **"Disponibilidad"**
3. **Activa el toggle** (debe ponerse verde ✅)
4. Debe decir: "Recibiendo consultas"

---

### 3.3 Crear Consulta como Estudiante

**En la ventana de Juan Estudiante:**
1. Verás el formulario "Iniciar Nueva Consulta"
2. **Selecciona o escribe:** "Cálculo Diferencial"
3. **Clic en:** "Iniciar Consulta"
4. **Esperarás unos segundos** (el sistema está asignando tutor)
5. **Deberías ver el chat** con mensajes del sistema:
   - "Tu consulta ha sido recibida..."
   - "¡Excelente! Profesor Carlos ha sido asignado..."

---

### 3.4 Verificar Asignación en el Tutor

**En la ventana del Profesor Carlos:**
1. **Clic en "Actualizar"** en el dashboard
2. **Deberías ver una card** con:
   - Nombre: "Juan Estudiante"
   - Materia: "Cálculo Diferencial"
   - Badge verde: "Activa"
3. **Clic en la card**
4. **Se abre el chat** con los mensajes del sistema

---

### 3.5 Probar Chat en Tiempo Real ⚡

**Pon las dos ventanas lado a lado:**
- Izquierda: Juan (estudiante)
- Derecha: Profesor Carlos (tutor)

**Juan escribe:** "Hola profesor, necesito ayuda con derivadas"
- **Debe aparecer INSTANTÁNEAMENTE en la ventana del tutor** ✨

**Profesor Carlos responde:** "¡Claro Juan! ¿Qué tipo de derivadas?"
- **Debe aparecer INSTANTÁNEAMENTE en la ventana del estudiante** ✨

**Continúa conversando** para verificar que todos los mensajes se sincronizan en tiempo real.

---

## ✅ PASO 4: Verificar en Firestore Console

**Ve a: Firebase Console → Firestore Database → Data**

Deberías ver:

### Colección `users`:
```
users/
  {uid_tutor}/
    - displayName: "Profesor Carlos"
    - role: "tutor"
    - available: true ✅
    - lastActive: timestamp
```

### Colección `conversations`:
```
conversations/
  {conversationId}/
    - studentId: "uid_juan"
    - studentName: "Juan Estudiante"
    - tutorId: "uid_carlos"
    - tutorName: "Profesor Carlos"
    - status: "assigned"
    - subject: "Cálculo Diferencial"
    - createdAt: timestamp
    - assignedAt: timestamp
    - lastMessageAt: timestamp
    
    messages/ (subcollection)
      {msg1}/
        - senderId: "system"
        - text: "Tu consulta ha sido recibida..."
        
      {msg2}/
        - senderId: "system"  
        - text: "¡Excelente! Profesor Carlos..."
        
      {msg3}/
        - senderId: "uid_juan"
        - senderName: "Juan Estudiante"
        - text: "Hola profesor..."
        
      {msg4}/
        - senderId: "uid_carlos"
        - senderName: "Profesor Carlos"
        - text: "¡Claro Juan!..."
```

---

## 🎯 Prueba de Asignación por Capacidad

### Escenario: Dos Tutores, Balanceo de Carga

1. **Crea un segundo tutor:**
   - Nombre: "Profesora Ana"
   - Email: `tutor2@academatt.com`
   - Cambiar rol a "Tutor" desde Panel Admin
   - **Activar disponibilidad**

2. **Situación actual:**
   - Profesor Carlos: 1 conversación activa
   - Profesora Ana: 0 conversaciones

3. **Crea segundo estudiante** (`estudiante2@academatt.com`)
   - Crea consulta: "Álgebra Lineal"
   - **Sistema debe asignar a Profesora Ana** (tiene menos carga)

4. **Estado resultante:**
   - Profesor Carlos: 1 conversación
   - Profesora Ana: 1 conversación
   - ✅ **Carga balanceada**

5. **Crea tercer estudiante** (`estudiante3@academatt.com`)
   - Crea consulta: "Física I"
   - **Sistema debe asignar a Profesor Carlos** (ambos tienen 1, se elige el primero)

6. **Estado resultante:**
   - Profesor Carlos: 2 conversaciones
   - Profesora Ana: 1 conversación

7. **Crea cuarto estudiante** (`estudiante4@academatt.com`)
   - Crea consulta: "Química"
   - **Sistema debe asignar a Profesora Ana** (tiene menos carga: 1 vs 2)

**Resultado:** Sistema distribuye inteligentemente según capacidad real ⚡

---

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"
**Causa:** Reglas de seguridad no aplicadas
**Solución:** Revisa Paso 1, asegúrate de publicar las reglas

### Error: "The query requires an index"
**Causa:** Falta crear índice compuesto
**Solución:** 
- Copia el link del error
- Ábrelo → Create Index
- Espera que se habilite
- Recarga la app

### Error: "Permission denied" al asignar tutor
**Causa:** Reglas no permiten actualización de conversación
**Solución:** Verifica que las reglas incluyan la sección de asignación de tutor (línea 73-76 en firestore.rules)

### No aparece la conversación en el dashboard del tutor
**Causa:** 
- Tutor no tiene `available: true`
- No se actualizó el dashboard
**Solución:**
- Activa el toggle de disponibilidad
- Clic en "Actualizar" en el dashboard

### Mensajes no aparecen en tiempo real
**Causa:** `onSnapshot` no está funcionando
**Solución:**
- Verifica que ambos usuarios estén en la misma conversación
- Revisa consola (F12) para errores específicos
- Asegúrate que ambas ventanas estén en la misma URL de conversación

---

## 📊 Índices que se Crearán

Durante las pruebas, se crearán automáticamente estos índices:

**1. Conversaciones de Tutores:**
```
Collection: conversations
Fields: tutorId (Asc), status (Asc), lastMessageAt (Desc)
```

**2. Conversaciones de Estudiantes:**
```
Collection: conversations
Fields: studentId (Asc), lastMessageAt (Desc)
```

**3. Buscar Tutores Disponibles:**
```
Collection: users
Fields: role (Asc), available (Asc)
```

**4. Contar Carga de Tutores:**
```
Collection: conversations
Fields: tutorId (Asc), status (Asc)
```

---

## ✅ Checklist Final

Después de completar todo:

- [ ] Reglas de seguridad publicadas
- [ ] Al menos 2 índices creados y habilitados
- [ ] Tutor puede ver dashboard
- [ ] Tutor puede activar/desactivar disponibilidad
- [ ] Estudiante puede crear consulta
- [ ] Consulta se asigna automáticamente
- [ ] Chat funciona en tiempo real
- [ ] Mensajes se sincronizan instantáneamente
- [ ] Asignación por capacidad funciona (probado con 2 tutores)

---

## 🎉 ¡Configuración Completa!

Con esto tendrás:
- ✅ **Seguridad:** Reglas que protegen tus datos
- ✅ **Performance:** Índices para queries rápidas
- ✅ **Escalabilidad:** Funciona con 2 o 2000 usuarios
- ✅ **Tiempo Real:** Chat instantáneo con Firestore
- ✅ **Inteligencia:** Asignación automática por capacidad

**Tu plataforma está lista para producción** 🚀

---

## 📚 Archivos de Referencia

- [CREAR_INDICES.md](CREAR_INDICES.md) - Detalles de cada índice
- [firestore.rules](firestore.rules) - Reglas de seguridad (copiar aquí)
- [REGLAS_SEGURIDAD_FIRESTORE.md](REGLAS_SEGURIDAD_FIRESTORE.md) - Documentación detallada
- [GUIA_PRUEBA_CHAT.md](GUIA_PRUEBA_CHAT.md) - Guía de pruebas
- [ALGORITMO_CAPACIDAD.md](ALGORITMO_CAPACIDAD.md) - Explicación técnica del algoritmo

---

## ⏱️ Tiempo Estimado Total

- Configurar reglas: **2 minutos**
- Crear índices (automático): **5-10 minutos** (mientras pruebas)
- Probar sistema: **10 minutos**
- **TOTAL: ~20 minutos**

---

## 🎯 Empezar Ahora

**Paso siguiente:** Configura las reglas de seguridad (Paso 1 arriba) 👆
