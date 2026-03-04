# 🔧 Guía: Crear Índices Compuestos en Firestore

## ⚡ ¿Por qué necesitas índices?

Firestore requiere índices compuestos cuando haces queries con:
- **Múltiples `where()`** + **`orderBy()`**
- Ejemplo: `where('tutorId', '==', uid).where('status', '==', 'assigned').orderBy('lastMessageAt')`

Sin índices → Error: "The query requires an index"
Con índices → Query súper rápida y escalable ⚡

---

## 📋 Índices Necesarios para AcadeMatt

Necesitas crear **4 índices compuestos**:

---

## 🎯 Índice 1: Conversaciones de Tutores

**Query que lo necesita:**
```javascript
where('tutorId', '==', uid) + where('status', '==', 'assigned') + orderBy('lastMessageAt', 'desc')
```

### Paso a Paso:

1. **Ve a:** Firebase Console → Firestore Database → **Indexes** (pestaña superior)
2. **Clic en:** "Create Index" (o "Add Index" si ya tienes algunos)
3. **Completa el formulario:**

```
Collection ID: conversations
Query scope: Collection

Fields to index:
  Campo 1:
    Field path: tutorId
    Field mode: Ascending
  
  Campo 2:
    Field path: status
    Field mode: Ascending
  
  Campo 3:
    Field path: lastMessageAt
    Field mode: Descending
```

4. **Clic en "Create"**
5. **Espera** que diga "Building..." → "Enabled" (1-2 minutos)

---

## 🎯 Índice 2: Conversaciones de Estudiantes

**Query que lo necesita:**
```javascript
where('studentId', '==', uid) + orderBy('lastMessageAt', 'desc')
```

### Paso a Paso:

1. **Clic en:** "Create Index" nuevamente
2. **Completa:**

```
Collection ID: conversations
Query scope: Collection

Fields to index:
  Campo 1:
    Field path: studentId
    Field mode: Ascending
  
  Campo 2:
    Field path: lastMessageAt
    Field mode: Descending
```

3. **Clic en "Create"**
4. **Espera** confirmación

---

## 🎯 Índice 3: Tutores Disponibles

**Query que lo necesita:**
```javascript
where('role', '==', 'tutor') + where('available', '==', true)
```

### Paso a Paso:

1. **Clic en:** "Create Index"
2. **Completa:**

```
Collection ID: users
Query scope: Collection

Fields to index:
  Campo 1:
    Field path: role
    Field mode: Ascending
  
  Campo 2:
    Field path: available
    Field mode: Ascending
```

3. **Clic en "Create"**
4. **Espera** confirmación

---

## 🎯 Índice 4: Carga de Tutores (para asignación)

**Query que lo necesita:**
```javascript
where('tutorId', '==', uid) + where('status', '==', 'assigned')
```

### Paso a Paso:

1. **Clic en:** "Create Index"
2. **Completa:**

```
Collection ID: conversations
Query scope: Collection

Fields to index:
  Campo 1:
    Field path: tutorId
    Field mode: Ascending
  
  Campo 2:
    Field path: status
    Field mode: Ascending
```

3. **Clic en "Create"**
4. **Espera** confirmación

---

## ⚡ Atajo Rápido (Recomendado)

En lugar de crearlos manualmente, **usa el link que Firebase te dio en el error:**

```
https://console.firebase.google.com/v1/r/project/academatt/firestore/indexes?create_composite=Ck9wcm9...
```

1. **Copia ese link del error** en la consola
2. **Ábrelo en tu navegador**
3. **Firebase ya llenó todos los campos automáticamente** ✨
4. Solo haz **clic en "Create Index"**
5. Repite cuando aparezca otro error de índice

**Ventaja:** Firebase detecta automáticamente qué índice falta y te lleva directo a crearlo. Es más rápido y sin errores.

---

## 📊 Verificar Índices Creados

**En Firebase Console → Firestore → Indexes:**

Deberías ver algo como:

```
Collection: conversations
Fields: tutorId Asc, status Asc, lastMessageAt Desc
Status: ✅ Enabled

Collection: conversations  
Fields: studentId Asc, lastMessageAt Desc
Status: ✅ Enabled

Collection: users
Fields: role Asc, available Asc
Status: ✅ Enabled

Collection: conversations
Fields: tutorId Asc, status Asc
Status: ✅ Enabled
```

---

## 🔄 Proceso Recomendado

### Método 1: Automático (Más Rápido) ⚡
1. **NO crear índices ahora**
2. Intenta usar la app normalmente
3. Cuando aparezca error de índice, **copia el link del error**
4. Abre el link → Clic "Create Index"
5. Espera 1-2 minutos
6. Recarga la app
7. Repite si aparece otro error

**Ventaja:** Solo creas los índices que realmente necesitas.

### Método 2: Manual (Más Control)
1. Crea los 4 índices listados arriba
2. Espera que todos digan "Enabled"
3. ¡Listo!

**Ventaja:** Creas todo de una vez.

---

## ⏱️ Tiempo de Creación de Índices

- **Base de datos vacía:** 1-2 minutos por índice
- **Base de datos con datos:** Puede tardar más (depende de cantidad)
- **Estado "Building":** Es normal, solo espera
- **Los índices se crean en paralelo:** Puedes crear varios a la vez

---

## 🚀 Siguiente Paso

**Elige tu método:**
- **Automático:** Sal de la pantalla de crear índice, usa la app, y copia el link cuando aparezca error
- **Manual:** Crea los 4 índices ahora según las instrucciones arriba

¿Cuál prefieres?

---

## 🔐 Después de Crear Índices

Una vez listos, también debes:
1. **Configurar reglas de seguridad** (ver REGLAS_SEGURIDAD_FIRESTORE.md)
2. **Probar el sistema completo**

Pero primero, creemos los índices.
