import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/events";
import { FreeTicketForm } from "../free-ticket-form";
import { Availability } from "@/app/availability";

export default async function TicketPage({ params, searchParams }: { params: Promise<{ eventId: string }>, searchParams: Promise<{ tier?: string }> }) {
  const { eventId } = await params;
  const { tier } = await searchParams;
  const event = await getEventById(eventId);
  if (!event || event.status !== "published") notFound();
  const selected = event.tiers.find((item) => item.id === tier) ?? event.tiers[0];
  if (!selected) notFound();
  const isFreeAccess = selected.category === "free_access" && selected.price === 0;
  const available = Math.max(0, selected.capacity - selected.sold);

  return <><nav className="nav"><Link className="logo" href="/">NERO</Link><Link className="back-link" href={`/eventos/${event.slug}`}>← VOLVER AL EVENTO</Link></nav>
    <main className="wrap" style={{ maxWidth: 720, paddingTop: 58, paddingBottom: 80 }}>
      <span className="eyebrow">NERO TICKETS · {event.city}</span><h1 className="detail-title" style={{ fontSize: "clamp(40px, 7vw, 66px)", marginBottom: 30 }}>{isFreeAccess ? "Asegura tu Free Access." : "Tu próxima noche empieza aquí."}</h1>
      <div className="ticket-box"><span className="tag">{event.name}</span><h2>{selected.name}</h2><div className="price">{isFreeAccess ? "GRATIS" : `S/ ${selected.price.toLocaleString("es-PE")}`}</div><p className="muted">{event.date} · {event.time}<br />{event.venue}, {event.city}</p><Availability capacity={selected.capacity} sold={selected.sold} /></div>
      {isFreeAccess && available > 0 ? <><p className="muted">Completa tus datos y emitiremos una entrada con QR a tu nombre.</p><FreeTicketForm tierId={selected.id} /></>
        : isFreeAccess ? <div className="notice">Free Access ya alcanzó su cupo.</div>
          : <><div className="notice">La compra de entradas pagadas estará disponible cuando se integre la pasarela de pago y la confirmación segura del servidor.</div><button className="btn" disabled style={{ width: "100%", opacity: .5 }}>PAGO PRÓXIMAMENTE</button></>}
    </main></>;
}
