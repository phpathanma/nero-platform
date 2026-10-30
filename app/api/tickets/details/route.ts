import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { token?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 }); }
  if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) {
    return NextResponse.json({ error: "El enlace de entrada no es válido." }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "No se pudo validar la entrada." }, { status: 503 });
  const { data, error } = await supabase.rpc("get_ticket_by_token", { p_token: body.token });
  if (error) return NextResponse.json({ error: "No se pudo validar la entrada. Revisa la migración de entradas." }, { status: 503 });
  const result = data as Record<string, unknown>;
  if (!["valid", "used"].includes(String(result.status))) return NextResponse.json({ error: String(result.message ?? "Entrada no válida.") }, { status: 404 });
  return NextResponse.json({ ticket: result }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
