import Link from "next/link";
import { getControlAccess } from "@/lib/supabase/control";

export default async function ControlPage() {
  const { supabase, role } = await getControlAccess();
  if (!supabase || !role) return <><span className="eyebrow">Centro de operaciones</span><h1>NERO CONTROL</h1><p className="muted">Inicia sesión para continuar.</p><Link className="btn" href="/control/login">INICIAR SESIÓN</Link></>;
  const { data, error } = await supabase.from("events").select("id,status,ticket_tiers(sold,price)");
  const events = data ?? [];
  const published = events.filter((event: any) => event.status === "published").length;
  const sold = events.reduce((sum: number, event: any) => sum + (event.ticket_tiers ?? []).reduce((total: number, tier: any) => total + tier.sold, 0), 0);
  const { data: orders } = role === "admin" ? await supabase.from("orders").select("total").eq("status", "paid") : { data: [] };
  const gross = (orders ?? []).reduce((sum, order) => sum + Number(order.total), 0);
  return <><span className="eyebrow">Centro de operaciones</span><h1>NERO CONTROL</h1><p className="muted">Administración y supervisión de la plataforma.</p>
    {error && <div className="notice">No se pudieron cargar los datos. Revisa las políticas de acceso en Supabase.</div>}
    <div className="stats"><div className="stat"><strong>{events.length}</strong><span className="muted">Eventos registrados</span></div><div className="stat"><strong>{published}</strong><span className="muted">Eventos publicados</span></div><div className="stat"><strong>{sold}</strong><span className="muted">Entradas emitidas</span></div><div className="stat"><strong>S/ {gross.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong><span className="muted">Ventas confirmadas</span></div></div>
    {!events.length && <div className="module-empty">Todavía no hay eventos en Supabase. Crea el primero desde <Link className="text-action" href="/control/eventos">Eventos</Link>.</div>}
    <div className="module-shortcuts"><Link href="/control/eventos"><span className="eyebrow">01 / Catálogo</span><b>Gestionar eventos ↗</b><small>Crear fechas, entradas y publicar</small></Link><Link href="/control/ventas"><span className="eyebrow">02 / Finanzas</span><b>Ver ventas ↗</b><small>Pedidos e ingresos confirmados</small></Link><Link href="/control/accesos"><span className="eyebrow">03 / Puerta</span><b>Validar accesos ↗</b><small>Escaneo y control de entradas</small></Link></div>
  </>;
}
