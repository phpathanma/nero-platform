# NERO Platform

Sitio para NERO EVENTS, NERO TICKETS y NERO CONTROL. Construido con Next.js y preparado para desplegarse en Vercel con Supabase.

## Requisitos

- Node.js 20 o superior
- Proyecto Supabase (opcional para ejecutar el sitio público con datos de demostración)

## Instalar y ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Reinicia el servidor después de cambiar `.env.local`.

## Personalizar redes sociales

En `.env.local`, configura `NEXT_PUBLIC_INSTAGRAM_URL` con el perfil oficial de NERO y `NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID` con el ID de una playlist pública. Es la parte que aparece después de `/playlist/` en su enlace de Spotify.

## Conectar Supabase y habilitar Control

1. En Supabase, abre SQL Editor. Si aún no existen las tablas, ejecuta `supabase/schema.sql` una vez.
2. Ejecuta `supabase/control-policies.sql` para instalar los permisos y la función segura de check-in. Si ya habías ejecutado el esquema base, ejecuta solamente este segundo archivo.
3. En Authentication, crea un usuario con correo y contraseña.
4. Copia el UUID del usuario y asígnale un rol en SQL Editor:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID-DEL-USUARIO', 'NERO Admin', 'admin')
on conflict (id) do update set role = excluded.role;
```

Usa `door_staff` en vez de `admin` para una cuenta de personal de puerta. No permitas que cada usuario elija su propio rol.

Después de iniciar sesión en `/control`, el rol administrador puede gestionar eventos y consultar ventas. El personal de puerta puede validar entradas desde Accesos QR. Ventas y accesos mostrarán datos reales cuando el checkout emita pedidos pagados y tickets con tokens QR guardados como hash SHA-256 hexadecimal.

## Variables de entorno

Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y en cada ambiente de Vercel. La clave publicable se puede usar en el cliente junto con RLS. Nunca agregues una service role key al frontend ni al repositorio.

## Rutas

- `/` — NERO EVENTS
- `/eventos/[slug]` — detalle de evento
- `/tickets/[eventId]` — experiencia de NERO TICKETS
- `/control` — resumen de operaciones
- `/control/eventos` — catálogo y gestión de eventos
- `/control/ventas` — pedidos e ingresos
- `/control/accesos` — registro de entradas en puerta
- `/api/health` — estado de configuración

## Antes de vender entradas reales

El checkout de entradas pagadas sigue pendiente. Free Access y las cortesías ya tienen emisión de entradas confirmadas con QR. Antes de vender entradas con precio, integra una pasarela compatible con Perú, un webhook firmado y confirmación segura de pagos; configura el correo y revisa privacidad y RLS.

## Exportar contactos de marketing

Ejecuta `supabase/marketing-contacts.sql` en Supabase SQL Editor. Al marcar un evento como finalizado, un administrador puede descargar un CSV compatible con Excel desde Gestión de eventos. Incluye un contacto único por correo y solo pedidos pagados o Free Access con consentimiento explícito (`marketing_consent = true`); las cortesías quedan excluidas por defecto. Los pedidos existentes quedan sin consentimiento. Cada descarga se registra en `audit_logs`. La compra pagada sigue deshabilitada; Free Access sí solicita teléfono y recopila consentimiento opcional.

## Ticket issuance and admin courtesy passes

For a fresh Supabase project, run `schema.sql`, `control-policies.sql`, `marketing-contacts.sql`, then `ticket-issuance.sql`, in that order. For an existing project, rerun `control-policies.sql`, then run `marketing-contacts.sql` and `ticket-issuance.sql`. These SQL files are safe to rerun when applying function fixes. `ticket-issuance.sql` adds the secure RPCs for public Free Access claims, admin courtesy passes, ticket display, and check-in of zero-price confirmed tickets.

The event editor offers Free Access, GA 10PM, GA All Night, VIP, and DJ Booth. Select only the categories needed and set a price and capacity. Existing categories stay attached when editing; a capacity cannot be reduced below the issued count. Free Access is limited to one per email per event. Every Free Access or courtesy ticket consumes its category capacity. Paid checkout remains disabled until a payment provider and signed webhook are added.

Tickets use a random 256-bit QR token. Only its SHA-256 hash is stored in Supabase. The `/entrada` page renders the QR locally and can download a PDF. Optional email delivery uses Resend: configure `RESEND_API_KEY`, `TICKET_FROM_EMAIL` (a sender verified by Resend), and `NEXT_PUBLIC_SITE_URL` in the server environment. Never add a Resend or Supabase secret to a `NEXT_PUBLIC_` variable.

Before public Free Access claims are enabled in production, configure the Cloudflare Turnstile site key and secret in the Vercel Production environment (and Preview if needed). Claims fail closed in production without both keys. The backend validates the single-use challenge token before issuing a ticket.
