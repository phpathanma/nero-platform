import { describe, expect, it } from "vitest";
import { eventKicker, flyerKind, OG_SIZE, shortText, titleSize } from "@/lib/og";

describe("imágenes Open Graph", () => {
  it("son de 1200×630", () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
  });

  it("solo usa flyers PNG o JPEG (next/og no lee WebP ni AVIF)", () => {
    expect(flyerKind("image/jpeg")).toBe("image/jpeg");
    expect(flyerKind("image/png; charset=binary")).toBe("image/png");
    expect(flyerKind("IMAGE/JPG")).toBe("image/jpeg");
    expect(flyerKind("image/webp")).toBeNull();
    expect(flyerKind("image/avif")).toBeNull();
    expect(flyerKind(null)).toBeNull();
  });

  it("achica el título según su largo", () => {
    expect(titleSize("La Casita")).toBe(84);
    expect(titleSize("WNS Showcase × NERO")).toBe(68);
    expect(titleSize("BRESH USMP · Fiesta Fin de Ciclo")).toBe(54);
    expect(titleSize("Festival Internacional de Música Electrónica Underground")).toBe(44);
  });
});

describe("textos de la tarjeta de evento", () => {
  it("usa el tag solo si es corto; si no, «Próximo evento»; y siempre avisa si terminó", () => {
    expect(eventKicker("published", "After USMP")).toBe("After USMP");
    expect(eventKicker("published", "Fiesta fin de ciclo · Flor de Caña · Red Bull · Four Loko · Kick the Rules")).toBe("Próximo evento");
    expect(eventKicker("published", "")).toBe("Próximo evento");
    expect(eventKicker("past", "After USMP")).toBe("Evento finalizado");
  });

  it("corta textos largos en una palabra y agrega «…»", () => {
    expect(shortText("Quinta Monasterio, Pimentel", 64)).toBe("Quinta Monasterio, Pimentel");
    const venue = shortText("Mz. C | Lt. 40 | Parque Industrial / La Pradera (A una cuadra antes de la USMP · Ex-Dembow), Chiclayo", 64);
    expect(venue.length).toBeLessThanOrEqual(64);
    expect(venue.endsWith("…")).toBe(true);
    expect(venue).not.toMatch(/[\s|/·,-]…$/);
  });
});
