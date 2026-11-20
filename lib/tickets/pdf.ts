import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { formatEventTime, titleCaseName } from "@/lib/format";

export type PdfTicket = { status: "valid" | "used"; name: string; event: string; time: string; venue: string; city: string; tier: string };

// Texto dibujado en el PDF, con su caja: permite comprobar en los tests que nada se sale de la página ni pisa el QR.
export type DrawnText = { text: string; x: number; y: number; size: number; width: number };

export const PDF_PAGE = { width: 340, height: 540 } as const;
export const PDF_MARGIN = 24;
export const PDF_TEXT_WIDTH = PDF_PAGE.width - PDF_MARGIN * 2;
export const PDF_QR = { x: 87, y: 132, size: 166 } as const;
const PDF_LINE_HEIGHT = 1.15;

// Helvetica estándar solo cubre WinAnsi: se conservan ASCII, las vocales con tilde o diéresis, la «ñ» y el «·».
// Cualquier otro carácter pierde su diacrítico (ç → c) o se cambia por un espacio.
const PDF_KEEP = /[\x20-\x7EáéíóúüñÁÉÍÓÚÜÑ·]/;
export function pdfText(value: string) {
  return Array.from(value.normalize("NFC"), (char) => PDF_KEEP.test(char) ? char : char.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, " ")).join("");
}

type PdfFont = { widthOfTextAtSize: (text: string, size: number) => number };

// Reparte el texto en líneas que caben en maxWidth sin cortarlo; una palabra más ancha que la caja se parte por caracteres.
export function fitLines(text: string, font: PdfFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > 1 && font.widthOfTextAtSize(rest, size) > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
      if (line) { lines.push(line); line = ""; }
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    const next = line ? `${line} ${rest}` : rest;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(line); line = rest; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Usa el primer tamaño con el que el texto entra en maxLines; si ninguno alcanza, el más pequeño con todas sus líneas (nunca trunca).
export function fitText(text: string, font: PdfFont, sizes: number[], maxWidth: number, maxLines: number) {
  for (const size of sizes) {
    const lines = fitLines(text, font, size, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  return { size, lines: fitLines(text, font, size, maxWidth) };
}

// Dibuja la entrada en PDF. `condition` (solo pases free_access) se escribe debajo del QR con saltos de línea automáticos.
export async function buildTicketPdf({ ticket, token, dateText, condition }: { ticket: PdfTicket; token: string; dateText: string; condition?: string }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const acid = rgb(0.83, 1, 0.25);
  const texts: DrawnText[] = [];
  const draw = (text: string, x: number, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) => {
    page.drawText(text, { x, y, size, font, color });
    texts.push({ text, x, y, size, width: font.widthOfTextAtSize(text, size) });
  };

  page.drawRectangle({ x: 0, y: 0, width: PDF_PAGE.width, height: PDF_PAGE.height, color: rgb(0.035, 0.035, 0.035) });
  page.drawRectangle({ x: 0, y: 512, width: PDF_PAGE.width, height: 28, color: acid });
  draw("N E R O   /   T I C K E T S", PDF_MARGIN, 521, 10, bold, rgb(0.04, 0.04, 0.04));
  // Nombre del evento: hasta 2 líneas, reduciendo el tamaño antes de seguir bajando.
  const eventFit = fitText(pdfText(ticket.event), bold, [19, 16, 14], PDF_TEXT_WIDTH, 2);
  const eventLead = eventFit.size * PDF_LINE_HEIGHT;
  eventFit.lines.forEach((line, i) => draw(line, PDF_MARGIN, 477 - i * eventLead, eventFit.size, bold, rgb(0.96, 0.96, 0.93)));
  const metaY = 477 - (eventFit.lines.length - 1) * eventLead - 22;
  const gray = rgb(0.7, 0.7, 0.68);
  draw(fitLines(pdfText(`${dateText} · ${formatEventTime(ticket.time)}`), regular, 10, PDF_TEXT_WIDTH)[0] ?? "", PDF_MARGIN, metaY, 10, regular, gray);
  draw(fitLines(pdfText(`${ticket.venue}, ${ticket.city}`), regular, 10, PDF_TEXT_WIDTH)[0] ?? "", PDF_MARGIN, metaY - 18, 10, regular, gray);
  page.drawRectangle({ x: PDF_MARGIN, y: 394, width: PDF_TEXT_WIDTH, height: 1, color: rgb(0.2, 0.2, 0.19) });

  // Tarifa completa (hasta 3 líneas) y titular debajo, siempre por encima del QR.
  const nameFit = fitText(pdfText(`A nombre de: ${titleCaseName(ticket.name)}`), regular, [10, 9], PDF_TEXT_WIDTH, 2);
  const nameLead = nameFit.size * 1.2;
  const tierText = pdfText(ticket.tier);
  let tierFit = { size: 12, lines: fitLines(tierText, bold, 12, PDF_TEXT_WIDTH) };
  for (const size of [17, 15, 13, 12]) {
    const lines = fitLines(tierText, bold, size, PDF_TEXT_WIDTH);
    const lastNameY = 368 - (lines.length - 1) * size * PDF_LINE_HEIGHT - 20 - (nameFit.lines.length - 1) * nameLead;
    if (lines.length <= 3 && lastNameY >= PDF_QR.y + PDF_QR.size + 10) { tierFit = { size, lines }; break; }
  }
  const tierLead = tierFit.size * PDF_LINE_HEIGHT;
  tierFit.lines.forEach((line, i) => draw(line, PDF_MARGIN, 368 - i * tierLead, tierFit.size, bold, acid));
  const nameY = 368 - (tierFit.lines.length - 1) * tierLead - 20;
  nameFit.lines.forEach((line, i) => draw(line, PDF_MARGIN, nameY - i * nameLead, nameFit.size, regular, rgb(0.9, 0.9, 0.87)));

  const qr = await QRCode.toDataURL(token, { errorCorrectionLevel: "H", margin: 2, width: 600, color: { dark: "#080808", light: "#ffffff" } });
  page.drawImage(await pdf.embedPng(qr), { x: PDF_QR.x, y: PDF_QR.y, width: PDF_QR.size, height: PDF_QR.size });

  // Debajo del QR: condición del pase (hasta 3 líneas, centrada) y luego el aviso de acceso.
  let footerY = 105;
  if (condition) {
    const conditionFit = fitText(pdfText(condition), bold, [10, 9, 8], PDF_TEXT_WIDTH, 3);
    const conditionLead = conditionFit.size * 1.25;
    const firstY = PDF_QR.y - 8 - conditionFit.size;
    conditionFit.lines.forEach((line, i) => {
      const width = bold.widthOfTextAtSize(line, conditionFit.size);
      draw(line, (PDF_PAGE.width - width) / 2, firstY - i * conditionLead, conditionFit.size, bold, acid);
    });
    footerY = firstY - (conditionFit.lines.length - 1) * conditionLead - 22;
  }
  const used = ticket.status === "used";
  draw(used ? "ENTRADA YA UTILIZADA" : "PRESENTA ESTE QR EN LA PUERTA", PDF_MARGIN, footerY, 10, bold, used ? rgb(1, 0.5, 0.4) : rgb(0.9, 0.9, 0.87));
  draw("El código permite un solo acceso. No compartas esta entrada.", PDF_MARGIN, footerY - 21, 8, regular, rgb(0.62, 0.62, 0.6));

  return { bytes: await pdf.save(), texts };
}
