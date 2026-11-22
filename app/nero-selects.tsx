"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSpotifyApi, type SpotifyController } from "@/lib/spotify-embed";
import { APP_FALLBACK_MS, buttonLabel, FALLBACK_MS, isAndroidInstagramBrowser, LOAD_TIMEOUT_MS, needsAppFallback, needsFallback, nextState, spotifyIntentUrl, spotifyPlaylistUrl, tapAction, type PlayerState } from "@/lib/selects-player";

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

// NERO SELECTS en el Hero: una sola fila con el botón de escuchar y el enlace a Spotify, bajo el texto del Hero.
// El reproductor de Spotify se precarga al abrir la página (cuando el navegador está libre) y queda montado pero
// oculto, así el toque reproduce al instante. Nunca suena solo: solo con el toque. La barra compacta se ve cuando
// suena (con su atribución) o si salta el respaldo de 2,5 s: en iPhone, Safari puede bloquear el audio del iframe
// oculto y la barra aparece para darle play directo.
// Excepción: en el navegador interno de Instagram en Android el embed no reproduce («Obtener Spotify»). Ahí no se
// precarga nada y el toque abre la playlist en la app de Spotify (intent de Android); si en 1,5 s la página sigue
// visible porque la app no se abrió, se va a open.spotify.com.
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
  const androidInstagram = useRef(false);
  const stopAppFallback = useRef<(() => void) | null>(null);

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

  // Precarga: crea el controlador de Spotify al montar, sin reproducir. En Instagram de Android no se precarga.
  useEffect(() => {
    androidInstagram.current = isAndroidInstagramBrowser(navigator.userAgent);
    if (androidInstagram.current) return () => { stopAppFallback.current?.(); };
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

  // Instagram en Android: abre la app de Spotify. Si en 1,5 s la página sigue visible (no se abrió), va a la web.
  // Si la app sí se abre, la página se oculta (visibilitychange) o se descarga (pagehide) y el respaldo se cancela.
  function openSpotifyApp() {
    stopAppFallback.current?.();
    let leftPage = false;
    const onLeave = () => { if (document.visibilityState === "hidden") { leftPage = true; stop(); } };
    const onPageHide = () => { leftPage = true; stop(); };
    const fallbackTimer = setTimeout(() => {
      stop();
      if (needsAppFallback(document.visibilityState, leftPage)) window.location.href = spotifyPlaylistUrl(playlistId);
    }, APP_FALLBACK_MS);
    function stop() {
      clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("pagehide", onPageHide);
      stopAppFallback.current = null;
    }
    document.addEventListener("visibilitychange", onLeave);
    window.addEventListener("pagehide", onPageHide);
    stopAppFallback.current = stop;
    window.location.href = spotifyIntentUrl(playlistId);
  }

  function toggle() {
    const inAndroidInstagram = androidInstagram.current || isAndroidInstagramBrowser(navigator.userAgent);
    const action = tapAction(ready.current, stateRef.current, hasPlayed.current, inAndroidInstagram);
    if (action === "open-app") { openSpotifyApp(); return; }
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
      <a className="social-action" href={spotifyPlaylistUrl(playlistId)} target="_blank" rel="noreferrer">ABRIR EN SPOTIFY ↗</a>
    </div>
    <div ref={host} className={`nero-selects-embed${showEmbed ? " is-open" : ""}`} aria-hidden={!showEmbed} />
    {fallback && !started && <p className="nero-selects-note">Tu navegador pidió dar play desde Spotify: toca ▶ en la barra.</p>}
  </section>;
}
