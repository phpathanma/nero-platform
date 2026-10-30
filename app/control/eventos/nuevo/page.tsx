import Link from "next/link";
import { EventForm } from "../../event-form";
import { getControlAccess } from "@/lib/supabase/control";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { role } = await getControlAccess();
  if (role !== "admin") return <><Link className="back-link" href="/control/eventos">← EVENTOS</Link><h1>Nuevo evento</h1><div className="notice">Esta acción requiere el rol administrador.</div></>;
  return <><Link className="back-link" href="/control/eventos">← VOLVER A EVENTOS</Link><div className="module-heading"><div><span className="eyebrow">NERO CONTROL / NUEVO</span><h1>Crear evento</h1><p className="muted">Guarda como borrador y publícalo cuando esté listo.</p></div></div><EventForm error={error} /></>;
}
