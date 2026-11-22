import { describe, expect, it } from "vitest";
import { APP_FALLBACK_MS, buttonLabel, FALLBACK_MS, isAndroidInstagramBrowser, LOAD_TIMEOUT_MS, needsAppFallback, needsFallback, nextState, spotifyIntentUrl, spotifyPlaylistUrl, tapAction } from "@/lib/selects-player";
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

  it("con el reproductor precargado, el toque reproduce al instante (sin «CARGANDO…»)", () => {
    expect(tapAction(true, "idle", false)).toBe("play"); // primer toque: play() dentro del propio gesto
    expect(tapAction(true, "playing", true)).toBe("pause");
    expect(tapAction(true, "paused", true)).toBe("resume"); // retoma donde iba
    expect(tapAction(true, "paused", false)).toBe("play"); // pausado por el aviso inicial de Spotify, aún sin sonar
  });

  it("si se toca antes de que Spotify termine de precargar, el pedido queda en cola", () => {
    expect(tapAction(false, "idle", false)).toBe("queue");
    expect(tapAction(false, "paused", false)).toBe("queue");
  });

  it("el aviso inicial de Spotify en pausa no cambia el botón", () => {
    expect(nextState("idle", true)).toBe("paused");
    expect(buttonLabel(nextState("idle", true))).toBe("▶ ESCUCHAR SELECCIÓN");
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

describe("Instagram en Android", () => {
  const ua = {
    androidInstagram: "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.39 Mobile Safari/537.36 Instagram 356.0.0.41.101 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; es_PE; 657421232)",
    iosInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.32.104 (iPhone15,3; iOS 18_1; es_PE; es; scale=3.00; 1290x2796; 654321)",
    androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
    desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    androidFacebook: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.39 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.38.109;]",
  };

  it("detecta solo el navegador interno de Instagram en Android", () => {
    expect(isAndroidInstagramBrowser(ua.androidInstagram)).toBe(true);
    expect(isAndroidInstagramBrowser(ua.iosInstagram)).toBe(false);
    expect(isAndroidInstagramBrowser(ua.androidChrome)).toBe(false);
    expect(isAndroidInstagramBrowser(ua.desktop)).toBe(false);
    expect(isAndroidInstagramBrowser(ua.androidFacebook)).toBe(false);
    expect(isAndroidInstagramBrowser("")).toBe(false);
    expect(isAndroidInstagramBrowser(undefined)).toBe(false);
  });

  it("arma el intent de Android con la web como respaldo", () => {
    expect(spotifyPlaylistUrl("2BkMuAAmpBVGdOKYXCsITu")).toBe("https://open.spotify.com/playlist/2BkMuAAmpBVGdOKYXCsITu");
    expect(spotifyIntentUrl("2BkMuAAmpBVGdOKYXCsITu")).toBe(
      "intent://open.spotify.com/playlist/2BkMuAAmpBVGdOKYXCsITu#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=https%3A%2F%2Fopen.spotify.com%2Fplaylist%2F2BkMuAAmpBVGdOKYXCsITu;end",
    );
  });

  it("en Instagram de Android el toque abre la app aunque no haya precarga; fuera de ahí todo sigue igual", () => {
    expect(tapAction(false, "idle", false, true)).toBe("open-app");
    expect(tapAction(true, "idle", false, true)).toBe("open-app");
    expect(tapAction(true, "idle", false, false)).toBe("play");
    expect(tapAction(false, "idle", false, false)).toBe("queue");
    expect(tapAction(true, "playing", true)).toBe("pause");
  });

  it("si en 1,5 s la página sigue visible (la app no se abrió), va a la web; si se ocultó, no", () => {
    expect(APP_FALLBACK_MS).toBe(1500);
    expect(needsAppFallback("visible", false)).toBe(true);
    expect(needsAppFallback("hidden", false)).toBe(false);
    expect(needsAppFallback("visible", true)).toBe(false); // pagehide: la app sí se abrió
  });
});
