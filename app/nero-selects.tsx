"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSpotifyApi, type SpotifyController } from "@/lib/spotify-embed";
import { buttonLabel, FALLBACK_MS, LOAD_TIMEOUT_MS, needsFallback, nextState, tapAction, type PlayerState } from "@/lib/selects-player";

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

// NERO SELECTS en el Hero: una sola fila con el botón de escuchar y el enlace a Spotify, bajo el texto del Hero.
// El reproductor de Spotify se precarga al abrir la página (cuando el navegador está libre) y queda montado pero
// oculto, así el toque reproduce al instante. Nunca suena solo: solo con el toque. La barra compacta se ve cuando
// suena (con su atribución) o si salta el respaldo de 2,5 s: en iPhone, Safari puede bloquear el audio del iframe
// oculto y la barra aparece para darle play directo.
export function NeroSelects({ playlistId }: { playlistId: string }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [fallback, setFallback] = useState(false);
  const [started, setStarted] = useState(false);
  const showEmbed = started || fallback;
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);
  const ready = useRef(false);
  const queued = useRef(false);
  const hasPlayed = useRef(false);
  const stateRef = useRef<PlayerState>("idle");
  const requestedAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estables (solo usan refs y setState): el efecto de precarga no se vuelve a ejecutar en cada render.
  const update = useCallback((next: PlayerState) => { stateRef.current = next; setState(next); }, []);

  // Los 2,5 s cuentan desde que se pide reproducir con Spotify listo. Con waitMs mayor sirve de red de seguridad
  // si se tocó antes de que Spotify terminara de cargar y nunca llega a estar listo.
  const armFallback = useCallback((waitMs: number = FALLBACK_MS) => {
    requestedAt.current = Date.now() - (FALLBACK_MS - waitMs);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (needsFallback(requestedAt.current, stateRef.current, Date.now())) {
        setFallback(true);
        if (stateRef.current === "loading") update("paused");
      }
    }, waitMs);
  }, [update]);

  // Precarga: crea el controlador de Spotify al montar, sin reproducir.
  useEffect(() => {
    const target = document.createElement("div");
    host.current?.appendChild(target);
    let cancelled = false;
    const preload = () => {
      loadSpotifyApi().then((api) => {
        if (cancelled) return;
        api.createController(target, { uri: `spotify:playlist:${playlistId}`, width: "100%", height: 80 }, (created) => {
          if (cancelled) { created.destroy(); return; }
          controller.current = created;
          created.addListener("playback_update", ({ data }) => {
            const next = nextState(stateRef.current, data.isPaused);
            if (next === "playing") { requestedAt.current = null; hasPlayed.current = true; setStarted(true); }
            update(next);
          });
          created.addListener("ready", () => {
            ready.current = true;
            // Si tocaron antes de que estuviera listo, se cumple ese pedido ahora.
            if (queued.current) { queued.current = false; created.play(); armFallback(); }
          });
        });
      });
    };
    const w = window as IdleWindow;
    const idleId = w.requestIdleCallback ? w.requestIdleCallback(preload, { timeout: 2000 }) : null;
    const timeoutId = idleId === null ? setTimeout(preload, 600) : null;
    return () => {
      cancelled = true;
      if (idleId !== null) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (timer.current) clearTimeout(timer.current);
      controller.current?.destroy();
      controller.current = null;
      target.remove();
    };
  }, [playlistId, armFallback, update]);

  function toggle() {
    const action = tapAction(ready.current, stateRef.current, hasPlayed.current);
    if (action === "pause") { controller.current?.pause(); return; }
    if (action === "play") { controller.current?.play(); armFallback(); return; }
    if (action === "resume") { controller.current?.resume(); armFallback(); return; }
    if (queued.current) return;
    queued.current = true;
    update("loading");
    armFallback(LOAD_TIMEOUT_MS);
  }

  const playing = state === "playing";
  return <section className={`nero-selects${playing ? " is-playing" : ""}`} aria-label="NERO SELECTS, playlist oficial en Spotify">
    <div className="nero-selects-actions">
      <button className="btn" type="button" onClick={toggle} aria-pressed={playing} disabled={state === "loading"}>{buttonLabel(state)}</button>
      <a className="social-action" href={`https://open.spotify.com/playlist/${playlistId}`} target="_blank" rel="noreferrer">ABRIR EN SPOTIFY ↗</a>
    </div>
    <div ref={host} className={`nero-selects-embed${showEmbed ? " is-open" : ""}`} aria-hidden={!showEmbed} />
    {fallback && !started && <p className="nero-selects-note">Tu navegador pidió dar play desde Spotify: toca ▶ en la barra.</p>}
  </section>;
}
