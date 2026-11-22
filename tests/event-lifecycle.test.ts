import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENT_CLOSE_TIME, effectiveStatus, limaNow } from "@/lib/format";
import { entryTimeLabel, matchesEntry, summarizeEntry } from "@/lib/ticket-entry";

const sql = readFileSync(join(process.cwd(), "supabase", "event-lifecycle.sql"), "utf8");

describe("cierre automático de eventos", () => {
  it("convierte la fecha y hora a Lima sin importar la zona del servidor", () => {
    expect(limaNow(new Date("2026-11-21T04:59:00Z"))).toEqual({ date: "2026-11-20", time: "23:59" });
    expect(limaNow(new Date("2026-11-21T17:00:00Z"))).toEqual({ date: "2026-11-21", time: "12:00" });
  });

  it("sigue activo durante la noche y se cierra a las 12:00 del día siguiente", () => {
    expect(effectiveStatus("published", "2026-11-20", { date: "2026-11-20", time: "23:30" })).toBe("published");
    expect(effectiveStatus("published", "2026-11-20", { date: "2026-11-21", time: "03:00" })).toBe("published");
    expect(effectiveStatus("published", "2026-11-20", { date: "2026-11-21", time: "11:59" })).toBe("published");
    expect(effectiveStatus("published", "2026-11-20", { date: "2026-11-21", time: "12:00" })).toBe("past");
    expect(effectiveStatus("published", "2026-11-20", { date: "2026-11-22", time: "09:00" })).toBe("past");
  });

  it("cruza bien fin de mes y de año, y no toca borradores ni eventos ya finalizados", () => {
    expect(effectiveStatus("published", "2026-11-30", { date: "2026-12-01", time: "12:00" })).toBe("past");
    expect(effectiveStatus("published", "2026-12-31", { date: "2027-01-01", time: "11:00" })).toBe("published");
    expect(effectiveStatus("draft", "2020-01-01", { date: "2026-11-22", time: "12:00" })).toBe("draft");
    expect(effectiveStatus("past", "2030-01-01", { date: "2026-11-22", time: "12:00" })).toBe("past");
  });

  it("el SQL usa la misma regla (12:00 del día siguiente en Lima) y solo cierra eventos publicados", () => {
    expect(EVENT_CLOSE_TIME).toBe("12:00");
    expect(sql).toMatch(/set status = 'past'\s+where status = 'published'\s+and \(now\(\) at time zone 'America\/Lima'\) >= \(event_date \+ 1\) \+ time '12:00'/);
    expect(sql).toMatch(/revoke all on function public\.close_past_events\(\) from public, anon, authenticated;/);
    expect(sql).toMatch(/cron\.schedule\('close-past-events', '5 \* \* \* \*'/);
    expect(sql).not.toMatch(/issue_free_access_ticket\s*\(/); // no modifica la RPC de emisión
  });
});

describe("estado de ingreso en Ventas", () => {
  it("resume las entradas del pedido", () => {
    expect(summarizeEntry([{ status: "used", used_at: "2026-11-21T04:41:00Z" }])).toEqual({ kind: "used", usedAt: "2026-11-21T04:41:00Z" });
    expect(summarizeEntry([{ status: "valid", used_at: null }])).toEqual({ kind: "pending", usedAt: null });
    expect(summarizeEntry([{ status: "cancelled", used_at: "2026-11-19T14:33:58Z" }])).toEqual({ kind: "cancelled", usedAt: null });
    expect(summarizeEntry([])).toEqual({ kind: "none", usedAt: null });
    expect(summarizeEntry(null)).toEqual({ kind: "none", usedAt: null });
  });

  it("con varias entradas, gana el último ingreso", () => {
    expect(summarizeEntry([{ status: "used", used_at: "2026-11-21T03:00:00Z" }, { status: "valid", used_at: null }, { status: "used", used_at: "2026-11-21T04:00:00Z" }]).usedAt).toBe("2026-11-21T04:00:00Z");
  });

  it("filtra por ingresaron / sin ingresar y muestra la hora de Lima", () => {
    const used = summarizeEntry([{ status: "used", used_at: "2026-11-21T04:41:00Z" }]);
    const pending = summarizeEntry([{ status: "valid", used_at: null }]);
    expect([matchesEntry(used, "used"), matchesEntry(pending, "used"), matchesEntry(pending, "pending"), matchesEntry(used, "all")]).toEqual([true, false, true, true]);
    expect(entryTimeLabel("2026-11-21T04:41:00Z")).toMatch(/20.*nov.*23:41/);
    expect(entryTimeLabel(null)).toBe("");
  });
});
