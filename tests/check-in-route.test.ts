import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getControlAccess = vi.fn();
vi.mock("@/lib/supabase/control", () => ({ getControlAccess }));

const { POST } = await import("@/app/api/control/check-in/route");

const post = (body: unknown) => POST(new Request("https://nero.test/api/control/check-in", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  getControlAccess.mockResolvedValue({ supabase: { rpc }, role: "door_staff" });
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
});
