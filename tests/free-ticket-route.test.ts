import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const eq = vi.fn(async (): Promise<{ error: { code: string; message: string } | null }> => ({ error: null }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));
const createAdminClient = vi.fn<() => { rpc: typeof rpc; from: typeof from } | null>(() => ({ rpc, from }));
const sendTicketEmail = vi.fn(async () => true);

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/tickets/email", () => ({ sendTicketEmail }));

const { POST } = await import("@/app/api/tickets/free/route");

const valid = { tierId: "123e4567-e89b-42d3-a456-426614174000", name: "Ana Pérez", email: "ANA@example.com", phone: "+51999999999", captchaToken: "captcha" };
const post = (body: unknown) => POST(new Request("https://nero.test/api/tickets/free", { method: "POST", body: JSON.stringify(body) }));
const turnstile = (result: object, ok = true) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => result })));
const human = { success: true, action: "free_ticket", hostname: "nero.test" };

beforeEach(() => {
  vi.clearAllMocks();
  createAdminClient.mockReturnValue({ rpc, from });
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
  turnstile(human);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("POST /api/tickets/free", () => {
  it("rechaza datos inválidos sin emitir", async () => {
    expect((await post({ ...valid, email: "no-es-correo" })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falla cerrado en producción sin Turnstile configurado", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await post(valid)).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("no emite si falla el anti-bot", async () => {
    turnstile({ ...human, success: false });
    expect((await post(valid)).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("no emite si el desafío es de otra acción u otro dominio", async () => {
    turnstile({ ...human, action: "otra" });
    expect((await post(valid)).status).toBe(403);
    turnstile({ ...human, hostname: "evil.test" });
    expect((await post(valid)).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("devuelve 503 si falta la service role key", async () => {
    createAdminClient.mockReturnValue(null);
    expect((await post(valid)).status).toBe(503);
  });

  it("emite la entrada, normaliza el correo y la envía", async () => {
    rpc.mockResolvedValue({ data: { status: "issued", token: "tok", ticket_id: "id" }, error: null });
    const response = await post(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "issued", token: "tok", emailSent: true });
    expect(rpc).toHaveBeenCalledWith("issue_free_access_ticket", expect.objectContaining({ p_buyer_email: "ana@example.com", p_marketing_consent: false }));
    expect(sendTicketEmail).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalled(); // sin ref ni UTM no se toca el ticket
  });

  it("guarda ref y UTM limpios en el ticket, sin cambiar la llamada a la RPC, y devuelve el evento", async () => {
    rpc.mockResolvedValue({ data: { status: "issued", token: "tok", ticket_id: "ticket-1", event_id: "evento-1" }, error: null });
    const response = await post({ ...valid, ref: "Promotor-Ana", utmSource: "instagram", utmCampaign: "<raro>" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "issued", eventId: "evento-1" });
    expect(rpc).toHaveBeenCalledWith("issue_free_access_ticket", { p_tier_id: valid.tierId, p_buyer_name: "Ana Pérez", p_buyer_email: "ana@example.com", p_buyer_phone: "+51999999999", p_marketing_consent: false });
    expect(from).toHaveBeenCalledWith("tickets");
    expect(update).toHaveBeenCalledWith({ ref: "promotor-ana", utm_source: "instagram", utm_campaign: null });
    expect(eq).toHaveBeenCalledWith("id", "ticket-1");
  });

  it("si falla guardar la atribución, la entrada se emite igual", async () => {
    rpc.mockResolvedValue({ data: { status: "issued", token: "tok", ticket_id: "ticket-1" }, error: null });
    eq.mockResolvedValueOnce({ error: { code: "42703", message: "column ref does not exist" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post({ ...valid, ref: "promotor-ana" });
    expect(response.status).toBe(200);
    expect(sendTicketEmail).toHaveBeenCalledOnce();
  });

  it.each(["already_issued", "sold_out"])("responde 409 con %s y no envía correo", async (status) => {
    rpc.mockResolvedValue({ data: { status, message: "no" }, error: null });
    expect((await post(valid)).status).toBe(409);
    expect(sendTicketEmail).not.toHaveBeenCalled();
  });
});
