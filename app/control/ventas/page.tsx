import { SalesTable, type Sale } from "../sales-table";
import { getControlAccess } from "@/lib/supabase/control";

export default async function SalesModulePage() {
  const { supabase, role } = await getControlAccess();
  if (role !== "admin") return <><span className="eyebrow">NERO CONTROL / FINANZAS</span><h1>Ventas</h1><div className="notice">Las ventas solo están disponibles para administradores.</div></>;

  const { data, error } = await supabase!.from("orders").select("id,buyer_name,buyer_email,buyer_phone,total,status,source,created_at,event_id,events(name)").order("created_at", { ascending: false });
  const sales: Sale[] = (data ?? []).map((order: any) => ({ id: order.id, buyer_name: order.buyer_name, buyer_email: order.buyer_email, buyer_phone: order.buyer_phone ?? "", source: order.source ?? "sale", total: Number(order.total), status: order.status, date_label: new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(order.created_at)), event_name: order.events?.name ?? "Evento" }));
  const paid = sales.filter((sale) => sale.status === "paid");
  const gross = paid.reduce((total, sale) => total + sale.total, 0);
  const pending = sales.filter((sale) => sale.status === "pending").length;

  return <><div className="module-heading"><div><span className="eyebrow">NERO CONTROL / FINANZAS</span><h1>Ventas</h1><p className="muted">Pedidos, pagos y recaudación de tus eventos.</p></div></div>
    <div className="stats module-stats"><div className="stat"><strong>S/ {gross.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong><span className="muted">Ingresos confirmados</span></div><div className="stat"><strong>{paid.length}</strong><span className="muted">Pedidos pagados</span></div><div className="stat"><strong>{pending}</strong><span className="muted">Pendientes de pago</span></div><div className="stat"><strong>{sales.length}</strong><span className="muted">Pedidos totales</span></div></div>
    {error ? <div className="module-empty">No se pudieron cargar los pedidos. Confirma que el esquema y las políticas de administración estén aplicados en Supabase.</div> : <SalesTable sales={sales} />}
  </>;
}
