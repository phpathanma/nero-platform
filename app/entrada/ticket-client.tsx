"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Ticket = { status: "valid" | "used"; source: string; name: string; event: string; date: string; time: string; venue: string; city: string; tier: string };

function dateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(value);
}

function pdfText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
}

export function TicketClient() {
  const [token, setToken] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const secret = window.location.hash.slice(1);
    if (!/^[a-f0-9]{64}$/.test(secret)) { setError("Abre el enlace privado que recibiste para ver tu entrada."); setLoading(false); return; }
    setToken(secret);
    fetch("/api/tickets/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: secret }), cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "No se pudo cargar la entrada."); setTicket(result.ticket as Ticket); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la entrada."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(token, { errorCorrectionLevel: "H", margin: 2, width: 600, color: { dark: "#080808", light: "#ffffff" } }))
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setError("No se pudo preparar el código QR."); });
    return () => { active = false; };
  }, [token]);

  async function downloadPdf() {
    if (!ticket || !token) return;
    setDownloading(true);
    try {
      const [{ PDFDocument, StandardFonts, rgb }, { default: QRCode }] = await Promise.all([import("pdf-lib"), import("qrcode")]);
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([340, 540]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const acid = rgb(0.83, 1, 0.25);
      page.drawRectangle({ x: 0, y: 0, width: 340, height: 540, color: rgb(0.035, 0.035, 0.035) });
      page.drawRectangle({ x: 0, y: 512, width: 340, height: 28, color: acid });
      page.drawText("N E R O   /   T I C K E T S", { x: 24, y: 521, size: 10, font: bold, color: rgb(0.04, 0.04, 0.04) });
      page.drawText(pdfText(ticket.event).slice(0, 42), { x: 24, y: 477, size: 19, font: bold, color: rgb(0.96, 0.96, 0.93), maxWidth: 292 });
      page.drawText(pdfText(`${dateLabel(ticket.date)}  ·  ${ticket.time}`), { x: 24, y: 455, size: 10, font: regular, color: rgb(0.7, 0.7, 0.68) });
      page.drawText(pdfText(`${ticket.venue}, ${ticket.city}`).slice(0, 54), { x: 24, y: 437, size: 10, font: regular, color: rgb(0.7, 0.7, 0.68), maxWidth: 292 });
      page.drawRectangle({ x: 24, y: 394, width: 292, height: 1, color: rgb(0.2, 0.2, 0.19) });
      page.drawText(pdfText(ticket.tier).slice(0, 36), { x: 24, y: 365, size: 17, font: bold, color: acid, maxWidth: 292 });
      page.drawText(pdfText(`A nombre de: ${ticket.name}`).slice(0, 54), { x: 24, y: 345, size: 10, font: regular, color: rgb(0.9, 0.9, 0.87), maxWidth: 292 });
      const qr = await QRCode.toDataURL(token, { errorCorrectionLevel: "H", margin: 2, width: 600, color: { dark: "#080808", light: "#ffffff" } });
      const qrPdfImage = await pdf.embedPng(qr);
      page.drawImage(qrPdfImage, { x: 87, y: 132, width: 166, height: 166 });
      page.drawText(ticket.status === "used" ? "ENTRADA YA UTILIZADA" : "PRESENTA ESTE QR EN LA PUERTA", { x: 24, y: 105, size: 10, font: bold, color: ticket.status === "used" ? rgb(1, 0.5, 0.4) : rgb(0.9, 0.9, 0.87), maxWidth: 292 });
      page.drawText("El código permite un solo acceso. No compartas esta entrada.", { x: 24, y: 84, size: 8, font: regular, color: rgb(0.62, 0.62, 0.6), maxWidth: 292 });
      const bytes = await pdf.save();
      const arrayBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(arrayBuffer).set(bytes);
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `NERO-${ticket.tier.replace(/[^a-z0-9]+/gi, "-")}.pdf`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setDownloading(false); }
  }

  async function shareTicket() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `Entrada NERO · ${ticket?.event ?? ""}`, text: "Mi entrada NERO. No compartas este enlace: permite ingresar al evento.", url });
    else { await navigator.clipboard.writeText(url); alert("Enlace privado copiado."); }
  }

  return <main className="ticket-pass-page">
    <nav className="nav"><Link className="logo" href="/">NERO</Link><Link className="back-link" href="/">VOLVER AL INICIO</Link></nav>
    <section className="ticket-pass-wrap">
      <span className="eyebrow">NERO TICKETS</span><h1>Tu entrada</h1>
      {loading ? <div className="module-empty">Cargando entrada segura…</div> : error ? <div className="notice" role="alert">{error}</div> : ticket ? <>
        <article className="ticket-pass">
          <div className="ticket-pass-top"><span className="eyebrow">{ticket.source === "courtesy" ? "CORTESÍA" : ticket.source === "free_access" ? "FREE ACCESS" : "ACCESO CONFIRMADO"}</span><h2>{ticket.event}</h2><p>{dateLabel(ticket.date)} · {ticket.time}<br />{ticket.venue}, {ticket.city}</p></div>
          <div className="ticket-pass-body"><span className="ticket-pass-tier">{ticket.tier}</span><p>A nombre de <b>{ticket.name}</b></p><div className="ticket-pass-qr">{qrImage ? <img src={qrImage} alt="Código QR privado de la entrada" /> : <span>Preparando QR…</span>}<small>{ticket.status === "used" ? "YA UTILIZADA" : "UN SOLO ACCESO"}</small></div><p className="ticket-pass-note">Guarda esta entrada. No compartas el QR: permite ingresar al evento.</p></div>
        </article>
        <div className="ticket-pass-actions"><button className="btn" onClick={downloadPdf} disabled={downloading || ticket.status === "used"}>{downloading ? "PREPARANDO PDF…" : "DESCARGAR ENTRADA PDF"}</button><button className="btn secondary" onClick={shareTicket}>COMPARTIR / GUARDAR</button></div>
      </> : null}
    </section>
  </main>;
}
