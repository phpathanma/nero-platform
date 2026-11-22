import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./site.css";
import { AnalyticsTracker } from "./analytics-tracker";

// URL pública del sitio: las imágenes Open Graph necesitan una dirección absoluta para Instagram, WhatsApp y X.
function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
    || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "NERO — Electronic music experiences", template: "%s | NERO" },
  description: "Noches de house y techno. Descubre los próximos eventos de NERO en Perú.",
  openGraph: {
    title: "NERO — Electronic music experiences",
    description: "Sonido, luz y energía para encontrarnos en la pista.",
    type: "website",
    locale: "es_PE",
    siteName: "NERO",
  },
  // La imagen 1200×630 sale de app/opengraph-image.tsx y app/twitter-image.tsx (convención de Next.js).
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "NERO", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#080808" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}<AnalyticsTracker /></body></html>;
}
