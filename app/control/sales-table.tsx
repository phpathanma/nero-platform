"use client";

import { useMemo, useState } from "react";
import { entryTimeLabel, type Entry, type EntryFilter } from "@/lib/ticket-entry";
import { ALL, filterSales, salesSummary, type Sale, type SalesEvent } from "@/lib/sales";

export type { Sale, SalesEvent } from "@/lib/sales";

// Ingreso en puerta según el estado de la entrada (escaneada o no).
function EntryBadge({ entry }: { entry: Entry }) {
  if (entry.kind === "used") return <><span className="status">Ingresó</span>{entry.usedAt && <small className="muted">{entryTimeLabel(entry.usedAt)}</small>}</>;
  if (entry.kind === "pending") return <span className="status status-pending">Sin ingresar</span>;
  if (entry.kind === "cancelled") return <span className="status status-cancelled">Anulada</span>;
  return <span className="muted">—</span>;
}

export function SalesTable({ sales, events }: { sales: Sale[]; events: SalesEvent[] }) {
  const [eventId, setEventId] = useState(ALL);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const filtered = useMemo(() => filterSales(sales, { eventId, query, status, entry: entryFilter }), [sales, eventId, query, status, entryFilter]);
  const summary = useMemo(() => salesSummary(sales, eventId), [sales, eventId]);
  return <>
    <div className="stats module-stats"><div className="stat"><strong>S/ {summary.gross.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong><span className="muted">Ingresos confirmados</span></div><div className="stat"><strong>{summary.paid}</strong><span className="muted">Pedidos pagados</span></div><div className="stat"><strong>{summary.pending}</strong><span className="muted">Pendientes de pago</span></div><div className="stat"><strong>{summary.total}</strong><span className="muted">Pedidos totales</span></div><div className="stat"><strong>{summary.checkedIn}</strong><span className="muted">Ingresaron · de {summary.withTicket} con entrada</span></div></div>
    <div className="control-toolbar"><select aria-label="Filtrar por evento" value={eventId} onChange={(event) => setEventId(event.target.value)}><option value={ALL}>Todos los eventos</option>{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Buscar ventas" placeholder="Buscar comprador, correo o teléfono" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar ventas por estado" value={status} onChange={(event) => setStatus(event.target.value)}><option value={ALL}>Todos los pedidos</option><option value="paid">Pagadas</option><option value="confirmed">Free Access / cortesías</option><option value="pending">Pendientes</option><option value="refunded">Reembolsadas</option><option value="cancelled">Canceladas</option></select><select aria-label="Filtrar por ingreso en puerta" value={entryFilter} onChange={(event) => setEntryFilter(event.target.value as EntryFilter)}><option value="all">Todos los ingresos</option><option value="used">Ingresaron</option><option value="pending">No ingresaron</option></select></div>
    <div className="control-table-wrap"><table><thead><tr><th>Pedido</th><th>Comprador</th><th>Evento</th><th>Fecha</th><th>Importe</th><th>Estado / origen</th><th>Ingreso</th></tr></thead><tbody>{filtered.map((sale) => <tr key={sale.id}><td><code>{sale.id.slice(0, 8).toUpperCase()}</code></td><td><b>{sale.buyer_name}</b><small className="muted">{sale.buyer_email}</small>{sale.buyer_phone && <small className="muted">{sale.buyer_phone}</small>}</td><td>{sale.event_name}</td><td>{sale.date_label}</td><td>S/ {sale.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td><td><span className={`status status-${sale.status}`}>{sale.status === "paid" ? "Pagada" : sale.status === "pending" ? "Pendiente" : sale.status === "confirmed" ? (sale.source === "courtesy" ? "Cortesía" : "Free Access") : sale.status === "refunded" ? "Reembolsada" : "Cancelada"}</span></td><td><EntryBadge entry={sale.entry} /></td></tr>)}
      {!filtered.length && <tr><td colSpan={7}><div className="module-empty">{sales.length ? "No hay pedidos para esos filtros." : "Aún no hay pedidos. Aparecerán cuando el checkout registre ventas reales."}</div></td></tr>}
    </tbody></table></div>
  </>;
}
