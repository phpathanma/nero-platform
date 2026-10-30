import { NextResponse } from "next/server";
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
  return NextResponse.json(result, { status: result.status === "valid" ? 200 : 422 });
}
