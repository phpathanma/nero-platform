// Estado de ingreso de un pedido según sus entradas (normalmente una por pedido).

export type EntryTicket = { status: string; used_at: string | null };
export type Entry = { kind: "used" | "pending" | "cancelled" | "none"; usedAt: string | null };
export type EntryFilter = "all" | "used" | "pending";

export function summarizeEntry(tickets: EntryTicket[] | null | undefined): Entry {
  const list = tickets ?? [];
  const used = list.filter((ticket) => ticket.status === "used");
  if (used.length) {
    const usedAt = used.map((ticket) => ticket.used_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
    return { kind: "used", usedAt };
  }
  if (list.some((ticket) => ticket.status === "valid")) return { kind: "pending", usedAt: null };
  if (list.length) return { kind: "cancelled", usedAt: null };
  return { kind: "none", usedAt: null };
}

export function matchesEntry(entry: Entry, filter: EntryFilter): boolean {
  return filter === "all" || entry.kind === filter;
}

// «20 nov., 23:41» en hora de Lima.
export function entryTimeLabel(usedAt: string | null): string {
  if (!usedAt) return "";
  const value = new Date(usedAt);
  return Number.isNaN(value.getTime()) ? "" : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Lima" }).format(value);
}
