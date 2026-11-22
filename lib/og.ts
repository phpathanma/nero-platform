// Imágenes Open Graph (1200×630): ayudas puras y carga de recursos para app/opengraph-image.tsx y los eventos.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
// Las tarjetas de evento llevan una foto: en PNG pesan ~650 KB y WhatsApp puede omitir la vista previa; en JPEG, mucho menos.
export const OG_EVENT_CONTENT_TYPE = "image/jpeg";
// Panel del flyer en la tarjeta de evento (ocupa toda la altura).
export const FLYER_BOX = { width: 504, height: 630 };

// next/og (satori) solo lee PNG y JPEG directamente; WebP/AVIF se convierten con sharp (ver flyerDataUrl).
export function flyerKind(contentType: string | null | undefined): "image/png" | "image/jpeg" | null {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (type === "image/png") return "image/png";
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  return null;
}

// El título se achica según su largo para no salirse del panel derecho.
export function titleSize(title: string): number {
  const length = title.trim().length;
  if (length <= 14) return 84;
  if (length <= 24) return 68;
  if (length <= 40) return 54;
  return 44;
}

// Corta un texto largo en el último espacio antes del límite y agrega «…» (la tarjeta tiene poco espacio).
export function shortText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s·,|/-]+$/, "")}…`;
}

// Etiqueta sobre el título: el tag del evento solo si es corto; si no, «Próximo evento». Finalizado siempre lo dice.
export function eventKicker(status: string, tag: string | null | undefined): string {
  if (status === "past") return "Evento finalizado";
  const clean = (tag ?? "").trim();
  return clean && clean.length <= 28 ? clean : "Próximo evento";
}

// Logo del sitio como data URL (lo lee del propio repo, así no depende de la red al renderizar).
export async function logoDataUrl(publicPath: string): Promise<string> {
  const bytes = await readFile(join(process.cwd(), "public", publicPath));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

// Pasa la respuesta PNG de next/og a JPEG con sharp (conserva las cabeceras de caché). Si sharp fallara, deja el PNG.
export async function asJpeg(image: Response, quality = 85): Promise<Response> {
  const png = Buffer.from(await image.arrayBuffer());
  try {
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(png).jpeg({ quality, mozjpeg: true }).toBuffer();
    const headers = new Headers(image.headers);
    headers.set("content-type", OG_EVENT_CONTENT_TYPE);
    headers.set("content-length", String(jpeg.length));
    return new Response(new Uint8Array(jpeg), { status: image.status, headers });
  } catch {
    return new Response(new Uint8Array(png), { status: image.status, headers: image.headers });
  }
}

// Flyer como data URL listo para la tarjeta: cualquier imagen (JPEG, PNG, WebP, AVIF) se recorta con sharp a
// 504×630 y se pasa a JPEG, que next/og sí lee y pesa poco. Si sharp fallara, se usa el original cuando es PNG/JPEG.
// Sin flyer, o si no se puede descargar, devuelve null y la tarjeta queda solo con texto.
export async function flyerDataUrl(url: string | null | undefined, timeoutMs = 4000): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    const bytes = Buffer.from(await response.arrayBuffer());
    try {
      const { default: sharp } = await import("sharp");
      const jpeg = await sharp(bytes).resize(FLYER_BOX.width, FLYER_BOX.height, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    } catch {
      const kind = flyerKind(type);
      return kind ? `data:${kind};base64,${bytes.toString("base64")}` : null;
    }
  } catch {
    return null;
  }
}
