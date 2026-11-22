/* eslint-disable @next/next/no-img-element -- next/og (satori) dibuja <img> en la imagen; no es HTML de la página. */
// Tarjetas Open Graph de NERO (1200×630). Fondo oscuro y márgenes amplios: el logo nunca queda cortado,
// ni en el rectángulo 1.91:1 de Instagram ni en la miniatura cuadrada (recorte centrado) de WhatsApp.
import { titleSize } from "@/lib/og";

const BG = "#080808";
const INK = "#f4f4f2";
const DIM = "#9a9a96";
const ACID = "#d4ff3f";
const LOGO_RATIO = 276 / 1600; // public/logo.png

export function BrandCard({ logo }: { logo: string }) {
  return <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BG, gap: 44 }}>
    <img src={logo} alt="NERO" width={540} height={Math.round(540 * LOGO_RATIO)} />
    <div style={{ display: "flex", alignItems: "center", gap: 16, color: DIM, fontSize: 22, letterSpacing: 6, textTransform: "uppercase" }}>
      <div style={{ width: 12, height: 12, background: ACID }} />
      Electronic music experiences · Perú
    </div>
  </div>;
}

type EventCardProps = { logo: string; flyer: string | null; name: string; kicker: string; when: string; where: string; accent: string };

export function EventCard({ logo, flyer, name, kicker, when, where, accent }: EventCardProps) {
  const color = /^#[0-9a-f]{6}$/i.test(accent) ? accent : ACID;
  return <div style={{ width: "100%", height: "100%", display: "flex", background: BG }}>
    {flyer && <img src={flyer} alt="" width={504} height={630} style={{ width: 504, height: 630, objectFit: "cover" }} />}
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: flyer ? "56px 60px" : "64px 96px" }}>
      <img src={logo} alt="NERO" width={200} height={Math.round(200 * LOGO_RATIO)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color, fontSize: 22, letterSpacing: 5, textTransform: "uppercase" }}>
          <div style={{ width: 12, height: 12, background: color }} />
          {kicker}
        </div>
        <div style={{ display: "flex", color: INK, fontSize: titleSize(name), fontWeight: 800, lineHeight: 1, textTransform: "uppercase", letterSpacing: -1 }}>{name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 26 }}>
        <div style={{ display: "flex", color: INK }}>{when}</div>
        <div style={{ display: "flex", color: DIM }}>{where}</div>
      </div>
    </div>
  </div>;
}
