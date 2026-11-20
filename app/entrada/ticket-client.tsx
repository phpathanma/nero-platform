"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteNav } from "@/app/site-nav";
import { formatEventTime, ticketFileName } from "@/lib/format";
import { FREE_PASS_CONDITION, FREE_PASS_TITLE } from "@/lib/free-pass";

type Ticket = { status: "valid" | "used"; source: string; name: string; event: string; date: string; time: string; venue: string; city: string; tier: string };

function dateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(value);
}

// Enlace de Google Calendar con la hora local de Perú; asume 6 horas de duración.
function calendarUrl(ticket: Ticket) {
  const start = new Date(`${ticket.date}T${ticket.time.slice(0, 5)}:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
  const query = new URLSearchParams({ action: "TEMPLATE", text: `NERO · ${ticket.event}`, dates: `${stamp(start)}/${stamp(end)}`, ctz: "America/Lima", location: `${ticket.venue}, ${ticket.city}` });
  return `https://calendar.google.com/calendar/render?${query}`;
}

export function TicketClient() {
  const [token, setToken] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const isFreePass = ticket?.source === "free_access";

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
      const { buildTicketPdf } = await import("@/lib/tickets/pdf");
      const { bytes } = await buildTicketPdf({ ticket, token, dateText: dateLabel(ticket.date), condition: isFreePass ? FREE_PASS_CONDITION : undefined });
      const arrayBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(arrayBuffer).set(bytes);
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = ticketFileName("NERO", ticket.tier); link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setDownloading(false); }
  }

  async function shareTicket() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `Entrada NERO · ${ticket?.event ?? ""}`, text: "Mi entrada NERO. No compartas este enlace: permite ingresar al evento.", url });
    else { await navigator.clipboard.writeText(url); alert("Enlace privado copiado."); }
  }

  return <main className="ticket-pass-page">
    <SiteNav />
    <section className="ticket-pass-wrap">
      <span className="eyebrow">NERO TICKETS</span><h1>Tu entrada</h1>
      {loading ? <div className="module-empty">Cargando entrada segura…</div> : error ? <><div className="notice" role="alert">{error}</div><Link className="btn secondary" href="/">VOLVER AL INICIO</Link></> : ticket ? <>
        <article className="ticket-pass">
          <div className="ticket-pass-top"><span className="eyebrow">{ticket.source === "courtesy" ? "CORTESÍA" : ticket.source === "free_access" ? FREE_PASS_TITLE.toUpperCase() : "ACCESO CONFIRMADO"}</span><h2>{ticket.event}</h2><p>{dateLabel(ticket.date)} · {formatEventTime(ticket.time)}<br />{ticket.venue}, {ticket.city}</p></div>
          <div className="ticket-pass-body"><span className="ticket-pass-tier">{ticket.tier}</span><p>A nombre de <b>{ticket.name}</b></p><div className="ticket-pass-qr">{qrImage ? <img src={qrImage} alt="Código QR privado de la entrada" /> : <span>Preparando QR…</span>}<small>{ticket.status === "used" ? "YA UTILIZADA" : "UN SOLO ACCESO"}</small></div>{isFreePass && <p className="ticket-pass-condition">{FREE_PASS_CONDITION}.</p>}<p className="ticket-pass-note">Guarda esta entrada. No compartas el QR: permite ingresar al evento.</p></div>
        </article>
        <div className="ticket-pass-actions"><button className="btn" onClick={downloadPdf} disabled={downloading || ticket.status === "used"}>{downloading ? "PREPARANDO PDF…" : "DESCARGAR ENTRADA PDF"}</button><button className="btn secondary" onClick={shareTicket}>COMPARTIR / GUARDAR</button>{calendarUrl(ticket) && <a className="btn secondary ticket-pass-calendar" href={calendarUrl(ticket)!} target="_blank" rel="noreferrer">AÑADIR AL CALENDARIO</a>}</div>
      </> : null}
    </section>
  </main>;
}
