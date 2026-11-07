import { createHash } from "node:crypto";
import { createServiceClient } from "./supabase/service";

// Backed by rate_limit_events (migration 20260101004700_rate_limiting.sql, not yet run in every
// environment) -- fails OPEN (allows the request) if that table doesn't exist yet or the query
// errors for any other reason, same reasoning as every other not-yet-configured feature in this
// project: a missing migration should degrade to "no rate limiting yet", never to "nobody can sign
// up". Never fails closed on an infra hiccup either, for the same reason.
//
// Retention (owner-approved 2026-11-07, risk R12): rows hold IP addresses and hashed emails, so
// rows older than RETENTION_DAYS are deleted. Each server instance does that at most once per
// PRUNE_EVERY_MS, on its first rate-limit check, so it needs no cron secret or database job.
// No limit may use a window longer than the retention, or old rows it needs would be gone.
export const RATE_LIMIT_RETENTION_DAYS = 7;
const RETENTION_MS = RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const PRUNE_EVERY_MS = 60 * 60 * 1000;
let lastPruneAt = 0;

async function pruneOldEvents(supabase: ReturnType<typeof createServiceClient>, now: number): Promise<void> {
  if (now - lastPruneAt < PRUNE_EVERY_MS) return;
  lastPruneAt = now;
  try {
    await supabase.from("rate_limit_events").delete().lt("created_at", new Date(now - RETENTION_MS).toISOString());
  } catch {
    // Best effort: the next instance or the next hour tries again.
  }
}

// Tests only: forget when this instance last pruned.
export function resetRateLimitPruneClock(): void {
  lastPruneAt = 0;
}

export async function checkRateLimit(bucketKey: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  if (windowSeconds * 1000 > RETENTION_MS) {
    console.error(`checkRateLimit: window ${windowSeconds}s for "${bucketKey.split(":")[0]}" is longer than the ${RATE_LIMIT_RETENTION_DAYS}-day retention`);
  }
  try {
    const supabase = createServiceClient();
    await pruneOldEvents(supabase, Date.now());
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

// Rate-limit key for an email address: a one-way hash, so rate_limit_events never stores the
// address itself (GDPR data minimisation). Case- and whitespace-insensitive, like sign-in.
export function emailBucket(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}
