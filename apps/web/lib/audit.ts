import { headers } from "next/headers";
import { createServiceClient } from "./supabase/service";
import { clientIpFromHeaders } from "./rate-limit";
import type { Json } from "./supabase/database.types";

// Audit trail for privileged (admin) actions: who did what to which record, the values before and
// after, and from which IP. Written to audit_logs (partitioned by month, RLS on with no policies,
// so only the service role can read or write it). Owner-approved 2026-11-07 (governance audit:
// admin actions used to leave no trace at all).
//
// Never throws: an audit write that fails is logged, but it must not undo or block the admin
// action that already happened (that would make the trail worse, not better).
export type AdminAuditEntry = {
  actorProfileId: string | null;
  action: string; // dotted verb, e.g. "settings.update", "listing.remove", "ai_uses.grant"
  entityType: string; // what was acted on: "app_setting", "listing", "profile", ...
  entityId?: string | null; // a uuid when the target has one; otherwise put the key in `next`
  previous?: Json | null;
  next?: Json | null;
};

export async function recordAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const ip = clientIpFromHeaders(await headers());
    const { error } = await createServiceClient()
      .from("audit_logs")
      .insert({
        actor_id: entry.actorProfileId,
        action: entry.action.slice(0, 100),
        entity_type: entry.entityType.slice(0, 50),
        entity_id: entry.entityId ?? null,
        previous_values: entry.previous ?? null,
        new_values: entry.next ?? null,
        // inet column: only a real address, never the "unknown" placeholder
        ip_address: /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
      });
    if (error) console.error(`audit_logs write failed for ${entry.action}:`, error.message);
  } catch (err) {
    console.error(`audit_logs write failed for ${entry.action}:`, err);
  }
}
