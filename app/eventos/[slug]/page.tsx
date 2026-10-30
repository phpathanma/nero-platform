import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { Availability } from "@/app/availability";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return event ? { title: event.name, description: `${event.tag} · ${event.date} · ${event.city}` } : {};
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();
  const available = event.tiers.reduce((total, tier) => total + Math.max(0, tier.capacity - tier.sold), 0);
  const totalCapacity = event.tiers.reduce((total, tier) => total + tier.capacity, 0);
  const availabilityPercent = totalCapacity > 0 ? Math.round((available / totalCapacity) * 100) : 0;
  const isPast = event.status === "past";

  return <>
    <nav className="nav" aria-label="Navegación del evento"><Link className="logo" href="/">NERO</Link><Link className="back-link" href="/#eventos">← TODOS LOS EVENTOS</Link></nav>
    <main className="wrap" style={{ "--event-bg": event.background, "--event-accent": event.accent } as React.CSSProperties}>
      <div className="detail-hero"><div className="detail-poster">{event.name}</div><div><span className="tag">{event.tag}</span><h1 className="detail-title">{event.name}</h1><p className="muted event-meta">{event.date} · {event.time}<br />{event.venue}, {event.city}</p><span className="pill">{isPast ? "Evento finalizado" : available > 0 ? `Disponibilidad ${availabilityPercent}%` : "Agotado"}</span></div></div>
      {!isPast && <section className="ticket-box"><span className="eyebrow">Asegura tu lugar</span><h2>Entradas</h2>{event.tiers.map((tier) => {
        const remaining = Math.max(0, tier.capacity - tier.sold);
        const isFreeAccess = tier.category === "free_access" && tier.price === 0;
        return <div className="tier" key={tier.id}><div className="tier-info"><b>{tier.name}</b><Availability capacity={tier.capacity} sold={tier.sold} /></div><div style={{ textAlign: "right" }}><div className="price">{isFreeAccess ? "GRATIS" : `S/ ${tier.price.toLocaleString("es-PE")}`}</div>{remaining > 0 ? <Link className="btn" href={`/tickets/${event.id}?tier=${tier.id}`}>{isFreeAccess ? "OBTENER ENTRADA" : "COMPRAR"}</Link> : <span className="btn" aria-disabled="true" style={{ opacity: .45, cursor: "not-allowed" }}>AGOTADO</span>}</div></div>;
      })}</section>}
      {event.lineup.length > 0 && <section className="section"><span className="eyebrow">En cabina</span><h2>Line-up</h2><div className="lineup">{event.lineup.map((artist) => <span key={artist}>{artist}</span>)}</div></section>}
      {event.schedule.length > 0 && <section className="section"><span className="eyebrow">Organiza tu noche</span><h2>Horarios</h2>{event.schedule.map((slot) => { const [time, activity] = slot.split("|"); return <div className="schedule-row" key={slot}><b>{time}</b><span>{activity}</span></div>; })}</section>}
      <section className="section"><span className="eyebrow">Encuéntranos</span><h2>Ubicación</h2><p className="muted">{event.venue}, {event.city}</p><div className="empty">La dirección exacta y el mapa estarán disponibles cuando se confirme el local.</div></section>
    </main><footer className="footer">NERO · Nos vemos en la pista. · <Link href="/">Volver al inicio ↗</Link></footer>
  </>;
}
