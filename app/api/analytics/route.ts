import { NextResponse } from "next/server";
import { cleanAttribution, isAnalyticsEvent } from "@/lib/analytics";
import { createRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

// Telemetría propia y anónima: no se guarda IP ni datos personales, solo el evento, la ruta y la atribución.
// Solo el servidor escribe en analytics_events (service_role) y solo después de pasar todas las validaciones.

const MAX_BODY = 2048;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;
const perIp = createRateLimiter({ limit: 60, windowMs: 60_000 });
const perSession = createRateLimiter({ limit: 30, windowMs: 60_000 });

const accepted = () => new NextResponse(null, { status: 204 });

function originHost(origin: string) {
  try { return new URL(origin).host; } catch { return null; }
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  // Solo desde el propio sitio (sendBeacon y fetch envían Origin).
  const origin = request.headers.get("origin");
  if (origin && originHost(origin) !== new URL(request.url).host) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  if (BOTS.test(request.headers.get("user-agent") ?? "")) return accepted();

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

  if (!isAnalyticsEvent(body.name)) return NextResponse.json({ error: "Evento no permitido." }, { status: 400 });
  const sessionId = typeof body.sessionId === "string" && /^[a-z0-9]{8,40}$/.test(body.sessionId) ? body.sessionId : null;
  if (!sessionId) return NextResponse.json({ error: "Sesión no válida." }, { status: 400 });

  if (!perIp(clientIp(request)) || !perSession(sessionId)) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });

  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;
  const eventId = typeof body.eventId === "string" && UUID.test(body.eventId) ? body.eventId : null;
  const { ref, utmSource, utmCampaign } = cleanAttribution(body as Record<string, unknown>);

  const supabase = createAdminClient();
  if (!supabase) return accepted(); // Sin Supabase el sitio sigue funcionando; simplemente no se mide.
  const { error } = await supabase.from("analytics_events").insert({
    name: body.name, path, event_id: eventId, session_id: sessionId,
    ref: ref ?? null, utm_source: utmSource ?? null, utm_campaign: utmCampaign ?? null,
  });
  if (error) console.error("[analytics] insert failed", { code: error.code, message: error.message });
  return accepted();
}
