import { History } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

type Row = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  new_values: unknown;
  created_at: string;
  profiles: { username: string | null; display_name: string | null } | { username: string | null; display_name: string | null }[] | null;
};

// The last admin actions from audit_logs (written by lib/audit.ts): who, what, when, and the new
// value. Read with the service role: audit_logs has RLS on and no policies, so no one can read it
// through the API, not even admins.
export async function AuditLogCard() {
  const { data, error } = await createServiceClient()
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, new_values, created_at, profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(15);
  const rows = (data ?? []) as Row[];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
        <History className="size-4 text-muted-foreground" aria-hidden />
        Recent admin actions
      </p>
      {error ? (
        <p className="mt-2 text-xs text-destructive">Couldn&apos;t read the audit log: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nothing recorded yet. Settings changes, moderation, AI-use grants, backfills and admin sign-ins appear here.</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y text-xs">
          {rows.map((r) => {
            const actor = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            const detail = r.new_values ? JSON.stringify(r.new_values) : r.entity_id ?? "";
            return (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
                <time dateTime={r.created_at} className="text-muted-foreground tabular-nums">
                  {new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Europe/Amsterdam", dateStyle: "short", timeStyle: "short" })}
                </time>
                <span className="font-medium text-foreground">{actor?.display_name || actor?.username || "unknown"}</span>
                <span className="font-mono text-[#082040]">{r.action}</span>
                {detail && <span className="min-w-0 truncate text-muted-foreground" title={detail}>{detail}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
