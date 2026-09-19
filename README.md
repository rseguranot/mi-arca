# Mi Arca

Plataforma multi-iglesia para la gestión de escuelas bíblicas: grupos, estudiantes, currículo, sesiones, asistencia, finanzas y reportes.

## Ejecutar localmente

1. Copia `.env.example` como `.env.local` y configura las variables de Supabase.
2. Instala dependencias: `npm install`.
3. Inicia el proyecto: `npm run dev`.

El panel inicial usa datos de demostración hasta aplicar la migración y enlazar los flujos de autenticación y datos.

## Seguridad

El esquema está en `supabase/migrations/`. Cada registro operativo contiene `church_id`; las políticas RLS impiden que una persona acceda a información de otra iglesia. Las credenciales `service_role` jamás deben ir en el navegador.
