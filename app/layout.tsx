import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./site.css";

export const metadata: Metadata = {
  title: { default: "NERO — Electronic music experiences", template: "%s | NERO" },
  description: "Noches de house y techno. Descubre los próximos eventos de NERO en Perú.",
  openGraph: {
    title: "NERO — Electronic music experiences",
    description: "Sonido, luz y energía para encontrarnos en la pista.",
    type: "website",
    locale: "es_PE",
  },
  appleWebApp: { capable: true, title: "NERO", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#080808" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
