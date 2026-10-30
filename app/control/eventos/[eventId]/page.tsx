import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "../../event-form";
import { CourtesyIssuer } from "../../courtesy-issuer";
import { getControlAccess } from "@/lib/supabase/control";

export default async function EditEventPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ eventId }, { error }, { supabase, role }] = await Promise.all([params, searchParams, getControlAccess()]);
  if (role !== "admin") return <><Link className="back-link" href="/control/eventos">← EVENTOS</Link><h1>Editar evento</h1><div className="notice">Esta acción requiere el rol administrador.</div></>;
  const { data, error: queryError } = await supabase!.from("events").select("id,slug,name,tag,event_date,event_time,venue,city,status,lineup,schedule,ticket_tiers(id,category,name,price,capacity,sold)").eq("id", eventId).maybeSingle();
  if (!data && !queryError) notFound();
  if (queryError) return <><Link className="back-link" href="/control/eventos">← EVENTOS</Link><h1>Editar evento</h1><div className="notice">No se pudo cargar el evento. Revisa las políticas de Supabase.</div></>;
  const event = { ...data, event_time: String(data!.event_time), tiers: (data!.ticket_tiers ?? []).map((tier: any) => ({ id: tier.id, category: tier.category ?? "custom", name: tier.name, price: Number(tier.price), capacity: tier.capacity, sold: tier.sold ?? 0 })) };
  return <><Link className="back-link" href="/control/eventos">← VOLVER A EVENTOS</Link><div className="module-heading"><div><span className="eyebrow">NERO CONTROL / EDICIÓN</span><h1>Editar evento</h1></div></div><EventForm event={event} error={error} /><CourtesyIssuer eventId={eventId} eventStatus={event!.status} tiers={(data!.ticket_tiers ?? []).map((tier: any) => ({ id: tier.id, category: tier.category ?? "custom", name: tier.name, price: Number(tier.price), capacity: tier.capacity, sold: tier.sold ?? 0 }))} /></>;
}

