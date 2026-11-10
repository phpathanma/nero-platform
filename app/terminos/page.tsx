import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/app/site-nav";
import { SiteFooter } from "@/app/site-footer";
import { whatsappUrl } from "@/lib/social";

export const metadata: Metadata = { title: "Términos y condiciones", description: "Condiciones de uso del sitio y de las entradas de NERO." };

export default function TermsPage() {
  return <>
    <SiteNav />
    <main className="wrap legal">
      <span className="eyebrow">Legal</span>
      <h1>Términos y condiciones</h1>
      <p className="muted">Última actualización: noviembre de 2026</p>

      <p>Estos términos regulan el uso de este sitio y de las entradas emitidas por NERO. Al obtener una entrada aceptas estas condiciones.</p>

      <h2>1. Entradas</h2>
      <ul>
        <li>Cada entrada tiene un código QR único que permite <b>un solo acceso</b>. Una vez escaneado en puerta, no puede volver a usarse.</li>
        <li>Quien tenga el enlace o el QR puede ingresar con él. No lo compartas ni lo publiques: NERO no se hace responsable del uso de una entrada compartida por su titular.</li>
        <li>Las entradas no pueden revenderse ni usarse con fines comerciales sin autorización de NERO.</li>
      </ul>

      <h2>2. Free Access</h2>
      <ul>
        <li>Se permite una entrada Free Access por correo electrónico y por evento.</li>
        <li>Está sujeta al cupo disponible y, cuando se indique, a un horario límite de ingreso.</li>
        <li>NERO puede anular entradas obtenidas con datos falsos o por medios automatizados.</li>
      </ul>

      <h2>3. Entradas con precio</h2>
      <p>Las entradas con precio se reservan por WhatsApp. La entrada se emite después de confirmar el pago, y el precio y las condiciones son los que te informemos al reservar.</p>

      <h2>4. Ingreso al evento</h2>
      <ul>
        <li>El ingreso está sujeto al aforo del local y a las normas de seguridad vigentes.</li>
        <li>Los eventos pueden tener restricción de edad. Se indicará en cada evento y podrá solicitarse un documento de identidad en puerta.</li>
        <li>NERO y el local se reservan el derecho de admisión conforme a ley, sin discriminación, y pueden negar el ingreso o retirar a quien ponga en riesgo la seguridad de los asistentes.</li>
      </ul>

      <h2>5. Cambios y cancelaciones</h2>
      <p>La fecha, la hora, el lugar o los artistas pueden cambiar por causas justificadas. Si eso ocurre, lo comunicaremos por nuestros canales y, cuando sea posible, al correo o teléfono con el que te registraste. Si un evento con entradas pagadas se cancela, se devolverá el importe pagado por la entrada, conforme a las normas de protección al consumidor.</p>

      <h2>6. Fotografía y video</h2>
      <p>En nuestros eventos se toman fotografías y videos que pueden publicarse en los canales de NERO. Si apareces en una imagen y quieres que la retiremos, escríbenos y lo haremos.</p>

      <h2>7. Uso del sitio</h2>
      <p>No está permitido usar el sitio de forma automatizada, intentar eludir sus medidas de seguridad ni registrar entradas con datos de terceros sin su permiso.</p>

      <h2>8. Datos personales</h2>
      <p>El tratamiento de tus datos se explica en nuestra <Link href="/privacidad">política de privacidad</Link>.</p>

      <h2>9. Contacto y reclamos</h2>
      <p>Para consultas o reclamos, escríbenos por <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>. Estos términos se rigen por las leyes de la República del Perú.</p>
    </main>
    <SiteFooter />
  </>;
}
