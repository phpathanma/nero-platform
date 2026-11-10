import { describe, expect, it } from "vitest";
import { eventDateParts, formatEventDate, formatEventTime, formatPrice, isRunningLow } from "@/lib/format";

describe("formato de fechas y precios", () => {
  it("descompone una fecha de calendario sin desfase horario", () => {
    expect(eventDateParts("2026-12-19")).toEqual({ day: "19", month: "dic", weekday: "sáb", year: "2026" });
    expect(formatEventDate("2026-12-19")).toBe("Sáb 19 dic 2026");
    expect(formatEventDate("2027-01-01")).toBe("Vie 1 ene 2027");
  });

  it("devuelve el texto original si la fecha no es válida", () => {
    expect(eventDateParts("2026-02-31")).toBeNull();
    expect(formatEventDate("Por confirmar")).toBe("Por confirmar");
  });

  it("muestra la hora en formato de 12 horas", () => {
    expect(formatEventTime("22:00:00")).toBe("10:00 p. m.");
    expect(formatEventTime("00:30")).toBe("12:30 a. m.");
    expect(formatEventTime("12:05:00")).toBe("12:05 p. m.");
    expect(formatEventTime("pronto")).toBe("pronto");
  });

  it("formatea precios", () => {
    expect(formatPrice(0)).toBe("GRATIS");
    expect(formatPrice(50)).toBe("S/ 50");
  });

  it("avisa de últimas entradas solo con poco cupo restante", () => {
    expect(isRunningLow(100, 90)).toBe(true);
    expect(isRunningLow(100, 50)).toBe(false);
    expect(isRunningLow(100, 100)).toBe(false);
    expect(isRunningLow(0, 0)).toBe(false);
  });
});
