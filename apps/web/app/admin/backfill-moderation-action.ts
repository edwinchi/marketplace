"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { checkListingContentPolicy } from "@/lib/content-moderation";

// Smaller batch than the embeddings backfill: each listing is a full LLM call (a few seconds on
// the free-tier chain), and a Server Action runs inside a serverless function with a real timeout.
const BACKFILL_BATCH_SIZE = 20;

// Screens listings still at moderation_status 'pending' -- ones created before the pre-screen
// recorded 'clear' for a pass, or whose background check failed -- with the exact same
// checkListingContentPolicy() every create/edit runs (app/listings/actions.ts). A listing whose AI
// call fails again stays 'pending' and is retried by the next click, never marked as passed.
// Service-role client: moderation_status is column-locked to service_role, and this writes across
// every seller's listings.
export async function backfillListingModeration(): Promise<{ processed: number; flagged: number; failed: number; remaining: number }> {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { data: listings, error: selectError } = await supabase
    .from("listings")
    .select("id, title, description")
    .eq("moderation_status", "pending")
    .neq("status", "deleted")
    .limit(BACKFILL_BATCH_SIZE);
  if (selectError) throw new Error(selectError.message);

  let processed = 0;
  let flagged = 0;
  let failed = 0;
  for (const listing of listings ?? []) {
    const result = await checkListingContentPolicy(listing.title, listing.description ?? "");
    if (!result.checked) {
      failed++;
      continue;
    }
    const { error } = await supabase
      .from("listings")
      .update(
        result.flagged
          ? { moderation_status: "flagged", metadata: { moderation_reason: result.reason } }
          : { moderation_status: "clear" },
      )
      .eq("id", listing.id);
    if (error) {
      console.error(`Failed to record moderation result for listing ${listing.id}:`, error);
      failed++;
    } else {
      processed++;
      if (result.flagged) flagged++;
    }
  }

  const { count: remaining } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("moderation_status", "pending")
    .neq("status", "deleted");

  return { processed, flagged, failed, remaining: remaining ?? 0 };
}
