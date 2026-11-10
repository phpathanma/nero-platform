# NERO Platform: qué es y qué hace

Plataforma web de eventos y entradas creada para NERO, productora de house y techno en Chiclayo, Lambayeque, Perú. Reúne en un solo proyecto:

- **Sitio público**: agenda, página de cada evento y archivo de fechas pasadas.
- **Entradas**: emisión de entradas con código QR (Free Access y cortesías).
- **NERO CONTROL**: panel privado para gestionar eventos, ver ventas y validar entradas en puerta.

Está construida con Next.js 15 y Supabase (base de datos, autenticación y almacenamiento de afiches), y pensada para desplegarse en Vercel. Para instalarla para un productor nuevo, ver [INSTALACION.md](INSTALACION.md).

## 1. Sitio público

### Portada (`/`)

- **Próximo evento** destacado: nombre, fecha, hora de puertas, lugar, precio desde y afiche. Si no hay eventos publicados, muestra un mensaje con enlace a Instagram.
- **Agenda**: lista de eventos publicados, ordenados por fecha.
- **Nosotros**: texto de presentación de la productora.
- **Archivo**: eventos finalizados con su afiche.
- **Síguenos**: enlace a Instagram y playlist de Spotify. El reproductor solo se carga cuando la persona pulsa el botón; nunca suena al abrir la página.

### Página de evento (`/eventos/[slug]`)

- Afiche, nombre, fecha, hora y lugar.
- **Entradas**: cada tipo con su precio y disponibilidad; aviso de "Últimas entradas" y estado "Agotado".
- **Line-up** y **Horarios** (si se cargaron).
- **Música del evento** (opcional): un set o playlist de Spotify, SoundCloud o YouTube. Se carga solo al pulsar "Escuchar".
- **Ubicación** con botón "Cómo llegar" (abre Google Maps). Solo aparece cuando el local está confirmado.
- **Barra de compra fija** en la parte inferior con el precio desde y acceso directo a las entradas.
- Cada evento usa su propio **color de acento** en botones y detalles.
- Los eventos en borrador no son visibles. Los finalizados se muestran sin la sección de entradas.

### Otros

- Páginas legales: `/terminos` y `/privacidad`.
- Menú adaptado a celular.
- Pie de página con enlaces a WhatsApp, Instagram y páginas legales.
- Los datos públicos se actualizan con una caché de hasta 60 segundos.

## 2. Entradas

### Free Access

- La persona completa nombre, teléfono y correo en la página del evento. Puede aceptar, de forma opcional, recibir novedades.
- Protección anti-bot con **Cloudflare Turnstile**. En producción, sin las dos claves de Turnstile configuradas no se emite ninguna entrada.
- **Una entrada por correo por evento.**
- Cada entrada descuenta cupo de su categoría.
- La emisión se hace solo desde el servidor.

### Código QR

- Cada entrada tiene un token aleatorio de 256 bits. En la base de datos **solo se guarda su hash SHA-256**, no el token.
- El enlace de la entrada es privado: quien lo tiene puede ingresar. No debe compartirse.

### Página de la entrada (`/entrada`)

- Muestra el QR, el evento, la categoría y el nombre del titular.
- **Descargar entrada PDF**.
- **Añadir al calendario** (Google Calendar).
- Compartir o copiar el enlace privado.
- Indica si la entrada ya fue utilizada.

### Correo (opcional)

Si se configura Resend, la entrada también se envía por correo con el enlace a `/entrada`. Sin Resend, la persona abre y descarga su entrada en el momento.

### Entradas con precio

- **El pago en línea todavía no está integrado.**
- Los tipos con precio muestran el botón "Reservar por WhatsApp", que abre un chat con un mensaje prearmado. El productor confirma el pago por su cuenta.

### Cortesías

- Un administrador emite cortesías desde la página de edición del evento: categoría, nombre, teléfono, correo y motivo opcional.
- La cortesía descuenta cupo de la categoría elegida y no suma ingresos.
- No se emiten para eventos finalizados.

## 3. NERO CONTROL (`/control`)

Panel privado. Se ingresa con correo y contraseña en `/control/login`.

### Roles

| Rol | Puede |
| --- | --- |
| `admin` | Todo: eventos, ventas, cortesías, exportar contactos y validar entradas. |
| `door_staff` | Solo el resumen y Accesos QR (validar entradas). |

Los roles se asignan manualmente en Supabase. Una cuenta sin rol no entra al panel.

### Eventos (`/control/eventos`)

- Crear y editar eventos: nombre, enlace (slug), etiqueta, ciudad, fecha, hora, local, artistas y horarios.
- **Estado**: Borrador, Publicado o Finalizado.
- **Afiche**: imagen JPG, PNG o WebP de hasta 4 MB (recomendado vertical 4:5, por ejemplo 1080 × 1350).
- **Color del evento**.
- **Enlace de música** (Spotify, SoundCloud o YouTube).
- **Tipos de entrada**: Free Access, GA 10PM, GA All Night, VIP y DJ Booth, cada uno con precio y cupo. El cupo no puede bajar por debajo de las entradas ya emitidas.

### Ventas (`/control/ventas`)

Lista de pedidos (ventas, Free Access y cortesías) con totales de ingresos confirmados, pedidos pagados y pendientes. Solo para administradores.

### Contactos de marketing

- Cuando un evento está **Finalizado**, un administrador puede descargar un CSV compatible con Excel con nombre, teléfono y correo.
- Incluye **solo personas que dieron consentimiento explícito**, un contacto por correo. Las cortesías quedan excluidas.
- Cada descarga queda registrada en el registro de auditoría (`audit_logs`).

## 4. Puerta (`/control/accesos`)

- **Escáner QR con la cámara** del celular, desde el navegador. Funciona en iPhone y Android: usa el detector nativo del navegador (`BarcodeDetector`) cuando existe y, si no, la librería jsQR.
- **Resultado a pantalla completa**: verde si la entrada es válida, rojo si ya fue usada o no es válida. Incluye pitido (uno para válida, dos para rechazo) y vibración donde el dispositivo lo permite.
- **Linterna**, en los dispositivos que la soportan.
- **Contador por evento**: "X / Y ingresaron" para cada evento publicado.
- **Código manual**: se puede escribir o pegar el código, o usar un lector USB.
- Cada entrada se acepta **una sola vez**. Cada ingreso queda registrado en `audit_logs`.
- La pantalla se mantiene encendida mientras la cámara está activa (donde el navegador lo permite).
- **Instalable en la pantalla de inicio** del celular: se abre como app directamente en Accesos QR.

Requisitos en puerta: conexión a internet y HTTPS (el dominio de Vercel ya lo cumple).

## Limitaciones actuales

- **Sin pagos en línea.** Las entradas con precio se reservan por WhatsApp y el cobro es manual. Antes de vender en línea hay que integrar una pasarela compatible con Perú, con webhook firmado y confirmación segura del pago.
- **Una sola marca.** No es multi-productor: cada productor necesita su propia instalación (su proyecto de Supabase y su despliegue). El nombre NERO, los textos y los colores base están escritos en el código.
- **Planes gratuitos de hosting.**
  - Vercel Hobby es para uso no comercial; para vender entradas corresponde un plan de pago.
  - Supabase gratuito pausa los proyectos inactivos y no tiene copias de seguridad automáticas.
- **Textos legales en borrador.** `/terminos` y `/privacidad` deben ser revisados por un profesional antes de usarlos con un productor nuevo.
- **El escáner necesita internet.** No hay modo sin conexión.
