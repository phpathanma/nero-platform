# Instalación para un productor nuevo

Guía paso a paso para dejar la plataforma funcionando para un productor. Cada productor necesita su propia instalación: un proyecto de Supabase y un despliegue en Vercel. Para saber qué hace la plataforma, ver [PLATAFORMA.md](PLATAFORMA.md).

## Qué necesitas

- Node.js 20 o superior (para probar en tu computadora).
- Cuenta en [Supabase](https://supabase.com) (base de datos, usuarios y afiches).
- Cuenta en [Vercel](https://vercel.com) (hosting).
- Cuenta en [Cloudflare](https://dash.cloudflare.com) (Turnstile, anti-bot; obligatorio en producción).
- Opcional: cuenta en [Resend](https://resend.com) con un dominio verificado, para enviar las entradas por correo.

## 1. Crear el proyecto en Supabase

1. Crea un proyecto nuevo y espera a que termine de prepararse.
2. En la configuración de API del proyecto, anota:
   - la **URL del proyecto**,
   - la **clave publicable** (publishable o anon),
   - la **clave service role** (secreta).

La service role key da acceso total a la base de datos. Solo va en el servidor (Vercel); nunca en el repositorio ni en una variable `NEXT_PUBLIC_`.

## 2. Ejecutar los archivos SQL

En Supabase, abre **SQL Editor** y ejecuta el contenido de cada archivo de `supabase/`, **uno por uno y en este orden**:

| # | Archivo | Qué instala |
| --- | --- | --- |
| 1 | `schema.sql` | Tablas (eventos, tipos de entrada, perfiles, pedidos, entradas, auditoría) y lectura pública de eventos publicados. |
| 2 | `control-policies.sql` | Permisos del panel para `admin` y `door_staff`. |
| 3 | `marketing-contacts.sql` | Teléfono, consentimiento de marketing y registro de exportaciones. |
| 4 | `ticket-issuance.sql` | Funciones de emisión de Free Access y cortesías, consulta de entrada y validación en puerta. |
| 5 | `flyers-storage.sql` | Espacio público `flyers` para los afiches (solo un admin puede subir). |
| 6 | `event-music.sql` | Columna del enlace de música del evento. |
| 7 | `migrations/20261029000000_harden_control_role_search_path.sql` | Refuerzo de seguridad de la función de roles. |

Notas:

- `schema.sql` se ejecuta **una sola vez**: si se repite, falla porque el tipo y las políticas ya existen. Los demás archivos se pueden volver a ejecutar sin problema.
- En una instalación nueva, el paso 7 no cambia nada (el paso 2 ya incluye ese refuerzo), pero conviene ejecutarlo igual para dejar todo aplicado.
- Si falta el paso 5, el evento se guarda pero el afiche no sube. Si falta el paso 6, el sitio funciona pero sin música por evento.

## 3. Crear usuarios y asignar roles

1. En Supabase, ve a **Authentication** y crea un usuario con correo y contraseña.
2. Copia el UUID del usuario.
3. En SQL Editor, asígnale el rol:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID-DEL-USUARIO', 'NERO Admin', 'admin')
on conflict (id) do update set role = excluded.role;
```

- Usa `'admin'` para quien gestiona eventos, ventas y cortesías.
- Usa `'door_staff'` para el personal de puerta (solo valida entradas).
- Repite los pasos para cada persona. Cada miembro del equipo debe tener su propia cuenta.
- No permitas que cada usuario elija su propio rol.

Una cuenta sin fila en `profiles` puede iniciar sesión, pero no entra al panel.

## 4. Variables de entorno

Para trabajar en tu computadora, copia `.env.example` a `.env.local` y complétalo. En Vercel, se cargan en **Settings > Environment Variables**. `.env.local` nunca se sube al repositorio.

### Obligatorias

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable. También se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como alternativa. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta. Necesaria para emitir Free Access. Solo servidor. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clave del sitio de Turnstile. Obligatoria en producción. |
| `TURNSTILE_SECRET_KEY` | Clave secreta de Turnstile. Obligatoria en producción. Solo servidor. |

### Opcionales

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Perfil de Instagram del productor. |
| `NEXT_PUBLIC_WHATSAPP_URL` | Enlace de WhatsApp, con formato `https://wa.me/51XXXXXXXXX`. No figura en `.env.example`; agrégala a mano. |
| `NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID` | ID de una playlist pública: la parte que va después de `/playlist/` en su enlace. |
| `RESEND_API_KEY` | Clave de Resend para enviar entradas por correo. |
| `TICKET_FROM_EMAIL` | Remitente verificado en Resend. |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio, por ejemplo `https://tudominio.com`. Se usa para el enlace de la entrada en el correo. |

Importante: si no defines Instagram, WhatsApp o Spotify, el sitio usa los de NERO (valores por defecto en `lib/social.ts`). Para otro productor hay que definirlos siempre.

El correo solo se envía si están `RESEND_API_KEY` y `TICKET_FROM_EMAIL`. Sin ellas, la entrada se emite igual y la persona la descarga en pantalla.

## 5. Probar en tu computadora (opcional)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Reinicia el servidor después de cambiar `.env.local`.

- Sin las variables de Supabase, el sitio abre pero sin eventos, y el panel pide conectar Supabase.
- En local, Turnstile no es obligatorio: sin `TURNSTILE_SECRET_KEY` no se pide la verificación.
- `/api/health` indica si Supabase está configurado (`configured` o `demo`).

## 6. Desplegar en Vercel

1. Sube el código a un repositorio propio del productor.
2. En Vercel, crea un proyecto nuevo e importa ese repositorio. Detecta Next.js sin configuración adicional.
3. Carga las variables de entorno del paso 4 en el ambiente **Production** (y en Preview si lo vas a usar).
4. Despliega. Si cambias variables después, hay que volver a desplegar para que se apliquen.
5. Si el productor tiene dominio propio, agrégalo en **Settings > Domains** y actualiza `NEXT_PUBLIC_SITE_URL`.

Vercel Hobby es para uso no comercial. Para un productor que vende entradas corresponde un plan de pago.

## 7. Configurar Turnstile

1. En Cloudflare, entra a **Turnstile** y crea un widget.
2. En **Hostnames**, agrega el dominio exacto de producción, sin `https://` y sin barra final. Ejemplos: `tudominio.com`, `mi-proyecto.vercel.app`.
3. Copia la **Site Key** en `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y la **Secret Key** en `TURNSTILE_SECRET_KEY`.
4. Vuelve a desplegar en Vercel.

Cuidado con el hostname:

- Un error de tipeo en el hostname hace que el widget muestre **"No es posible conectarse al sitio web"** y nadie pueda obtener su entrada. Es la falla más común: revisa letra por letra.
- El servidor también compara el hostname que devuelve Turnstile con el del sitio. Si la gente entra por más de un dominio (por ejemplo, con y sin `www`, o el dominio de Vercel y el propio), agrega todos al widget.
- En producción, si falta cualquiera de las dos claves, Free Access responde "La protección del registro todavía no está configurada" y no emite entradas.

## 8. Personalizar para el productor

| Qué | Dónde |
| --- | --- |
| Logo | `public/logo.png` (se usa en el menú y el pie de página; el actual mide 1600 × 276). |
| Iconos de la app instalable | `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`. |
| Nombre de la app instalable | `app/manifest.ts`. |
| Instagram, WhatsApp y Spotify | Variables de entorno (paso 4) o los valores por defecto en `lib/social.ts`. |
| Textos de la portada (presentación, géneros, ciudad) | `app/page.tsx`. |
| Título y descripción del sitio | `app/layout.tsx`. |
| Pie de página (nombre, ciudad, año) | `app/site-footer.tsx`. |
| Términos y condiciones | `app/terminos/page.tsx`. |
| Política de privacidad | `app/privacidad/page.tsx`. |
| Texto y asunto del correo de la entrada | `lib/tickets/email.ts`. |
| Texto del PDF de la entrada | `app/entrada/ticket-client.tsx`. |

A tener en cuenta:

- El nombre "NERO" aparece escrito en varios archivos más (panel, formularios, mensaje de WhatsApp). Busca `NERO` en todo el proyecto y reemplaza lo que corresponda.
- Los textos legales nombran a NERO como responsable de los datos y citan su sede en Chiclayo. Son borradores: hay que adaptarlos al productor y hacerlos revisar por un profesional.
- El color de cada evento se elige en el panel, no en el código.

## 9. Primer evento

1. Entra a `/control/login` con la cuenta admin.
2. En **Eventos**, crea el evento: nombre, enlace, fecha, hora, ciudad, local, afiche, color y tipos de entrada con precio y cupo.
3. Cambia el estado a **Publicado** para que aparezca en el sitio. Los cambios pueden tardar hasta 60 segundos en verse.
4. Al terminar el evento, cámbialo a **Finalizado**: pasa al archivo y se habilita la descarga de contactos.

## Antes de cada evento

- [ ] **Proyecto de Supabase activo.** En el plan gratuito, los proyectos sin uso se pausan. Entra al panel de Supabase unos días antes y reactívalo si hace falta. Comprueba que el sitio muestra el evento.
- [ ] **Cuentas del personal de puerta creadas**, con rol `door_staff`, y cada persona probó su usuario y contraseña en `/control/login`.
- [ ] **Cada persona de puerta abrió el escáner una vez** en su propio celular (`/control/accesos` > ACTIVAR CÁMARA) y aceptó el permiso de cámara. Opcional: añadir la página a la pantalla de inicio.
- [ ] **Prueba completa de un Free Access**: pedir una entrada desde la página del evento, abrirla en `/entrada`, descargar el PDF y validarla en puerta. Debe salir verde la primera vez y rojo la segunda.
- [ ] **Cupos revisados**: la entrada de prueba descuenta cupo; tenlo en cuenta al fijar el cupo de cada tipo de entrada.
- [ ] **Internet en la puerta**: el escáner no funciona sin conexión. Verifica la señal en el local o lleva un punto de acceso.
- [ ] **Celulares con batería** y, si es de noche, linterna probada (no todos los equipos la soportan desde el navegador).
