"use client";

import { useEffect, useRef, useState } from "react";

type SpotifyController = { play: () => void; addListener: (event: "ready", listener: () => void) => void; destroy: () => void };
type SpotifyApi = { createController: (element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void) => void };

declare global {
  interface Window { onSpotifyIframeApiReady?: (api: SpotifyApi) => void; neroSpotifyApi?: SpotifyApi }
}

// El reproductor solo se carga cuando la persona lo pide; nunca suena solo al abrir la página.
export function SpotifyPlayer({ playlistId }: { playlistId: string }) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !holder.current) return;
    let controller: SpotifyController | null = null;
    let cancelled = false;
    const target = document.createElement("div");
    holder.current.appendChild(target);

    const mount = (api: SpotifyApi) => {
      if (cancelled) return;
      api.createController(target, { uri: `spotify:playlist:${playlistId}`, width: "100%", height: 152 }, (created) => {
        controller = created;
        // Arranca tras el clic del usuario; si el navegador no lo permite, queda el botón de reproducir del propio reproductor.
        created.addListener("ready", () => created.play());
      });
    };

    if (window.neroSpotifyApi) mount(window.neroSpotifyApi);
    else {
      window.onSpotifyIframeApiReady = (api) => { window.neroSpotifyApi = api; mount(api); };
      if (!document.querySelector("script[data-spotify-api]")) {
        const script = document.createElement("script");
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        script.dataset.spotifyApi = "true";
        document.body.appendChild(script);
      }
    }
    return () => { cancelled = true; controller?.destroy(); target.remove(); };
  }, [open, playlistId]);

  return <div className="spotify-player">
    {!open && <button className="btn" type="button" onClick={() => setOpen(true)}>ESCUCHAR NERO SELECTS <span aria-hidden="true">▶</span></button>}
    <div ref={holder} className={open ? "spotify-holder" : undefined} />
    <a className="social-action" href={`https://open.spotify.com/playlist/${playlistId}`} target="_blank" rel="noreferrer">ABRIR EN SPOTIFY ↗</a>
  </div>;
}
