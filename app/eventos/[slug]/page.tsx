import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { FREE_PASS_BADGE, FREE_PASS_CONDITION, FREE_PASS_CTA, FREE_PASS_TITLE } from "@/lib/free-pass";
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
  // La imagen 1200×630 (flyer + datos) la genera opengraph-image.tsx de esta carpeta; el flyer vertical se recortaba.
  return { title: event.name, description, openGraph: { title: `${event.name} | NERO`, description } };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();
  const isPast = event.status === "past";
  // Un único pase: la entrada Free Access del evento. Los demás tipos ya no se muestran al público.
  const pass = event.tiers.find((tier) => tier.category === "free_access" && tier.price === 0);
  const passOpen = Boolean(pass && pass.capacity - pass.sold > 0);
  const showBuyBar = !isPast && passOpen;
  const music = event.music ? musicEmbed(event.music) : null;
  const venueConfirmed = Boolean(event.venue) && !/confirmar/i.test(event.venue);

  return <div className="tinted" style={{ "--event-accent": event.accent } as React.CSSProperties}>
    <SiteNav />
    <main className="wrap event-layout" data-nero-event={event.id}>
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
          {pass ? <article className="free-pass-card">
            <span className="badge">{FREE_PASS_BADGE}</span>
            <h3>{FREE_PASS_TITLE}</h3>
            <p className="free-pass-condition">{FREE_PASS_CONDITION}</p>
            <Availability capacity={pass.capacity} sold={pass.sold} />
            {passOpen ? <FreeAccess tierId={pass.id} />
              : <span className="btn secondary" aria-disabled="true">AGOTADO</span>}
          </article> : <div className="empty">El registro se abrirá pronto.</div>}
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
      <div><small>Acceso con QR</small><b>{FREE_PASS_TITLE}</b></div>
      <a className="btn" href="#entradas">{FREE_PASS_CTA.toUpperCase()}</a>
    </div>}
    <SiteFooter />
  </div>;
}
