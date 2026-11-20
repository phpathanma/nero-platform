import { describe, expect, it } from "vitest";
import { FREE_PASS_CONDITION, FREE_PASS_NAME } from "@/lib/free-pass";
import { buildTicketPdf, PDF_MARGIN, PDF_PAGE, PDF_QR, pdfText } from "@/lib/tickets/pdf";

const token = "a".repeat(64);
const ticket = { status: "valid" as const, name: "maría josé de la cruz", event: "NERO · Viernes de cierre de temporada", time: "22:00:00", venue: "Barranco", city: "Lima", tier: FREE_PASS_NAME };

describe("PDF de la entrada Free con Consumo", () => {
  it("conserva las tildes y el punto medio del pase", () => {
    expect(pdfText(FREE_PASS_CONDITION)).toBe(FREE_PASS_CONDITION);
    expect(pdfText(FREE_PASS_NAME)).toBe(FREE_PASS_NAME);
  });

  it("escribe la condición completa debajo del QR, en varias líneas y sin salirse de la página", async () => {
    const { texts } = await buildTicketPdf({ ticket, token, dateText: "20 de noviembre de 2026", condition: FREE_PASS_CONDITION });
    const condition = texts.filter((t) => t.y < PDF_QR.y && FREE_PASS_CONDITION.includes(t.text));
    expect(condition.length).toBeGreaterThan(1);
    expect(condition.map((t) => t.text).join(" ")).toBe(FREE_PASS_CONDITION);
    for (const t of texts) {
      expect(t.x).toBeGreaterThanOrEqual(PDF_MARGIN - 0.01);
      expect(t.x + t.width).toBeLessThanOrEqual(PDF_PAGE.width - PDF_MARGIN + 0.01);
      expect(t.y).toBeGreaterThan(PDF_MARGIN);
      // Ningún texto se dibuja sobre el QR.
      expect(t.y + t.size <= PDF_QR.y || t.y >= PDF_QR.y + PDF_QR.size).toBe(true);
    }
    // El pie va debajo de la última línea de la condición, sin pisarla.
    const footer = texts.find((t) => t.text === "PRESENTA ESTE QR EN LA PUERTA")!;
    expect(footer.y + footer.size).toBeLessThan(Math.min(...condition.map((t) => t.y)));
  });

  it("muestra el nombre completo del pase encima del QR", async () => {
    const { texts } = await buildTicketPdf({ ticket, token, dateText: "20 de noviembre de 2026", condition: FREE_PASS_CONDITION });
    const tier = texts.filter((t) => t.y > PDF_QR.y + PDF_QR.size && FREE_PASS_NAME.includes(t.text));
    expect(tier.map((t) => t.text).join(" ")).toBe(FREE_PASS_NAME);
  });

  it("no añade la condición a las cortesías", async () => {
    const { texts } = await buildTicketPdf({ ticket: { ...ticket, tier: "Cortesía" }, token, dateText: "20 de noviembre de 2026" });
    expect(texts.some((t) => t.text.includes("consumo"))).toBe(false);
  });
});
