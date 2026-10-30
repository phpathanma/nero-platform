import { NextResponse } from "next/server";
import { getControlAccess } from "@/lib/supabase/control";
import { sendTicketEmail } from "@/lib/tickets/email";

type IssueResult = { status: string; message?: string; token?: string; event?: string; tier?: string; date?: string; time?: string; venue?: string; city?: string; ticket_id?: string };

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { supabase, role } = await getControlAccess();
  if (!supabase || role !== "admin") return NextResponse.json({ error: "Solo un administrador puede emitir cortesías." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  const { eventId } = await params;
  const tierId = typeof body.tierId === "string" ? body.tierId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (!isUuid(eventId) || !isUuid(tierId) || name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 7 || phone.length > 30 || reason.length > 300) {
    return NextResponse.json({ error: "Revisa los datos del invitado." }, { status: 400 });
  }
  const { data: tier } = await supabase.from("ticket_tiers").select("event_id").eq("id", tierId).maybeSingle();
  if (tier?.event_id !== eventId) return NextResponse.json({ error: "La categoría no pertenece a este evento." }, { status: 400 });
  const { data, error } = await supabase.rpc("issue_courtesy_ticket", {
    p_tier_id: tierId, p_buyer_name: name, p_buyer_email: email,
    p_buyer_phone: phone, p_reason: reason || null,
  });
  if (error) {
    console.error("[tickets/courtesy] RPC failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "No se pudo emitir. Revisa la configuración de entradas en Supabase." }, { status: 503 });
  }
  const result = data as IssueResult;
  if (result.status !== "issued" || !result.token) return NextResponse.json({ error: result.message ?? "No se pudo emitir la cortesía." }, { status: result.status === "sold_out" ? 409 : 400 });
  const emailSent = await sendTicketEmail({ to: email, name, event: result.event ?? "NERO", tier: result.tier ?? "Cortesía", date: result.date ?? "", time: result.time ?? "", venue: result.venue ?? "", city: result.city ?? "", token: result.token });
  return NextResponse.json({ status: "issued", token: result.token, ticketId: result.ticket_id, emailSent });
}
