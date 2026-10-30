import { NextResponse } from "next/server";
export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  return NextResponse.json({
    app: "NERO",
    status: configured ? "configured" : "demo",
    checks: { supabase: configured ? "configured" : "not_configured" },
  });
}
