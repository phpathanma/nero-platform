import type { SupabaseClient } from "@supabase/supabase-js";
import styles from "./door-stats.module.css";
import { effectiveStatus } from "@/lib/format";

type EventRow = { id: string; name: string; status: "published"; event_date: string };
type TicketRow = { event_id: string; status: string };

export async function DoorStats({ supabase }: { supabase: SupabaseClient }) {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, name, status, event_date")
    .eq("status", "published")
    .order("event_date", { ascending: true });
  if (eventsError || !events) return null;
  // Solo eventos en curso: el contador sigue durante la noche y desaparece a las 12:00 del día siguiente.
  const eventRows = (events as EventRow[]).filter((event) => effectiveStatus(event.status, event.event_date) === "published");
  if (eventRows.length === 0) return null;

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("event_id, status")
    .in("event_id", eventRows.map((event) => event.id));
  if (ticketsError || !tickets) return null;

  const totals = new Map<string, { used: number; total: number }>();
  for (const ticket of tickets as TicketRow[]) {
    if (ticket.status === "cancelled") continue;
    const entry = totals.get(ticket.event_id) ?? { used: 0, total: 0 };
    entry.total += 1;
    if (ticket.status === "used") entry.used += 1;
    totals.set(ticket.event_id, entry);
  }

  return (
    <section className={styles.wrap} aria-label="Ingresos por evento">
      {eventRows.map((event) => {
        const { used, total } = totals.get(event.id) ?? { used: 0, total: 0 };
        const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
        return (
          <div className={styles.card} key={event.id}>
            <span className={styles.name}>{event.name}</span>
            <p className={styles.count}>
              <strong>{used}</strong> / {total} <span>ingresaron</span>
            </p>
            <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
