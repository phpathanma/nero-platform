import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTicketEmail } from "@/lib/tickets/email";

type IssueResult = { status: string; message?: string; token?: string; event?: string; tier?: string; date?: string; time?: string; venue?: string; city?: string; ticket_id?: string };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const tierId = typeof body.tierId === "string" ? body.tierId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const marketingConsent = body.marketingConsent === true;
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tierId) || name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 7 || phone.length > 30) {
    return NextResponse.json({ error: "Revisa tu nombre, correo y teléfono." }, { status: 400 });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (process.env.NODE_ENV === "production" && (!turnstileSecret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
    return NextResponse.json({ error: "La protección del registro todavía no está configurada." }, { status: 503 });
  }
  if (turnstileSecret) {
    if (!captchaToken || captchaToken.length > 2048) return NextResponse.json({ error: "Completa la verificación anti-bot." }, { status: 400 });
    try {
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: captchaToken }),
        cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      const result = await verification.json() as { success?: boolean; action?: string; hostname?: string };
      const expectedHostname = new URL(request.url).hostname;
      if (!verification.ok || !result.success || result.action !== "free_ticket" || (expectedHostname && result.hostname !== expectedHostname)) return NextResponse.json({ error: "No se pudo validar la protección anti-bot. Inténtalo de nuevo." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "La verificación no respondió. Inténtalo de nuevo." }, { status: 503 });
    }
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "El registro de entradas no está configurado." }, { status: 503 });
  const { data, error } = await supabase.rpc("issue_free_access_ticket", {
    p_tier_id: tierId, p_buyer_name: name, p_buyer_email: email,
    p_buyer_phone: phone, p_marketing_consent: marketingConsent,
  });
  if (error) {
    console.error("[tickets/free] RPC failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo emitir la entrada. Revisa la configuración de entradas en Supabase." }, { status: 503 });
  }
  const result = data as IssueResult;
  if (result.status !== "issued" || !result.token) {
    const status = result.status === "already_issued" ? 409 : result.status === "sold_out" ? 409 : 400;
    return NextResponse.json({ error: result.message ?? "No se pudo emitir la entrada." }, { status });
  }

  const emailSent = await sendTicketEmail({ to: email, name, event: result.event ?? "NERO", tier: result.tier ?? "Free Access", date: result.date ?? "", time: result.time ?? "", venue: result.venue ?? "", city: result.city ?? "", token: result.token });
  return NextResponse.json({ status: "issued", token: result.token, ticketId: result.ticket_id, emailSent });
}
