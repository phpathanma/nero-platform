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

// Se muestra la barra de Spotify si se pidió reproducir y, pasado el plazo, no está sonando.
export function needsFallback(requestedAt: number | null, state: PlayerState, now: number): boolean {
  return requestedAt !== null && state !== "playing" && now - requestedAt >= FALLBACK_MS;
}
