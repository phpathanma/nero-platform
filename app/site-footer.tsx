import Link from "next/link";
import { instagramUrl, whatsappUrl } from "@/lib/social";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-top">
      <Link className="site-footer-logo" href="/" aria-label="NERO, inicio">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático */}
        <img src="/logo.png" alt="NERO" width={1600} height={276} loading="lazy" />
      </Link>
      <div className="site-footer-links">
        <div><span>EXPLORA</span><Link href="/#eventos">Agenda</Link><Link href="/#pasados">Archivo</Link><Link href="/#nosotros">Nosotros</Link></div>
        <div><span>CONTACTO</span><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a><a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a></div>
        <div><span>LEGAL</span><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Política de privacidad</Link></div>
      </div>
    </div>
    <div className="site-footer-bottom"><span>© 2026 NERO · Electronic music experiences</span><span>CHICLAYO · LAMBAYEQUE · PERÚ</span></div>
  </footer>;
}
