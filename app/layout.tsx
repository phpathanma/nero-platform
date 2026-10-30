import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NERO — Electronic music experiences", template: "%s | NERO" },
  description: "Noches de house y techno. Descubre los próximos eventos de NERO en Perú.",
  openGraph: {
    title: "NERO — Electronic music experiences",
    description: "Sonido, luz y energía para encontrarnos en la pista.",
    type: "website",
    locale: "es_PE",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
