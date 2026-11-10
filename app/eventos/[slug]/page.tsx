import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { formatEventDate, formatEventTime, formatPrice, isRunningLow } from "@/lib/format";
import { whatsappLink } from "@/lib/social";
import { Availability } from "@/app/availability";
import { Flyer } from "@/app/flyer";
import { SiteNav } from "@/app/site-nav";
import { SiteFooter } from "@/app/site-footer";
import { musicEmbed } from "@/lib/music";
import { EventMusic } from "./event-music";
import { FreeAccess } from "./free-access";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  const description = `${formatEventDate(event.date)} · ${formatEventTime(event.time)} · ${event.venue}, ${event.city}`;
  return { title: event.name, description, openGraph: { title: `${event.name} | NERO`, description, ...(event.flyer ? { images: [event.flyer] } : {}) } };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();
  const isPast = event.status === "past";
  const open = event.tiers.filter((tier) => tier.capacity - tier.sold > 0);
  const lowest = open.length ? Math.min(...open.map((tier) => tier.price)) : null;
  const showBuyBar = !isPast && lowest !== null;
  const music = event.music ? musicEmbed(event.music) : null;
  const venueConfirmed = Boolean(event.venue) && !/confirmar/i.test(event.venue);

  return <div className="tinted" style={{ "--event-accent": event.accent } as React.CSSProperties}>
    <SiteNav />
    <main className="wrap event-layout">
      <aside className="event-aside"><Flyer src={event.flyer} name={event.name} priority /></aside>

      <div className="event-main">
        <header className="event-head">
          <span className="kicker">{isPast ? "Evento finalizado" : event.tag || "Próximo evento"}</span>
          <h1>{event.name}</h1>
          <dl className="fact-grid">
            <div><dt>Fecha</dt><dd>{formatEventDate(event.date)}</dd></div>
            <div><dt>Puertas</dt><dd>{formatEventTime(event.time)}</dd></div>
            <div className="is-wide"><dt>Lugar</dt><dd>{event.venue}, {event.city}</dd></div>
          </dl>
        </header>

        {!isPast && <section id="entradas" className="block">
          <div className="block-head"><h2 className="poster-h2">Entradas</h2></div>
          {event.tiers.length === 0 && <div className="empty">Las entradas se anunciarán pronto.</div>}
          <div className="ticket-list">{event.tiers.map((tier) => {
            const remaining = Math.max(0, tier.capacity - tier.sold);
            const free = tier.category === "free_access" && tier.price === 0;
            return <div className="ticket-row" key={tier.id}>
              <div className="ticket-row-info">
                <h3>{tier.name}{isRunningLow(tier.capacity, tier.sold) && <span className="badge">Últimas entradas</span>}</h3>
                <Availability capacity={tier.capacity} sold={tier.sold} />
              </div>
              <b className={`ticket-row-price${free ? " is-accent" : ""}`}>{formatPrice(tier.price, free)}</b>
              {remaining === 0 ? <span className="btn secondary" aria-disabled="true">AGOTADO</span>
                : free ? <FreeAccess tierId={tier.id} />
                  : <a className="btn secondary" href={whatsappLink(`Hola NERO, quiero reservar una entrada ${tier.name} para ${event.name}.`)} target="_blank" rel="noreferrer">RESERVAR POR WHATSAPP</a>}
            </div>;
          })}</div>
          {event.tiers.some((tier) => tier.price > 0) && <p className="muted ticket-note">Las entradas con precio se reservan por WhatsApp. Te confirmamos el pago y te enviamos tu entrada con QR.</p>}
        </section>}

        {event.lineup.length > 0 && <section className="block">
          <div className="block-head"><h2 className="poster-h2">Line-up</h2><span className="mono-label">En cabina</span></div>
          <ul className="lineup-big">{event.lineup.map((artist) => <li key={artist}>{artist}</li>)}</ul>
        </section>}

        {music && <section className="block">
          <div className="block-head"><h2 className="poster-h2">{isPast ? "Revive la noche" : "Escucha"}</h2><span className="mono-label">{isPast ? "El sonido de esa fecha" : "Entra en ambiente"}</span></div>
          <EventMusic embed={music} url={event.music} title={event.name} />
        </section>}

        {event.schedule.length > 0 && <section className="block">
          <div className="block-head"><h2 className="poster-h2">Horarios</h2><span className="mono-label">Organiza tu noche</span></div>
          {event.schedule.map((slot) => { const [time, activity] = slot.split("|"); return <div className="schedule-row" key={slot}><b>{time}</b><span>{activity}</span></div>; })}
        </section>}

        <section className="block">
          <div className="block-head"><h2 className="poster-h2">Ubicación</h2></div>
          <p className="location-name">{event.venue}, {event.city}</p>
          {venueConfirmed
            ? <a className="btn secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.city}, Perú`)}`} target="_blank" rel="noreferrer">CÓMO LLEGAR <span aria-hidden="true">↗</span></a>
            : <div className="empty">La dirección exacta estará disponible cuando se confirme el local.</div>}
        </section>
      </div>
    </main>

    {showBuyBar && <div className="buy-bar">
      <div><small>Desde</small><b>{formatPrice(lowest)}</b></div>
      <a className="btn" href="#entradas">VER ENTRADAS</a>
    </div>}
    <SiteFooter />
  </div>;
}
