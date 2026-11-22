import { ImageResponse } from "next/og";
import { logoDataUrl, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { BrandCard } from "./og-cards";

// Vista previa al compartir el sitio (Instagram, WhatsApp, X): 1200×630 con el logo centrado.
export const alt = "NERO — Electronic music experiences";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(<BrandCard logo={await logoDataUrl("logo.png")} />, size);
}
