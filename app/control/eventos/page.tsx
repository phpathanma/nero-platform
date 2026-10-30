import Link from "next/link";
import { EventsTable } from "../events-table";
import { getControlAccess } from "@/lib/supabase/control";

export default async function EventsModulePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const { supabase, role } = await getControlAccess();
  if (role !== "admin") return <><span className="eyebrow">Gestión</span><h1>Eventos</h1><div className="notice">Solo el rol administrador puede crear, editar o publicar eventos.</div></>;

  const { data, error: queryError } = await supabase!.from("events").select("id,slug,name,event_date,city,status,ticket_tiers(sold,capacity)").order("event_date", { ascending: true });
  const events = (data ?? []).map((event: any) => ({ id: event.id, slug: event.slug, name: event.name, date: event.event_date, city: event.city, status: event.status, tiers: event.ticket_tiers ?? [] }));
  return <><div className="module-heading"><div><span className="eyebrow">NERO CONTROL / CATÁLOGO</span><h1>Eventos</h1><p className="muted">Crea fechas, gestiona entradas y publica tus próximos encuentros.</p></div><Link className="btn" href="/control/eventos/nuevo">+ NUEVO EVENTO</Link></div>
    {saved && <div className="success-note">Cambios guardados correctamente.</div>}
    {error === "no-tiers" && <div className="notice">Activa al menos un tipo de entrada antes de publicar el evento.</div>}{error && error !== "no-tiers" && <div className="notice">{error === "has-tickets" ? "Este evento tiene entradas emitidas y no se puede eliminar. Puedes marcarlo como finalizado." : "No se pudo completar la acción. Revisa las políticas de Supabase."}</div>}
    {queryError ? <div className="module-empty">No se pudo cargar el catálogo. Asegúrate de haber ejecutado el esquema y las políticas de administración en Supabase.</div> : <EventsTable events={events} />}
  </>;
}

