import { createServiceClient } from "./supabase/service";

export type HealthCheckResult = {
  checkedAt: string;
  allPassed: boolean;
  failures: { check: string; name?: string; detail?: string }[];
};

// Reads the latest row written by run_health_check() (supabase/migrations/20260101006800_health_check_system.sql),
// which pg_cron runs every 30 minutes independent of this app being deployed or a chat session
// being open. This is a plain read of that result, not a live probe -- keeps the admin page fast
// and free of any per-load cost.
export async function getLatestHealthCheck(): Promise<HealthCheckResult | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("health_check_log")
      .select("checked_at, all_passed, failures")
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { checkedAt: data.checked_at, allPassed: data.all_passed, failures: (data.failures as HealthCheckResult["failures"]) ?? [] };
  } catch {
    return null;
  }
}
