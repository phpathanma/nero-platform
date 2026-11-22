// Filtros y resumen de Ventas: evento + texto + estado del pedido + ingreso en puerta, todos combinados.
import { matchesEntry, type Entry, type EntryFilter } from "./ticket-entry";

export type Sale = { id: string; buyer_name: string; buyer_email: string; buyer_phone: string; total: number; status: string; source: string; date_label: string; event_id: string | null; event_name: string; entry: Entry };
export type SalesEvent = { id: string; name: string; date: string };
export type SalesFilters = { eventId: string; query: string; status: string; entry: EntryFilter };

export const ALL = "all";

export function inEvent(sale: Pick<Sale, "event_id">, eventId: string): boolean {
  return eventId === ALL || sale.event_id === eventId;
}

export function filterSales<T extends Sale>(sales: T[], filters: SalesFilters): T[] {
  const query = filters.query.trim().toLowerCase();
  return sales.filter((sale) => {
    const search = `${sale.buyer_name} ${sale.buyer_email} ${sale.buyer_phone} ${sale.event_name} ${sale.id}`.toLowerCase();
    return inEvent(sale, filters.eventId)
      && (!query || search.includes(query))
      && (filters.status === ALL || sale.status === filters.status)
      && matchesEntry(sale.entry, filters.entry);
  });
}

// Contadores del evento elegido (o de todos): no dependen del texto buscado ni del filtro de ingreso.
export function salesSummary(sales: Sale[], eventId: string = ALL) {
  const scoped = sales.filter((sale) => inEvent(sale, eventId));
  const paid = scoped.filter((sale) => sale.status === "paid");
  return {
    gross: paid.reduce((total, sale) => total + sale.total, 0),
    paid: paid.length,
    pending: scoped.filter((sale) => sale.status === "pending").length,
    total: scoped.length,
    checkedIn: scoped.filter((sale) => sale.entry.kind === "used").length,
    withTicket: scoped.filter((sale) => sale.entry.kind === "used" || sale.entry.kind === "pending").length,
  };
}
