import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase");
const issuance = readFileSync(join(dir, "ticket-issuance.sql"), "utf8");
const allSql = [
  ...readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => join(dir, f)),
  ...readdirSync(join(dir, "migrations")).map((f) => join(dir, "migrations", f)),
].map((path) => readFileSync(path, "utf8")).join("\n");

describe("permisos y definiciones SQL", () => {
  it("define check_in_ticket una sola vez para que reejecutar SQL no la pise", () => {
    expect(allSql.match(/create or replace function public\.check_in_ticket/g)).toHaveLength(1);
  });

  it("el check-in acepta entradas Free Access y cortesías", () => {
    expect(issuance).toMatch(/source in \('free_access','courtesy'\)/);
  });

  it("solo service_role puede emitir Free Access", () => {
    const signature = "public\\.issue_free_access_ticket\\(uuid,text,text,text,boolean\\)";
    expect(issuance).toMatch(new RegExp(`revoke all on function ${signature} from public, anon, authenticated;`));
    expect(issuance).toMatch(new RegExp(`grant execute on function ${signature} to service_role;`));
  });
});
