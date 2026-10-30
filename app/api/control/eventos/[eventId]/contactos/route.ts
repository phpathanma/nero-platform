import { NextResponse } from "next/server";
import { getControlAccess } from "@/lib/supabase/control";

function csvCell(value: string | null) {
  let safe = value ?? "";
  // Prevent spreadsheet formula execution when opening a CSV in Excel.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { supabase, role } = await getControlAccess();
  if (!supabase || role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { eventId } = await params;
  const { data: event, error: eventError } = await supabase
    .from("events").select("name,status").eq("id", eventId).maybeSingle();
  if (eventError) return NextResponse.json({ error: "No se pudo consultar el evento." }, { status: 500 });
  if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
  if (event.status !== "past") {
    return NextResponse.json({ error: "La descarga está disponible al finalizar el evento." }, { status: 409 });
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("buyer_name,buyer_phone,buyer_email")
    .eq("event_id", eventId)
    .or("status.eq.paid,and(status.eq.confirmed,source.eq.free_access)")
    .eq("marketing_consent", true)
    .order("created_at", { ascending: true });
  if (ordersError) {
    return NextResponse.json({ error: "No se pudieron cargar los contactos. Revisa el esquema de Supabase." }, { status: 500 });
  }

  const unique = new Map<string, { name: string; phone: string | null; email: string }>();
  for (const order of orders ?? []) {
    const email = order.buyer_email.trim();
    const key = email.toLocaleLowerCase("es-PE");
    if (key && !unique.has(key)) unique.set(key, { name: order.buyer_name, phone: order.buyer_phone, email });
  }

  const rows = [["Nombre completo", "Teléfono", "Correo electrónico"], ...Array.from(unique.values(), (contact) => [contact.name, contact.phone ?? "", contact.email])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const filePart = event.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "evento";

  await supabase.from("audit_logs").insert({
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    action: "marketing_contacts.exported",
    entity_type: "event",
    entity_id: eventId,
    metadata: { contact_count: unique.size },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nero-${filePart}-contactos.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
