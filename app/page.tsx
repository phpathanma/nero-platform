import Link from "next/link";
import { getEvents } from "@/lib/events";
import { eventDateParts, formatEventDate, formatEventTime, lowestPriceLabel } from "@/lib/format";
import { instagramUrl, spotifyPlaylistId } from "@/lib/social";
import { Flyer } from "./flyer";
import { SiteNav } from "./site-nav";
import { SpotifyPlayer } from "./spotify-player";
import { SiteFooter } from "./site-footer";

function shortDate(date: string) {
  const parts = eventDateParts(date);
  return parts ? `${parts.weekday} ${Number(parts.day)} ${parts.month}` : date;
}

export default async function HomePage() {
  const all = await getEvents();
  const upcoming = all.filter((event) => event.status === "published");
  const past = all.filter((event) => event.status === "past").reverse();
  const featured = upcoming[0];

  return (
    <>
      <SiteNav />

      {featured ? (
        <header className="next-event tinted" style={{ "--event-accent": featured.accent } as React.CSSProperties}>
          <div className="next-event-info">
            <span className="kicker">Próximo evento{featured.tag ? ` · ${featured.tag}` : ""}</span>
            <h1>{featured.name}</h1>
            <dl className="fact-grid">
              <div><dt>Fecha</dt><dd>{formatEventDate(featured.date)}</dd></div>
              <div><dt>Puertas</dt><dd>{formatEventTime(featured.time)}</dd></div>
              <div><dt>Lugar</dt><dd>{featured.venue}, {featured.city}</dd></div>
              <div><dt>Entradas</dt><dd className="is-accent">{lowestPriceLabel(featured.tiers) || "Próximamente"}</dd></div>
            </dl>
            <div className="cta-row">
              <Link className="btn" href={`/eventos/${featured.slug}#entradas`}>OBTENER ENTRADA <span aria-hidden="true">↗</span></Link>
              <Link className="btn secondary" href={`/eventos/${featured.slug}`}>VER EVENTO</Link>
            </div>
          </div>
          <Link className="next-event-flyer" href={`/eventos/${featured.slug}`} aria-label={`Ver ${featured.name}`}>
            <Flyer src={featured.flyer} name={featured.name} priority />
          </Link>
        </header>
      ) : (
        <header className="next-event is-empty">
          <div className="next-event-info">
            <span className="kicker">Electronic music experiences · Perú</span>
            <h1>Pronto, nuevas fechas</h1>
            <p className="muted">Noches de house y techno. Sonido, luz y energía para encontrarnos en la pista.</p>
            <div className="cta-row"><a className="btn" href={instagramUrl} target="_blank" rel="noreferrer">SÍGUENOS EN INSTAGRAM <span aria-hidden="true">↗</span></a></div>
          </div>
        </header>
      )}

      <div className="ticker" aria-hidden="true">
        <span>HOUSE</span><span>TECHNO</span><span>EDM</span><span>CHICLAYO</span><span>LAMBAYEQUE</span><span>PERÚ</span>
      </div>

      <main className="wrap">
        <section id="eventos" className="block">
          <div className="block-head"><h2 className="poster-h2">Agenda</h2><span className="mono-label">Próximas fechas</span></div>
          {upcoming.length ? <div className="row-list">{upcoming.map((event) => (
            <Link className="row tinted" key={event.id} href={`/eventos/${event.slug}`} style={{ "--event-accent": event.accent } as React.CSSProperties}>
              <span className="row-date">{shortDate(event.date)}</span>
              <h3>{event.name}</h3>
              <span className="row-city">{event.city}</span>
              <span className="row-price">{lowestPriceLabel(event.tiers)}</span>
              <span className="row-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}</div> : <div className="empty">Pronto anunciaremos nuevas fechas. <a className="social-action" href={instagramUrl} target="_blank" rel="noreferrer">Síguenos en Instagram ↗</a></div>}
        </section>

        <section id="nosotros" className="block statement">
          <h2 className="poster-h2">La noche nos conecta.</h2>
          <div>
            <span className="mono-label">Ritmo, comunidad, movimiento</span>
            <p>NERO es una plataforma y productora de experiencias de música electrónica en Perú. Creamos noches de house y techno que conectan artistas, espacios y comunidad.</p>
          </div>
        </section>

        <section id="pasados" className="block">
          <div className="block-head"><h2 className="poster-h2">Archivo</h2><span className="mono-label">Noches pasadas</span></div>
          {past.length ? <div className="archive">{past.map((event) => (
            <Link className="archive-card" key={event.id} href={`/eventos/${event.slug}`}>
              <Flyer src={event.flyer} name={event.name} />
              <h3>{event.name}</h3>
              <span className="mono-label">{formatEventDate(event.date)} · {event.city}</span>
            </Link>
          ))}</div> : <div className="empty">Pronto compartiremos recuerdos de nuestras noches.</div>}
        </section>

        <section id="siguenos" className="social-section" aria-label="Conecta con NERO">
          <article className="social-card" data-mark="@">
            <div><span className="mono-label">Detrás de la noche</span><h2>Síguenos en Instagram</h2><p>Anuncios, artistas y momentos desde la pista. La conversación continúa en Instagram.</p></div>
            <a className="social-action" href={instagramUrl} target="_blank" rel="noreferrer">IR A INSTAGRAM ↗</a>
          </article>
          <article className="social-card" data-mark="♫">
            <div><span className="mono-label">El sonido de NERO</span><h2>Escucha nuestra selección</h2><p>Una playlist para entrar en ambiente, estés donde estés.</p></div>
            <SpotifyPlayer playlistId={spotifyPlaylistId} />
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
