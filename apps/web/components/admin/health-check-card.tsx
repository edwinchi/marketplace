import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import type { HealthCheckResult } from "@/lib/health-check";

// Runs every 30 minutes via pg_cron (see supabase/migrations/20260101006800_health_check_system.sql),
// independent of any deploy or chat session -- this card just shows the last real result, it
// doesn't probe anything itself. Built directly after a real outage where app code called two
// database functions a migration hadn't created yet, silently breaking AI photo analysis for
// hours with nothing surfacing it -- this is what would have caught that within 30 minutes.
export function HealthCheckCard({ result }: { result: HealthCheckResult | null }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
        {!result ? (
          <HelpCircle className="size-4 text-muted-foreground" />
        ) : result.allPassed ? (
          <CheckCircle2 className="size-4 text-[#008848]" />
        ) : (
          <AlertTriangle className="size-4 text-destructive" />
        )}
        System health check
      </p>

      {!result ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No health check has run yet, or the check itself couldn&apos;t be reached — this should populate within 30 minutes
          of the migration that creates it being run.
        </p>
      ) : result.allPassed ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Everything checked out as of {new Date(result.checkedAt).toLocaleString()} — every AI/listing database function the
          app depends on exists, and the profiles-table lockdown hasn&apos;t regressed.
        </p>
      ) : (
        <div className="mt-2">
          <p className="text-xs font-medium text-destructive">
            {result.failures.length} issue{result.failures.length === 1 ? "" : "s"} found as of {new Date(result.checkedAt).toLocaleString()}:
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
            {result.failures.map((f, i) => (
              <li key={i} className="rounded bg-destructive/5 px-2 py-1">
                {f.check === "missing_function" ? (
                  <>Missing database function <code className="rounded bg-muted px-1 py-0.5">{f.name}</code> — a migration creating it likely hasn&apos;t been run yet.</>
                ) : f.check === "profiles_rls_regression" ? (
                  <>Profiles-table security regression — the old public-read policy is back. This is the exact bug fixed earlier and needs immediate attention.</>
                ) : (
                  JSON.stringify(f)
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">Runs automatically every 30 minutes via a database-side scheduled job — this keeps working even if no one is looking at this page.</p>
    </div>
  );
}
