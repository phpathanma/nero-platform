import { describe, expect, it } from "vitest";
import { musicEmbed } from "@/lib/music";

describe("enlaces de música por evento", () => {
  it("incrusta playlists y pistas de Spotify", () => {
    expect(musicEmbed("https://open.spotify.com/playlist/2BkMuAAmpBVGdOKYXCsITu?si=abc")).toMatchObject({ provider: "Spotify", embedUrl: "https://open.spotify.com/embed/playlist/2BkMuAAmpBVGdOKYXCsITu?theme=0", height: 352 });
    expect(musicEmbed("https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC")).toMatchObject({ provider: "Spotify", height: 152 });
  });

  it("incrusta sets de SoundCloud", () => {
    const embed = musicEmbed("https://soundcloud.com/artista/set-en-vivo?utm=1");
    expect(embed?.provider).toBe("SoundCloud");
    expect(embed?.embedUrl).toContain(encodeURIComponent("https://soundcloud.com/artista/set-en-vivo"));
  });

  it("incrusta vídeos de YouTube en sus dos formatos de enlace", () => {
    expect(musicEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1");
    expect(musicEmbed("https://youtu.be/dQw4w9WgXcQ")?.provider).toBe("YouTube");
  });

  it("rechaza otros sitios, enlaces cortos e inseguros", () => {
    expect(musicEmbed("https://ejemplo.com/set")).toBeNull();
    expect(musicEmbed("http://open.spotify.com/playlist/abc")).toBeNull();
    expect(musicEmbed("https://soundcloud.com/artista")).toBeNull();
    expect(musicEmbed("javascript:alert(1)")).toBeNull();
    expect(musicEmbed("no es un enlace")).toBeNull();
  });
});
