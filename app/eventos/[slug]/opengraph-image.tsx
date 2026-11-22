import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/events";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { asJpeg, eventKicker, flyerDataUrl, logoDataUrl, OG_EVENT_CONTENT_TYPE, OG_SIZE, shortText } from "@/lib/og";
import { BrandCard, EventCard } from "../../og-cards";

// Vista previa de cada evento: flyer a la izquierda y datos a la derecha, en 1200×630 (JPEG, liviano para WhatsApp).
// El flyer (JPEG, PNG o WebP) se convierte con sharp; solo sin flyer queda con texto. Si el evento no existe, la marca.
export const alt = "Evento de NERO";
export const size = OG_SIZE;
export const contentType = OG_EVENT_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await params;
  const [logo, event] = await Promise.all([logoDataUrl("logo.png"), getEventBySlug(slug)]);
  if (!event || event.status === "draft") return asJpeg(new ImageResponse(<BrandCard logo={logo} />, size));
  const flyer = await flyerDataUrl(event.flyer);
  return asJpeg(new ImageResponse(<EventCard
    logo={logo}
    flyer={flyer}
    name={shortText(event.name, 48)}
    kicker={eventKicker(event.status, event.tag)}
    when={`${formatEventDate(event.date)} · ${formatEventTime(event.time)}`}
    where={shortText([event.venue, event.city].filter(Boolean).join(", "), 64)}
    accent={event.accent}
  />, size));
}
