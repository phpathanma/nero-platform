import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const from = vi.fn(() => ({ select: () => ({ eq }) }));
const getControlAccess = vi.fn();
vi.mock("@/lib/supabase/control", () => ({ getControlAccess }));

import { FREE_PASS_NAME } from "@/lib/free-pass";

const { POST } = await import("@/app/api/control/check-in/route");

const post = (body: unknown) => POST(new Request("https://nero.test/api/control/check-in", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  getControlAccess.mockResolvedValue({ supabase: { rpc, from }, role: "door_staff" });
});

describe("POST /api/control/check-in", () => {
  it("exige una cuenta del equipo", async () => {
    getControlAccess.mockResolvedValue({ supabase: { rpc }, role: null });
    expect((await post({ token: "abc" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rechaza un token vacío", async () => {
    expect((await post({ token: "  " })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("registra una entrada válida", async () => {
    rpc.mockResolvedValue({ data: { status: "valid", buyer: "Ana" }, error: null });
    expect((await post({ token: "abc" })).status).toBe(200);
  });

  it.each(["already_used", "not_paid", "invalid"])("bloquea el acceso con %s", async (status) => {
    rpc.mockResolvedValue({ data: { status }, error: null });
    expect((await post({ token: "abc" })).status).toBe(422);
  });

  const qrToken = "b".repeat(64);

  it("muestra el nombre del pase en entradas free_access aunque el tier tenga otro nombre", async () => {
    rpc.mockResolvedValue({ data: { status: "valid", tier: "Free Access", buyer: "Ana" }, error: null });
    maybeSingle.mockResolvedValue({ data: { ticket_tiers: { category: "free_access" } } });
    const response = await post({ token: qrToken });
    expect((await response.json()).tier).toBe(FREE_PASS_NAME);
    expect(eq).toHaveBeenCalledWith("qr_token_hash", createHash("sha256").update(qrToken).digest("hex"));
  });

  it("deja el nombre original en otros tiers o si la consulta falla", async () => {
    rpc.mockResolvedValue({ data: { status: "valid", tier: "Cortesía" }, error: null });
    maybeSingle.mockResolvedValue({ data: { ticket_tiers: { category: "custom" } } });
    expect((await (await post({ token: qrToken })).json()).tier).toBe("Cortesía");
    maybeSingle.mockRejectedValue(new Error("rls"));
    expect((await (await post({ token: qrToken })).json()).tier).toBe("Cortesía");
  });
});
