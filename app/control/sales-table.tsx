"use client";

import { useMemo, useState } from "react";

export type Sale = { id: string; buyer_name: string; buyer_email: string; buyer_phone: string; total: number; status: string; source: string; date_label: string; event_name: string };

export function SalesTable({ sales }: { sales: Sale[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => sales.filter((sale) => {
    const search = `${sale.buyer_name} ${sale.buyer_email} ${sale.buyer_phone} ${sale.event_name} ${sale.id}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (status === "all" || (status === "confirmed" ? sale.status === "confirmed" : sale.status === status));
  }), [sales, query, status]);
  return <>
    <div className="control-toolbar"><input aria-label="Buscar ventas" placeholder="Buscar comprador, correo, teléfono o evento" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar ventas por estado" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los pedidos</option><option value="paid">Pagadas</option><option value="confirmed">Free Access / cortesías</option><option value="pending">Pendientes</option><option value="refunded">Reembolsadas</option><option value="cancelled">Canceladas</option></select></div>
    <div className="control-table-wrap"><table><thead><tr><th>Pedido</th><th>Comprador</th><th>Evento</th><th>Fecha</th><th>Importe</th><th>Estado / origen</th></tr></thead><tbody>{filtered.map((sale) => <tr key={sale.id}><td><code>{sale.id.slice(0, 8).toUpperCase()}</code></td><td><b>{sale.buyer_name}</b><small className="muted">{sale.buyer_email}</small>{sale.buyer_phone && <small className="muted">{sale.buyer_phone}</small>}</td><td>{sale.event_name}</td><td>{sale.date_label}</td><td>S/ {sale.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td><td><span className={`status status-${sale.status}`}>{sale.status === "paid" ? "Pagada" : sale.status === "pending" ? "Pendiente" : sale.status === "confirmed" ? (sale.source === "courtesy" ? "Cortesía" : "Free Access") : sale.status === "refunded" ? "Reembolsada" : "Cancelada"}</span></td></tr>)}
      {!filtered.length && <tr><td colSpan={6}><div className="module-empty">{sales.length ? "No hay pedidos para esos filtros." : "Aún no hay pedidos. Aparecerán cuando el checkout registre ventas reales."}</div></td></tr>}
    </tbody></table></div>
  </>;
}
