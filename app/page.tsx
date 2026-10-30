import Link from "next/link";
import { getEvents } from "@/lib/events";
import { instagramUrl, spotifyPlaylistId } from "@/lib/social";
import pastStyles from "./past-events.module.css";

export default async function HomePage() {
  const all = await getEvents();
  const upcoming = all.filter((event) => event.status === "published");
  const past = all.filter((event) => event.status === "past").reverse();
  const featured = upcoming[0];

  return (
    <>
      <nav className="nav" aria-label="Navegación principal">
        <Link className="logo" href="/" aria-label="NERO, inicio">NERO</Link>
        <div className="navlinks">
          <a href="#eventos">EVENTOS</a>
          <a href="#nosotros">NOSOTROS</a>
          <a href="#pasados">PASADOS</a>
          <a href="#siguenos">SÍGUENOS</a>
        </div>
      </nav>

      <header className="hero">
        <span className="hero-kicker">Electronic music experiences · Perú</span>
        <h1>NERO</h1>
        <p>Noches de house y techno. Sonido, luz y energía para encontrarnos en la pista.</p>
        <a className="btn" href="#eventos">DESCUBRIR EVENTOS <span aria-hidden="true">↘</span></a>
        <span className="hero-stamp" aria-hidden="true">CHICLAYO · LIMA · PERÚ</span>
      </header>

      <main className="wrap">
        <section id="eventos" className="section">
          <div className="section-heading">
            <div><span className="eyebrow">El próximo encuentro</span><h2>Próximos eventos</h2></div>
            <span className="muted">01 — {String(upcoming.length).padStart(2, "0")}</span>
          </div>
          {!featured && <div className="empty">Pronto anunciaremos nuevas fechas. <a className="social-action" href={instagramUrl} target="_blank" rel="noreferrer">Síguenos en Instagram ↗</a></div>}
          {featured && (
            <Link href={`/eventos/${featured.slug}`} className="feature" style={{ "--event-bg": featured.background, "--event-accent": featured.accent } as React.CSSProperties}>
              <div className="poster">{featured.name}</div>
              <div className="event-info">
                <span className="tag">{featured.tag}</span>
                <h3>{featured.name}</h3>
                <p className="muted event-meta">{featured.date} · {featured.time}<br />{featured.venue}, {featured.city}</p>
                <span className="btn">VER EVENTO Y ENTRADAS <span aria-hidden="true">↗</span></span>
              </div>
            </Link>
          )}
          {upcoming.length > 1 && <div className="grid">{upcoming.slice(1).map((event) => (
            <Link className="card" key={event.id} href={`/eventos/${event.slug}`} style={{ "--event-bg": event.background, "--event-accent": event.accent } as React.CSSProperties}>
              <div className="card-poster">{event.name}</div><span className="tag">{event.tag}</span><h3>{event.name}</h3>
              <small className="muted">{event.date} · {event.time}<br />{event.city}</small><span className="btn">VER EVENTO ↗</span>
            </Link>
          ))}</div>}
        </section>

        <section id="nosotros" className="section">
          <span className="eyebrow">Ritmo, comunidad, movimiento</span>
          <h2>La noche nos conecta.</h2>
          <p className="section-intro">NERO es una plataforma y productora de experiencias de música electrónica en Perú. Creamos noches de house y techno que conectan artistas, espacios y comunidad.</p>
        </section>

        <section id="pasados" className="section">
          <div className="section-heading"><div><span className="eyebrow">Memorias de la pista</span><h2>Eventos pasados</h2></div></div>
          {past.length ? <div className={`grid ${pastStyles.pastGrid}`}>{past.map((event) => (
            <Link className={`card ${pastStyles.pastCard}`} key={event.id} href={`/eventos/${event.slug}`} style={{ "--event-bg": event.background, "--event-accent": event.accent } as React.CSSProperties}>
              <div className="card-poster">{event.name}</div><span className="tag">{event.tag}</span><h3>{event.name}</h3><small className="muted">{event.date} · {event.city}</small><span className="btn secondary">VER RESUMEN ↗</span>
            </Link>
          ))}</div> : <div className="empty">Pronto compartiremos recuerdos de nuestras noches.</div>}
        </section>

        <section id="siguenos" className="social-section" aria-label="Conecta con NERO">
          <article className="social-card" data-mark="@">
            <div><span className="eyebrow">Detrás de la noche</span><h2>Síguenos en Instagram</h2><p>Anuncios, artistas y momentos desde la pista. La conversación continúa en Instagram.</p></div>
            <a className="social-action" href={instagramUrl} target="_blank" rel="noreferrer">IR A INSTAGRAM ↗</a>
          </article>
          <article className="social-card spotify" data-mark="♫">
            <div><span className="eyebrow">El sonido de NERO</span><h2>Escucha nuestra selección</h2><p>Una playlist para entrar en ambiente, estés donde estés.</p>
              <a className="social-action" href={spotifyPlaylistId ? `https://open.spotify.com/playlist/${spotifyPlaylistId}` : "https://open.spotify.com/search/NERO"} target="_blank" rel="noreferrer">ABRIR EN SPOTIFY ↗</a>
            </div>
            {spotifyPlaylistId ? (
              <iframe className="spotify-frame" title="Playlist de NERO en Spotify" src={`https://open.spotify.com/embed/playlist/${spotifyPlaylistId}?utm_source=generator&theme=0`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
            ) : (
              <div className="spotify-placeholder"><strong>NERO SELECTS</strong><p>El reproductor aparecerá aquí al añadir el ID de nuestra playlist.</p><span className="muted" style={{ fontSize: 11 }}>Configura NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID</span></div>
            )}
          </article>
        </section>
      </main>
      <footer className="footer">© 2026 NERO · Electronic music experiences · <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a></footer>
    </>
  );
}
