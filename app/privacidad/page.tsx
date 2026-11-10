import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/app/site-nav";
import { SiteFooter } from "@/app/site-footer";
import { whatsappUrl } from "@/lib/social";

export const metadata: Metadata = { title: "Política de privacidad", description: "Cómo NERO trata tus datos personales." };

export default function PrivacyPage() {
  return <>
    <SiteNav />
    <main className="wrap legal">
      <span className="eyebrow">Legal</span>
      <h1>Política de privacidad</h1>
      <p className="muted">Última actualización: noviembre de 2026</p>

      <p>Esta política explica qué datos personales recoge NERO a través de este sitio, para qué los usa y qué derechos tienes, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento.</p>

      <h2>1. Quién es responsable</h2>
      <p>El responsable del tratamiento es NERO, productora de eventos de música electrónica con sede en Chiclayo, Lambayeque, Perú. Para cualquier consulta sobre tus datos puedes escribirnos por <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>.</p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li><b>Datos que nos das al obtener una entrada:</b> nombre completo, correo electrónico y número de teléfono.</li>
        <li><b>Tu preferencia de comunicaciones:</b> si aceptaste o no recibir novedades de NERO.</li>
        <li><b>Datos de tu entrada:</b> evento, tipo de entrada, fecha de emisión y, si ingresas al evento, la fecha y hora del acceso.</li>
        <li><b>Datos técnicos:</b> los necesarios para proteger el sitio frente a usos automatizados, como tu dirección IP y datos del navegador, tratados por nuestro proveedor de verificación anti-bots.</li>
      </ul>
      <p>No guardamos datos de tarjetas ni de medios de pago en este sitio.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Emitir tu entrada con código QR y enviártela por correo.</li>
        <li>Validar tu acceso en la puerta del evento y evitar el uso duplicado de entradas.</li>
        <li>Contactarte si hay cambios importantes en el evento, como fecha, hora o lugar.</li>
        <li>Enviarte novedades y próximos eventos, <b>solo si lo aceptaste expresamente</b> al registrarte.</li>
        <li>Prevenir fraudes y abusos del sistema de entradas.</li>
      </ul>

      <h2>4. Comunicaciones de marketing</h2>
      <p>La casilla para recibir novedades es opcional y viene desmarcada. Si la aceptas, puedes retirar tu consentimiento en cualquier momento escribiéndonos por WhatsApp; dejar de recibir novedades no afecta a tus entradas.</p>

      <h2>5. Con quién compartimos tus datos</h2>
      <p>No vendemos tus datos. Solo los comparten con nosotros los proveedores que hacen funcionar el servicio, que los tratan por encargo nuestro:</p>
      <ul>
        <li>Supabase, para la base de datos donde se guardan pedidos y entradas.</li>
        <li>Vercel, para el alojamiento del sitio.</li>
        <li>Resend, para el envío de entradas por correo.</li>
        <li>Cloudflare, para la verificación anti-bots del formulario.</li>
      </ul>
      <p>Estos proveedores pueden almacenar o procesar datos en servidores fuera del Perú. Al registrarte aceptas esa transferencia, necesaria para prestar el servicio.</p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <p>Conservamos los datos de tus entradas mientras sean necesarios para gestionar el evento y atender reclamos u obligaciones legales. Los datos usados para enviarte novedades se conservan hasta que retires tu consentimiento.</p>

      <h2>7. Tus derechos</h2>
      <p>Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (derechos ARCO), así como retirar tu consentimiento, escribiéndonos por <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a> e indicando tu nombre y el correo con el que te registraste. Responderemos dentro de los plazos que establece la ley. Si consideras que no atendimos tu solicitud, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p>

      <h2>8. Seguridad</h2>
      <p>Aplicamos medidas técnicas para proteger tus datos. El código QR de tu entrada no se guarda en claro en nuestra base de datos, y el acceso a pedidos y entradas está limitado al equipo autorizado de NERO.</p>

      <h2>9. Menores de edad</h2>
      <p>Este sitio no está dirigido a menores de edad. Si crees que un menor nos ha proporcionado datos, escríbenos para eliminarlos.</p>

      <h2>10. Cambios en esta política</h2>
      <p>Podemos actualizar esta política. Publicaremos la versión vigente en esta página con su fecha de actualización.</p>

      <p className="muted">Consulta también nuestros <Link href="/terminos">términos y condiciones</Link>.</p>
    </main>
    <SiteFooter />
  </>;
}
