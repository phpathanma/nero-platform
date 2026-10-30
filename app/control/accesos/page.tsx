import { QrScanner } from "../qr-scanner";
import { getControlAccess } from "@/lib/supabase/control";

export default async function AccessModulePage() {
  const { supabase, role } = await getControlAccess();
  if (!supabase || !role) return <><span className="eyebrow">NERO CONTROL / PUERTA</span><h1>Accesos QR</h1><div className="notice">Inicia sesión con una cuenta del equipo para continuar.</div></>;
  const { data, error } = await supabase!.from("tickets").select("status");
  const tickets = data ?? [];
  const checkedIn = tickets.filter((ticket) => ticket.status === "used").length;
  const valid = tickets.filter((ticket) => ticket.status === "valid").length;
  return <><div className="module-heading"><div><span className="eyebrow">NERO CONTROL / PUERTA</span><h1>Accesos QR</h1><p className="muted">Valida entradas en tiempo real y evita el reingreso con el mismo código.</p></div></div>
    <div className="stats module-stats"><div className="stat"><strong>{checkedIn}</strong><span className="muted">Ingresados</span></div><div className="stat"><strong>{valid}</strong><span className="muted">Por ingresar</span></div><div className="stat"><strong>{tickets.length}</strong><span className="muted">Entradas emitidas</span></div></div>
    {error && <div className="notice">No se pudieron cargar los conteos. Ejecuta las políticas de tickets y acceso QR en Supabase.</div>}
    {role === "admin" || role === "door_staff" ? <QrScanner /> : <div className="notice">No tienes rol de puerta o administrador para validar entradas.</div>}
  </>;
}
