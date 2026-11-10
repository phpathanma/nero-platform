"use client";

import { useState } from "react";
import type { MusicEmbed } from "@/lib/music";

// El reproductor se carga solo cuando la persona pulsa el botón; nunca suena al abrir la página.
export function EventMusic({ embed, url, title }: { embed: MusicEmbed; url: string; title: string }) {
  const [open, setOpen] = useState(false);
  return <div className="event-music">
    {open
      ? <iframe title={`${title} en ${embed.provider}`} src={embed.embedUrl} height={embed.height} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
      : <button className="btn" type="button" onClick={() => setOpen(true)}>ESCUCHAR <span aria-hidden="true">▶</span></button>}
    <a className="social-action" href={url} target="_blank" rel="noreferrer">ABRIR EN {embed.provider.toUpperCase()} ↗</a>
  </div>;
}
