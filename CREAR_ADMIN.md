# 👑 Cómo Crear tu Primer Usuario Administrador

## 🎯 Objetivo
Convertir tu usuario en administrador para poder gestionar roles de otros usuarios.

## 📋 Pasos:

### 1. Regístrate en la App
1. Abre http://localhost:5173/
2. Clic en "Iniciar Consulta"
3. Regístrate con tu email y contraseña
4. Por defecto, serás "Estudiante" (student)

### 2. Ve a Firebase Console
1. Abre: https://console.firebase.google.com/
2. Selecciona tu proyecto: **AcadeMatt**
3. En el menú izquierdo, clic en **Firestore Database**

### 3. Encuentra tu Usuario en Firestore
1. Verás una colección llamada **`users`**
2. Clic en la colección `users`
3. Verás tu documento de usuario (identificado por tu UID)
4. Clic en tu documento

### 4. Cambia el Rol a Admin
1. Encontrarás un campo llamado **`role`** con valor **`student`**
2. Haz clic en el valor `student`
3. Cámbialo a: **`admin`**
4. Presiona Enter o clic fuera para guardar

### 5. Recarga la App

```bash
# En tu navegador:
1. Ve a http://localhost:5173/
2. Cierra sesión (botón en el sidebar)
3. Inicia sesión nuevamente
```

### 6. ¡Verifica que Eres Admin!
- En el sidebar, tu badge debería decir "Admin" en color morado
- Verás un botón nuevo: **"Panel Admin"** (morado con ícono de escudo)
- Clic en "Panel Admin" para gestionar usuarios

## 🎨 Cómo Usar el Panel de Administración

### Ver Usuarios
- Lista todos los usuarios registrados
- Muestra: Nombre, Email, Fecha de registro, Rol actual

### Cambiar Roles
1. Encuentra al usuario que quieres modificar
2. Usa el dropdown de rol (Select)
3. Selecciona el nuevo rol:
   - 🎓 **Estudiante** - Usuario normal
   - 👨‍🏫 **Tutor** - Puede recibir consultas y crear propuestas
   - 👑 **Admin** - Control total (tú)
4. El cambio es instantáneo

### Actualizar Lista
- Botón "Actualizar" arriba a la derecha
- Útil si hay nuevos registros

## 🔐 Permisos por Rol

### 🎓 Estudiante (Student)
- Ver landing page
- Crear consultas
- Chat con tutores
- Realizar pagos
- Ver su perfil

### 👨‍🏫 Tutor
- Todo lo de Estudiante +
- Recibir consultas
- Crear propuestas de servicio
- Gestionar múltiples chats

### 👑 Administrador (Admin)
- Todo lo anterior +
- Acceder al Panel de Administración
- Ver todos los usuarios
- Cambiar roles de cualquier usuario (excepto el propio)
- Control total del sistema

## ⚠️ Notas Importantes

1. **No puedes cambiar tu propio rol** desde el panel (seguridad)
2. **Solo los admins** pueden acceder al panel de administración
3. Los cambios de rol son **inmediatos** y **permanentes**
4. Si cambias a alguien a admin, **tendrá el mismo poder que tú**

## 🔄 Flujo Recomendado para Contratar Tutores

### Cuando Contratas a un Tutor:
1. El tutor se registra normalmente (será "Estudiante")
2. Te avisa que se registró
3. Tú como admin:
   - Abres el Panel Admin
   - Buscas su email en la lista
   - Cambias su rol a "Tutor"
4. El tutor cierra sesión y vuelve a iniciar
5. ¡Ahora tiene acceso como Tutor!

## 🎯 Próximos Pasos

Con el panel admin listo, puedes:
- ✅ Gestionar tu equipo de tutores
- ✅ Promover usuarios responsables a admins
- ✅ Degradar roles si es necesario
- ✅ Ver estadísticas de usuarios

---

**¿Necesitas ayuda?** Revisa la consola del navegador (F12) para ver errores específicos.
