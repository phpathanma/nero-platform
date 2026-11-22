// Estado del botón NERO SELECTS. Si tras pedir reproducir Spotify no confirma que suena en FALLBACK_MS
// (pasa en iPhone: Safari bloquea el audio de un iframe oculto), se muestra la barra compacta de Spotify.

export const FALLBACK_MS = 2500;
// Red de seguridad: si Spotify no termina de cargar en este tiempo tras el toque, también se muestra su barra.
export const LOAD_TIMEOUT_MS = 8000;

export type PlayerState = "idle" | "loading" | "playing" | "paused";

export function buttonLabel(state: PlayerState): string {
  if (state === "loading") return "CARGANDO…";
  if (state === "playing") return "❚❚ PAUSAR";
  return "▶ ESCUCHAR SELECCIÓN";
}

// Al llegar playback_update: suena → "playing"; en pausa → "paused" (salvo que aún no haya empezado).
export function nextState(current: PlayerState, isPaused: boolean): PlayerState {
  if (!isPaused) return "playing";
  return current === "loading" ? "loading" : "paused";
}

// Qué hace un toque del botón. Con el reproductor ya precargado, play/resume se llama dentro del propio toque
// (así suena al instante y iPhone tiene más chance de aceptarlo). Si se toca antes de que Spotify esté listo,
// el pedido queda en cola y se reproduce apenas cargue.
export type TapAction = "pause" | "play" | "resume" | "queue" | "open-app";

export function tapAction(ready: boolean, state: PlayerState, hasPlayed: boolean, androidInstagram = false): TapAction {
  if (androidInstagram) return "open-app";
  if (!ready) return "queue";
  if (state === "playing") return "pause";
  return hasPlayed ? "resume" : "play";
}

// En el navegador interno de Instagram en Android, el embed de Spotify no reproduce (muestra «Obtener Spotify»).
// Ahí no se precarga el reproductor y el toque abre la app de Spotify. iOS (incluido Instagram) no entra aquí.
export function isAndroidInstagramBrowser(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  return /android/i.test(ua) && /instagram/i.test(ua);
}

export function spotifyPlaylistUrl(playlistId: string): string {
  return `https://open.spotify.com/playlist/${playlistId}`;
}

// Intent de Android: abre la playlist en la app de Spotify; si no está instalada, el propio Android va a la web.
export function spotifyIntentUrl(playlistId: string): string {
  return `intent://open.spotify.com/playlist/${playlistId}#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=${encodeURIComponent(spotifyPlaylistUrl(playlistId))};end`;
}

// Red de seguridad: si tras este tiempo la página sigue visible (la app no se abrió), se va a open.spotify.com.
export const APP_FALLBACK_MS = 1500;

// leftPage: se ocultó la página o llegó pagehide (la app de Spotify sí se abrió).
export function needsAppFallback(visibilityState: string, leftPage: boolean): boolean {
  return visibilityState === "visible" && !leftPage;
}

// Se muestra la barra de Spotify si se pidió reproducir y, pasado el plazo, no está sonando.
export function needsFallback(requestedAt: number | null, state: PlayerState, now: number): boolean {
  return requestedAt !== null && state !== "playing" && now - requestedAt >= FALLBACK_MS;
}
