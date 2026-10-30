import "server-only";

type TicketEmail = {
  to: string; name: string; event: string; tier: string; date: string; time: string; venue: string; city: string; token: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function sendTicketEmail(ticket: TicketEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TICKET_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const ticketUrl = `${configuredSite.replace(/\/$/, "")}/entrada#${encodeURIComponent(ticket.token)}`;
  const html = `<div style="background:#080808;color:#f5f4ed;padding:32px;font-family:Arial,sans-serif"><p style="color:#d4ff3f;letter-spacing:4px">NERO TICKETS</p><h1>${escapeHtml(ticket.event)}</h1><p>${escapeHtml(ticket.date)} · ${escapeHtml(ticket.time)}<br>${escapeHtml(ticket.venue)}, ${escapeHtml(ticket.city)}</p><p>Entrada: <strong>${escapeHtml(ticket.tier)}</strong><br>A nombre de: ${escapeHtml(ticket.name)}</p><p><a href="${ticketUrl}" style="display:inline-block;background:#d4ff3f;color:#080808;padding:14px 20px;text-decoration:none;font-weight:bold">ABRIR Y DESCARGAR ENTRADA</a></p><p style="color:#aaa;font-size:12px">Este enlace permite acceder a la entrada. No lo compartas públicamente.</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [ticket.to], subject: `Tu entrada para ${ticket.event} · NERO`, html }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
