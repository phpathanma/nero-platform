import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FREE_PASS_NAME } from "@/lib/free-pass";
import { getControlAccess } from "@/lib/supabase/control";

export async function POST(request: Request) {
  const { supabase, role } = await getControlAccess();
  if (!supabase || !role) return NextResponse.json({ status: "unauthorized", message: "Inicia sesión con una cuenta del equipo." }, { status: 401 });
  let token = "";
  try {
    const body = await request.json();
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return NextResponse.json({ status: "invalid", message: "El código no es válido." }, { status: 400 });
  }
  if (!token || token.length > 2048) return NextResponse.json({ status: "invalid", message: "El código no es válido." }, { status: 400 });
  const { data, error } = await supabase.rpc("check_in_ticket", { p_token: token });
  if (error) return NextResponse.json({ status: "error", message: "No se pudo validar. Comprueba que las funciones SQL de acceso estén instaladas." }, { status: 503 });
  const result = data as { status?: string; message?: string; event?: string; tier?: string; buyer?: string };
  if (result.tier && await isFreeAccessTicket(supabase, token)) result.tier = FREE_PASS_NAME;
  return NextResponse.json(result, { status: result.status === "valid" ? 200 : 422 });
}

type ControlClient = NonNullable<Awaited<ReturnType<typeof getControlAccess>>["supabase"]>;

// La RPC de check-in solo devuelve el nombre del tier: se consulta su categoría para mostrar siempre
// el nombre del pase en las entradas free_access. Si la consulta falla, se deja el nombre de la RPC.
async function isFreeAccessTicket(supabase: ControlClient, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const hash = createHash("sha256").update(token, "utf8").digest("hex");
    const { data } = await supabase.from("tickets").select("ticket_tiers(category)").eq("qr_token_hash", hash).maybeSingle();
    const tier = (data as { ticket_tiers?: { category?: string } | { category?: string }[] } | null)?.ticket_tiers;
    return (Array.isArray(tier) ? tier[0]?.category : tier?.category) === "free_access";
  } catch {
    return false;
  }
}
