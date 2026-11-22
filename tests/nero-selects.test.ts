import { describe, expect, it } from "vitest";
import { buttonLabel, FALLBACK_MS, LOAD_TIMEOUT_MS, needsFallback, nextState } from "@/lib/selects-player";
import { spotifyPlaylistId } from "@/lib/social";

describe("NERO SELECTS", () => {
  it("usa la playlist oficial de NERO", () => {
    expect(spotifyPlaylistId).toBe("2BkMuAAmpBVGdOKYXCsITu");
  });

  it("el botón muestra el estado real del reproductor", () => {
    expect(buttonLabel("idle")).toBe("▶ ESCUCHAR SELECCIÓN");
    expect(buttonLabel("loading")).toBe("CARGANDO…");
    expect(buttonLabel("playing")).toBe("❚❚ PAUSAR");
    expect(buttonLabel("paused")).toBe("▶ ESCUCHAR SELECCIÓN");
  });

  it("solo pasa a sonando cuando Spotify lo confirma", () => {
    expect(nextState("loading", true)).toBe("loading"); // aviso inicial en pausa mientras carga
    expect(nextState("loading", false)).toBe("playing");
    expect(nextState("playing", true)).toBe("paused");
    expect(nextState("paused", false)).toBe("playing");
  });

  it("muestra la barra de Spotify a los 2,5 s si el audio no arrancó (iPhone), nunca si ya suena", () => {
    expect(FALLBACK_MS).toBe(2500);
    expect(LOAD_TIMEOUT_MS).toBeGreaterThan(FALLBACK_MS);
    expect(needsFallback(1000, "loading", 1000 + 2499)).toBe(false);
    expect(needsFallback(1000, "loading", 1000 + 2500)).toBe(true);
    expect(needsFallback(1000, "paused", 1000 + 3000)).toBe(true);
    expect(needsFallback(1000, "playing", 1000 + 9000)).toBe(false);
    expect(needsFallback(null, "idle", 9000)).toBe(false);
  });
});
