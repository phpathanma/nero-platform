import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS, attributionFromSearch, cleanTag, isAnalyticsEvent } from "@/lib/analytics";
import { createRateLimiter } from "@/lib/rate-limit";

const insert = vi.fn(async () => ({ error: null }));
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));
const { POST } = await import("@/app/api/analytics/route");

const sql = readFileSync(join(process.cwd(), "supabase", "analytics.sql"), "utf8");
let counter = 0;
const session = () => `sesion${String(++counter).padStart(6, "0")}`;
const send = (body: unknown, headers: Record<string, string> = {}) => POST(new Request("https://nero.test/api/analytics", {
  method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
  headers: { origin: "https://nero.test", "user-agent": "Mozilla/5.0 (iPhone)", "x-forwarded-for": `10.0.0.${counter % 250}`, ...headers },
}));

describe("atribución", () => {
  it("solo acepta los eventos de la lista blanca de NERO", () => {
    expect(ANALYTICS_EVENTS).toEqual(["page_view", "free_access_submit", "whatsapp_click"]);
    expect(isAnalyticsEvent("free_access_submit")).toBe(true);
    expect(isAnalyticsEvent("purchase")).toBe(false);
  });

  it("limpia ref y UTM y descarta valores raros", () => {
    expect(attributionFromSearch("?ref=Promotor-Ana&utm_source=instagram&utm_campaign=Sabado 20")).toEqual({ ref: "promotor-ana", utmSource: "instagram", utmCampaign: "sabado-20" });
    expect(cleanTag("<script>")).toBeUndefined();
    expect(cleanTag("x".repeat(61))).toBeUndefined();
  });
});

describe("POST /api/analytics", () => {
  beforeEach(() => { insert.mockClear(); from.mockClear(); });

  it("guarda un evento válido con la atribución limpia y sin IP", async () => {
    const response = await send({ name: "page_view", path: "/eventos/la-casita", sessionId: session(), ref: "Promotor-Ana", eventId: "123e4567-e89b-42d3-a456-426614174000" });
    expect(response.status).toBe(204);
    expect(from).toHaveBeenCalledWith("analytics_events");
    const row = (insert.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(row).toMatchObject({ name: "page_view", path: "/eventos/la-casita", ref: "promotor-ana", event_id: "123e4567-e89b-42d3-a456-426614174000" });
    expect(Object.keys(row)).not.toContain("ip");
  });

  it("rechaza eventos fuera de la lista blanca, otros orígenes, sesiones inválidas y cuerpos enormes", async () => {
    expect((await send({ name: "purchase", sessionId: session() })).status).toBe(400);
    expect((await send({ name: "page_view", sessionId: "MAL" })).status).toBe(400);
    expect((await send({ name: "page_view", sessionId: session() }, { origin: "https://evil.test" })).status).toBe(403);
    expect((await send(JSON.stringify({ name: "page_view", sessionId: session(), path: `/${"x".repeat(3000)}` }))).status).toBe(413);
    expect(insert).not.toHaveBeenCalled();
  });

  it("ignora bots sin guardar nada", async () => {
    expect((await send({ name: "page_view", sessionId: session() }, { "user-agent": "Googlebot/2.1" })).status).toBe(204);
    expect(insert).not.toHaveBeenCalled();
  });

  it("aplica rate-limit por sesión", async () => {
    const id = session();
    const statuses = [];
    for (let i = 0; i < 32; i++) statuses.push((await send({ name: "page_view", sessionId: id }, { "x-forwarded-for": `172.16.0.${i}` })).status);
    expect(statuses.slice(0, 30).every((status) => status === 204)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("rate limiter", () => {
  it("reinicia la cuenta al terminar la ventana", () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect([allow("a", 0), allow("a", 10), allow("a", 20)]).toEqual([true, true, false]);
    expect(allow("a", 1001)).toBe(true);
  });
});

describe("SQL de métricas", () => {
  it("la restricción de nombres coincide con la lista blanca del código", () => {
    const listed = /name in \(([^)]*)\)/.exec(sql)![1].match(/'([a-z_]+)'/g)!.map((item) => item.replaceAll("'", ""));
    expect(listed).toEqual([...ANALYTICS_EVENTS]);
  });

  it("nadie escribe analytics_events desde el navegador y las vistas respetan el RLS", () => {
    expect(sql).toMatch(/revoke insert, update, delete on public\.analytics_events from anon, authenticated;/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.analytics_events\s+for (insert|all)/);
    for (const view of ["event_funnel", "ref_performance", "ref_visits", "analytics_30d"]) {
      expect(sql).toMatch(new RegExp(`create or replace view public\\.${view} with \\(security_invoker = true\\)`));
    }
    expect(sql).toMatch(/revoke all on public\.event_funnel, public\.ref_performance, public\.ref_visits, public\.analytics_30d from anon;/);
  });

  it("solo trae métricas: sin CRM, cumpleaños, recaps ni cambios en la emisión de tickets", () => {
    const code = sql.replace(/--.*$/gm, "");
    expect(code).not.toMatch(/crm_contacts|birth_day|birth_month|event_media|recap/);
    expect(code).not.toMatch(/issue_free_access_ticket|issue_courtesy_ticket|check_in_ticket/);
  });
});
