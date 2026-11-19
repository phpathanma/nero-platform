import Link from "next/link";
import { getControlAccess } from "@/lib/supabase/control";
import { formatEventDate } from "@/lib/format";

type Funnel = { event_id: string; slug: string; name: string; event_date: string; visits: number; registrations: number; checkins: number; checkins_total: number; whatsapp_clicks: number };
type RefRow = { ref: string; event_id: string; registrations?: number; checkins?: number; visits?: number };
type Summary = { visits: number; free_access_submits: number; whatsapp_clicks: number };

const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "—");
const n = (value: number | null | undefined) => Number(value ?? 0);

export default async function MetricsModulePage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const [{ evento }, { supabase, role }] = await Promise.all([searchParams, getControlAccess()]);
  const heading = <div className="module-heading"><div><span className="eyebrow">NERO CONTROL / MÉTRICAS</span><h1>Métricas</h1><p className="muted">Visitas → registros Free Access → ingresos reales en puerta, y qué links traen a la gente.</p></div></div>;
  if (role !== "admin") return <>{heading}<div className="notice">Las métricas solo están disponibles para administradores.</div></>;

  const [funnelResult, summaryResult, refsResult, visitsResult] = await Promise.all([
    supabase!.from("event_funnel").select("*").order("event_date", { ascending: false }).limit(24).returns<Funnel[]>(),
    supabase!.from("analytics_30d").select("*").maybeSingle<Summary>(),
    supabase!.from("ref_performance").select("*").returns<RefRow[]>(),
    supabase!.from("ref_visits").select("*").returns<RefRow[]>(),
  ]);
  if (funnelResult.error || summaryResult.error) {
    return <>{heading}<div className="notice">Falta ejecutar <b>supabase/analytics.sql</b> en el SQL Editor de Supabase para ver las métricas.</div></>;
  }
  const funnel = funnelResult.data ?? [];
  const summary = summaryResult.data;
  const totals = funnel.reduce((acc, row) => ({ registrations: acc.registrations + n(row.registrations), checkins: acc.checkins + n(row.checkins) }), { registrations: 0, checkins: 0 });

  // Ranking de promotores y links: se unen registros, check-ins y visitas por ref (todos los eventos o el elegido).
  const byRef = new Map<string, { ref: string; visits: number; registrations: number; checkins: number }>();
  const take = (rows: RefRow[] | null) => (rows ?? []).filter((row) => !evento || row.event_id === evento);
  for (const row of take(refsResult.data)) {
    const entry = byRef.get(row.ref) ?? { ref: row.ref, visits: 0, registrations: 0, checkins: 0 };
    entry.registrations += n(row.registrations); entry.checkins += n(row.checkins);
    byRef.set(row.ref, entry);
  }
  for (const row of take(visitsResult.data)) {
    const entry = byRef.get(row.ref) ?? { ref: row.ref, visits: 0, registrations: 0, checkins: 0 };
    entry.visits += n(row.visits);
    byRef.set(row.ref, entry);
  }
  const ranking = [...byRef.values()].sort((a, b) => b.checkins - a.checkins || b.registrations - a.registrations).slice(0, 30);
  const selected = funnel.find((row) => row.event_id === evento);

  return <>
    {heading}
    <div className="stats module-stats">
      <div className="stat"><strong>{n(summary?.visits)}</strong><span className="muted">Visitas · 30 días</span></div>
      <div className="stat"><strong>{n(summary?.free_access_submits)}</strong><span className="muted">Registros Free Access · 30 días · {pct(n(summary?.free_access_submits), n(summary?.visits))} de las visitas</span></div>
      <div className="stat"><strong>{totals.checkins}</strong><span className="muted">Ingresos Free Access · show-up {pct(totals.checkins, totals.registrations)}</span></div>
      <div className="stat"><strong>{n(summary?.whatsapp_clicks)}</strong><span className="muted">Clics a WhatsApp · 30 días</span></div>
    </div>

    <section className="table-wrap control-table-wrap">
      <h2>Embudo por evento</h2>
      <table><thead><tr><th>Evento</th><th>Visitas</th><th>Registros</th><th>Conversión</th><th>Ingresos</th><th>Show-up</th><th>WhatsApp</th></tr></thead><tbody>
        {funnel.map((row) => <tr key={row.event_id}>
          <td><Link className="text-action" href={`/control/metricas?evento=${row.event_id}`}>{row.name}</Link><small className="muted">{formatEventDate(row.event_date)}</small></td>
          <td>{n(row.visits)}</td><td>{n(row.registrations)}</td><td>{pct(n(row.registrations), n(row.visits))}</td>
          <td>{n(row.checkins)}</td><td><b className="is-accent">{pct(n(row.checkins), n(row.registrations))}</b></td>
          <td>{n(row.whatsapp_clicks)}</td>
        </tr>)}
        {!funnel.length && <tr><td colSpan={7}><div className="module-empty">Todavía no hay eventos publicados con datos.</div></td></tr>}
      </tbody></table>
    </section>

    <section className="table-wrap control-table-wrap">
      <h2>Promotores y links (ref)</h2>
      <form className="control-toolbar" method="get">
        <select name="evento" defaultValue={evento ?? ""} aria-label="Filtrar por evento"><option value="">Todos los eventos</option>{funnel.map((row) => <option key={row.event_id} value={row.event_id}>{row.name}</option>)}</select>
        <button className="btn secondary" type="submit">FILTRAR</button>
      </form>
      <p className="muted">{selected ? `Evento: ${selected.name}.` : "Todos los eventos."} Comparte links como <code>/eventos/la-casita?ref=promotor-ana</code> para medir cada origen.</p>
      <table><thead><tr><th>Ref</th><th>Visitas</th><th>Registros</th><th>Ingresos</th><th>Show-up</th></tr></thead><tbody>
        {ranking.map((row, index) => <tr key={row.ref}><td><b>{String(index + 1).padStart(2, "0")} · {row.ref}</b></td><td>{row.visits}</td><td>{row.registrations}</td><td>{row.checkins}</td><td>{pct(row.checkins, row.registrations)}</td></tr>)}
        {!ranking.length && <tr><td colSpan={5}><div className="module-empty">Aún no hay registros con ref. Agrega ?ref=… a los links de historias y promotores.</div></td></tr>}
      </tbody></table>
    </section>
  </>;
}
