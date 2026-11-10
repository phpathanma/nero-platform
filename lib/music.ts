export type MusicEmbed = { provider: "Spotify" | "SoundCloud" | "YouTube"; embedUrl: string; height: number };

// Convierte un enlace público de Spotify, SoundCloud o YouTube en su reproductor incrustable.
// Devuelve null si el enlace no es de uno de esos servicios o no se puede incrustar.
export function musicEmbed(value: string): MusicEmbed | null {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "open.spotify.com") {
    const match = /^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(url.pathname);
    if (!match) return null;
    const compact = match[1] === "track" || match[1] === "episode";
    return { provider: "Spotify", embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`, height: compact ? 152 : 352 };
  }

  if (host === "soundcloud.com") {
    if (!/^\/[^/]+\/[^/]+/.test(url.pathname)) return null;
    const target = encodeURIComponent(`https://soundcloud.com${url.pathname}`);
    return { provider: "SoundCloud", embedUrl: `https://w.soundcloud.com/player/?url=${target}&color=%23f4f4f2&auto_play=true&hide_related=true&show_comments=false&visual=false`, height: 166 };
  }

  const youtubeId = host === "youtu.be" ? url.pathname.slice(1)
    : host === "youtube.com" || host === "music.youtube.com" ? url.searchParams.get("v") ?? "" : "";
  if (/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    return { provider: "YouTube", embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`, height: 315 };
  }
  return null;
}
