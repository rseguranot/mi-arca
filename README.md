# Mi Arca

Plataforma multi-iglesia para la gestión de escuelas bíblicas: grupos, estudiantes, currículo, sesiones, asistencia, finanzas y reportes.

## Ejecutar localmente

1. Copia `.env.example` como `.env.local` y configura las variables de Supabase.
2. Instala dependencias: `npm install`.
3. Inicia el proyecto: `npm run dev`.

## App móvil (Android e iOS)

La carpeta [`mobile`](mobile) contiene la aplicación React Native con Expo para
Expo Go. Comparte Supabase Auth, RLS y el modelo multi-Arca con la web, pero no
reutiliza componentes MUI del navegador.

1. En `mobile`, copia `.env.example` a `.env.local`. Si ya existe el `.env.local`
   de la web, el `app.config.js` también reconoce sus variables `VITE_SUPABASE_*`
   en desarrollo local.
2. Ejecuta `npm install` y luego `npm start`.
3. Con el teléfono en la misma red local, abre Expo Go y escanea el código QR.

Consulta [`docs/mobile-aws-roadmap.md`](docs/mobile-aws-roadmap.md) antes de
crear infraestructura AWS o cambiar de proveedor de base de datos.

El panel inicial usa datos de demostración hasta aplicar la migración y enlazar los flujos de autenticación y datos.

## Seguridad

El esquema está en `supabase/migrations/`. Cada registro operativo contiene `church_id`; las políticas RLS impiden que una persona acceda a información de otra iglesia. Las credenciales `service_role` jamás deben ir en el navegador.
