# Mi Arca: ruta móvil y de infraestructura

## Decisión actual

- **Web:** React + Vite + MUI en la raíz del repositorio.
- **Móvil:** React Native + Expo SDK 57 en [`mobile`](../mobile), comprobable con
  Expo Go en Android e iOS.
- **Pruebas:** Supabase Auth, Postgres, Storage y políticas RLS existentes.
- **Límite de seguridad:** cada cliente usa únicamente URL y clave publicable;
  `service_role`, contraseñas de Postgres y credenciales AWS nunca se incluyen
  en web, Expo Go, commits ni EAS Update.

El cliente móvil persiste la sesión con `expo-sqlite/localStorage`, usa el
modelo `memberships` existente para el selector multi-Arca y llama los RPC
`create_arca` y `accept_arca_invitation`. Esto permite que una misma persona
use web, Android e iOS sin duplicar identidades ni reglas de acceso.

## Pruebas con Expo Go

1. Instalar **Expo Go** desde Play Store o App Store.
2. En `mobile`, crear `.env.local` desde `.env.example` con las variables
   publicables de Supabase.
3. Ejecutar `npm start` y elegir conexión LAN. Teléfono y PC deben usar la misma
   red Wi-Fi. Para iOS, Expo Go y la CLI deben iniciar sesión con la misma cuenta
   Expo cuando esa versión de Expo Go lo requiera.
4. Escanear el QR. Verificar registro, inicio de sesión, selección de foto,
   crear Arca, unirse con invitación, reiniciar la app y cerrar sesión.

No se deben usar URLs `127.0.0.1` para Supabase desde un teléfono físico: éste
no puede alcanzar el loopback del PC. Para las pruebas móviles actuales se usa
el proyecto Supabase alojado; un Supabase local requerirá la IP LAN del PC y
una configuración de red explícita.

## Evolución de backend

### Fase 1 — desarrollo y validación

1. Mantener Supabase Free para Auth, Postgres, Storage y pruebas internas.
2. Conservar el esquema, migraciones y RLS como fuente de verdad de permisos.
3. Ejecutar pruebas de usuarios reales con datos no sensibles y respaldos de la
   base antes de cambios de esquema.

### Fase 2 — AWS sin cambiar las apps de golpe

1. Definir un contrato HTTP versionado (`/v1`) para Arcas, miembros, estudiantes,
   asistencia, currículo, finanzas y reportes.
2. Implementar primero ese contrato con API Gateway + Lambda, manteniendo
   Supabase como origen temporal de datos o mediante una capa de adaptación.
3. Servir la web con S3 + CloudFront; distribuir actualizaciones móviles con
   Expo/EAS mientras siga en pruebas.
4. Configurar Cognito (User Pool) como proveedor futuro de identidad. La
   transición requiere mapeo explícito de usuarios y pruebas de JWT/RBAC; no se
   debe migrar contraseñas desde Supabase ni reemplazar Auth sin un plan de
   recuperación de sesiones.

### Fase 3 — PostgreSQL administrado de bajo costo

1. Para una primera evaluación en AWS, comparar RDS PostgreSQL Single-AZ y
   Aurora Serverless v2 con los patrones reales de conexiones, horas activas,
   almacenamiento y respaldos. La opción "más barata" depende de esos datos;
   no se selecciona sólo por precio mensual anunciado.
2. Exportar esquema y datos desde Supabase Postgres, restaurar en un entorno de
   prueba RDS/Aurora y ejecutar conciliación de conteos, claves, roles, RLS y
   reportes antes de redirigir tráfico.
3. Mover Storage a S3 con enlaces firmados y conservar auditoría de acceso.

### Fase 4 — producción

1. Separar cuentas/entornos dev, staging y producción.
2. Automatizar infraestructura con IaC, secretos en Secrets Manager y alarmas
   de costos, errores y latencia.
3. Implementar backup probado, restauración, retención, presupuesto y pruebas
   de carga antes de abrir la plataforma a iglesias reales.

## Pendientes móviles posteriores

- Navegación completa y pantallas operativas para estudiantes, grupos,
  asistencia, calendario, currículo, finanzas y reportes.
- Invitaciones recibidas como bandeja, notificaciones push y deep links.
- Modo offline con cola de cambios, resolución de conflictos y telemetría.
- Builds firmados mediante EAS para TestFlight y Google Play cuando Expo Go ya
  no sea suficiente para las capacidades nativas requeridas.
