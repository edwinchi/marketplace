import { createServiceClient } from "./supabase/service";

// Backed by rate_limit_events (migration 20260101004700_rate_limiting.sql, not yet run in every
// environment) -- fails OPEN (allows the request) if that table doesn't exist yet or the query
// errors for any other reason, same reasoning as every other not-yet-configured feature in this
// project: a missing migration should degrade to "no rate limiting yet", never to "nobody can sign
// up". Never fails closed on an infra hiccup either, for the same reason.
export async function checkRateLimit(bucketKey: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count, error } = await supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", bucketKey)
      .gte("created_at", since);

    if (error) return true;
    if ((count ?? 0) >= maxRequests) return false;

    await supabase.from("rate_limit_events").insert({ bucket_key: bucketKey });
    return true;
  } catch {
    return true;
  }
}

// x-forwarded-for can carry a comma-separated chain (client, proxy1, proxy2, ...) -- the first
// entry is the original client, confirmed as the convention Vercel's own edge network uses.
export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
