# AcadeMatt - Plataforma de Ayuda Académica

## 🎓 Descripción

AcadeMatt es una plataforma MVP de ayuda académica que conecta estudiantes con tutores expertos. Diseño moderno minimalista con React, Tailwind CSS y Firebase.

## ✨ Características

### 🔐 Sistema de Autenticación Completo
- Registro e inicio de sesión con email/password
- Autenticación con Google (OAuth)
- Sistema de roles (Estudiante/Tutor/Admin)
- Persistencia de sesión automática
- Protección de rutas

### Landing Page Hero (Minimalista)
- Diseño limpio y de prestigio con fondo blanco
- Encabezado elegante: "Tu éxito académico a un chat de distancia"
- Botón de "Iniciar Consulta" que requiere autenticación
- Tipografía ultra-light para imagen premium

### Dashboard de Usuario
- Panel lateral responsivo con menú hamburguesa en móvil
- Navegación:
  - 📱 Mis Consultas (activo)
  - 💳 Pagos
  - 👤 Perfil
- Información de usuario en la parte inferior

### Sistema de Chat Central
- Interfaz de chat en tiempo real (simulado)
- Mensajes del sistema, tutor y usuario
- Indicador de "escribiendo..." con animación
- Scroll automático a los mensajes más recientes
- Timestamps en formato 24h

### Tarjeta de Propuesta
- Diseño tipo tarjeta con información del servicio
- Detalles completos:
  - Nombre del servicio
  - Descripción detallada
  - Precio destacado ($25.00)
  - Tiempo de entrega (24 horas)
- Botón "Aceptar y Pagar" estilizado
- Badges de confianza (pago seguro, garantía, soporte)

### Modal de Pago
- Simulación de pasarela de pago (Stripe/PayPal)
- Selección de método de pago
- Formulario de tarjeta pre-llenado para demo
- Animación de procesamiento
- Confirmación de pago exitoso
- Indicadores de seguridad SSL

## 🎨 Diseño

### Paleta de Colores
- **Primary**: #1e40af (Azul académico)
- **Secundario**: Gradientes de azul
- **Fondo**: Blanco y gris suave (#f9fafb)
- **Acentos**: Verde para confirmaciones, gris para neutralidad

### Tipografía
- Fuente principal: Inter (desde Google Fonts)
- Fallback: Roboto, sans-serif
- Pesos: 300, 400, 500, 600, 700

### Componentes UI
- Bordes redondeados (rounded-xl, rounded-2xl)
- Sombras suaves (shadow-sm, shadow-lg, shadow-2xl)
- Estados hover con transforms y transiciones
- Loading states con spinners animados
- Animaciones smooth para modales y tarjetas

## 📱 Responsividad

- **Desktop**: Layout completo con sidebar visible
- **Tablet**: Sidebar colapsable
- **Mobile**: 
  - Menú hamburguesa
  - Sidebar con overlay
  - Chat optimizado para pantallas pequeñas
  - Botones táctiles de tamaño adecuado

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js (v16 o superior)
- npm o yarn

### Instalación
```bash
# Instalar dependencias
npm install
```

### Configuración de Firebase
**⚠️ IMPORTANTE:** Antes de ejecutar la app, configura Firebase:

1. Sigue la guía: **[CONFIGURACION_RAPIDA.md](CONFIGURACION_RAPIDA.md)** (5 minutos)
2. Actualiza `src/firebase/config.js` con tus credenciales
3. Habilita Authentication y Firestore en Firebase Console

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# La app estará en: http://localhost:5173/
```

### Build para Producción
```bash
npm run build
```

### Preview de Producción
```bash
npm run preview
```

## 📦 Tecnologías Utilizadas

- **React 18.2** - Librería UI
- **Vite 5.1** - Build tool y dev server
- **Tailwind CSS 3.4** - Framework CSS utility-first
- **Firebase 10.x** - Backend as a Service
  - Firebase Authentication (Email/Password + Google OAuth)
  - Cloud Firestore (Base de datos en tiempo real)
- **Lucide React** - Librería de iconos moderna
- **PostCSS** - Procesamiento CSS
- **Autoprefixer** - CSS vendor prefixes

## 🗂️ Estructura del Proyecto

```
AcadeMatt/
├── src/
│   ├── components/
│   │   ├── Hero.jsx           # Landing page hero section
│   │   ├── Sidebar.jsx        # Panel lateral de navegación
│   │   ├── Chat.jsx           # Sistema de chat principal
│   │   ├── ProposalCard.jsx   # Tarjeta de propuesta del tutor
│   │   └── PaymentModal.jsx   # Modal de pago
│   ├── App.jsx                # Componente raíz
│   ├── main.jsx               # Entry point
│   └── index.css              # Estilos globales y Tailwind
├── index.html                 # HTML base
├── package.json               # Dependencias
├── vite.config.js             # Configuración de Vite
├── tailwind.config.js         # Configuración de Tailwind
└── postcss.config.js          # Configuración de PostCSS
```

## 🎯 Funcionalidades del MVP

### ✅ Implementadas
1. **Hero Section** - Landing page con CTA
2. **Dashboard lateral** - Navegación simulada
3. **Chat interactivo** - Comunicación en tiempo real (simulado)
4. **Propuesta automática** - Se genera después del primer mensaje
5. **Modal de pago** - Simulación de checkout
6. **Animaciones** - Transiciones y estados de loading
7. **Responsividad completa** - Mobile-first approach

### 🔮 Futuras Mejoras
- Integración real con backend (Node.js/Express)
- Autenticación de usuarios (Firebase/Auth0)
- Pasarela de pago real (Stripe/PayPal API)
- Base de datos para consultas (MongoDB/PostgreSQL)
- Notificaciones en tiempo real (WebSockets)
- Sistema de calificación de tutores
- Historial de consultas
- Dashboard de administrador
- Múltiples tutores disponibles

## 🎨 Iconos Utilizados

- `MessageCircle` - Logo y chat
- `ChevronDown` - Indicador de scroll
- `MessageSquare` - Consultas
- `CreditCard` - Pagos
- `User` - Perfil
- `X` - Cerrar modales
- `Menu` - Menú móvil
- `CheckCircle` - Confirmaciones
- `DollarSign` - Precios
- `Send` - Enviar mensaje
- `Loader2` - Estados de carga
- `Lock` - Seguridad de pago

## 💡 Notas de Implementación

### Simulaciones
- Los mensajes del chat son simulados con `setTimeout`
- El procesamiento de pago tiene un delay de 2 segundos
- Los datos de usuario son estáticos por ahora
- La propuesta aparece automáticamente tras el primer mensaje

### Performance
- Vite ofrece Hot Module Replacement (HMR)
- Tailwind genera solo las clases CSS utilizadas
- Componentes optimizados con React 18
- Lazy loading preparado para futuras features

### Accesibilidad
- Colores con buen contraste
- Botones con estados focus visibles
- Textos alternativos preparados
- Navegación por teclado funcional

## 📄 Licencia

Proyecto educativo - MVP Demo

## 👨‍💻 Autor

Desarrollado por el equipo de AcadeMatt

---

**¡Tu éxito académico a un chat de distancia!** 🎓✨
