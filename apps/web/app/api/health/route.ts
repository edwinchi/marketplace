import { createClient } from "@supabase/supabase-js";

// Uptime/health probe for monitors (Better Stack, UptimeRobot, Vercel checks) and for verifying a
// deploy: GET https://marketitnow.net/api/health. 200 = app up and database reachable, 503 = the
// database query failed or timed out. Uses the public anon key and reads one row of a public
// table, so it exposes nothing and can't be used to reach anything RLS would refuse. No cookies,
// no session: monitors call it anonymously. /api is already exempt from proxy.ts's login gate.
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

export async function GET() {
  const started = Date.now();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  let database: "up" | "down" = "down";
  let error: string | undefined;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const query = supabase.from("categories").select("id").limit(1).abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    const { error: dbError } = await query;
    if (dbError) error = dbError.code ?? "query_failed";
    else database = "up";
  } catch (e) {
    error = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "unreachable";
  }
  const ok = database === "up";
  return Response.json(
    { ok, database, ...(error ? { error } : {}), version, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
