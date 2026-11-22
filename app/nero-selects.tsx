"use client";

import { useEffect, useRef, useState } from "react";
import { loadSpotifyApi, type SpotifyController } from "@/lib/spotify-embed";
import { buttonLabel, FALLBACK_MS, LOAD_TIMEOUT_MS, needsFallback, nextState, type PlayerState } from "@/lib/selects-player";

// NERO SELECTS en el Hero, estilo lanzamiento y sin caja: portada, etiqueta y dos acciones.
// Spotify solo se carga al primer toque y su reproductor queda montado pero oculto. Si el navegador no deja sonar
// el iframe oculto (iPhone), aparece la barra compacta de Spotify para darle play directo.
export function NeroSelects({ playlistId }: { playlistId: string }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [showEmbed, setShowEmbed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);
  const stateRef = useRef<PlayerState>("idle");
  const requestedAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (next: PlayerState) => { stateRef.current = next; setState(next); };

  // Los 2,5 s cuentan desde que se pide reproducir con Spotify ya listo (no desde el toque: cargar Spotify tarda más).
  // Con waitMs mayor sirve de red de seguridad si Spotify nunca termina de cargar.
  const armFallback = (waitMs: number = FALLBACK_MS) => {
    requestedAt.current = Date.now() - (FALLBACK_MS - waitMs);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (needsFallback(requestedAt.current, stateRef.current, Date.now())) {
        setShowEmbed(true);
        if (stateRef.current === "loading") update("paused");
      }
    }, waitMs);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.destroy();
  }, []);

  function toggle() {
    if (controller.current) {
      if (stateRef.current === "playing") { controller.current.pause(); return; }
      controller.current.resume();
      armFallback();
      return;
    }
    if (stateRef.current === "loading" || !host.current) return;
    update("loading");
    armFallback(LOAD_TIMEOUT_MS);
    const target = document.createElement("div");
    host.current.appendChild(target);
    loadSpotifyApi().then((api) => {
      api.createController(target, { uri: `spotify:playlist:${playlistId}`, width: "100%", height: 80 }, (created) => {
        controller.current = created;
        created.addListener("playback_update", ({ data }) => {
          const next = nextState(stateRef.current, data.isPaused);
          if (next === "playing") requestedAt.current = null;
          update(next);
        });
        created.addListener("ready", () => { created.play(); armFallback(); });
      });
    });
  }

  const playing = state === "playing";
  return <section className={`nero-selects${playing ? " is-playing" : ""}`} aria-label="NERO SELECTS, playlist oficial en Spotify">
    {/* eslint-disable-next-line @next/next/no-img-element -- portada local fija de 512px, sin optimización necesaria */}
    <img className="nero-selects-cover" src="/icon-512.png" alt="Portada de NERO SELECTS" width={168} height={168} />
    <div className="nero-selects-body">
      <span className="nero-selects-tag"><span aria-hidden="true">●</span> NERO SELECTS · OFICIAL</span>
      <div className="nero-selects-actions">
        <button className="btn" type="button" onClick={toggle} aria-pressed={playing} disabled={state === "loading"}>{buttonLabel(state)}</button>
        <a className="btn secondary" href={`https://open.spotify.com/playlist/${playlistId}`} target="_blank" rel="noreferrer">ABRIR EN SPOTIFY <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <div ref={host} className={`nero-selects-embed${showEmbed ? " is-open" : ""}`} aria-hidden={!showEmbed} />
    {showEmbed && <p className="nero-selects-note">Tu navegador pidió dar play desde Spotify: toca ▶ en la barra.</p>}
  </section>;
}
