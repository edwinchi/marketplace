"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { getTextEmbedding } from "@/lib/embeddings";

// Capped per call rather than looping over every listing in one invocation -- a Server Action
// still runs inside a serverless function with a real timeout, and a marketplace with thousands of
// listings could otherwise never finish in one request. The admin button re-runs this until
// `remaining` hits 0; each call only ever touches listings still missing an embedding, so repeated
// clicks are safe and never redo work.
const BACKFILL_BATCH_SIZE = 100;

// Runs the same real-title-embedding logic app/listings/actions.ts already does for every new
// create/update, just retroactively -- for listings that existed before semantic search shipped,
// or whose background embedding call failed. Uses the service-role client deliberately: this needs
// to write across every seller's listings, not just the calling admin's own, and RLS's listing_write
// policy (scoped to seller_id = current_profile_id()) would otherwise silently update zero rows for
// anyone else's.
export async function backfillListingEmbeddings(): Promise<{ processed: number; failed: number; remaining: number }> {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, description")
    .is("title_embedding", null)
    .neq("status", "deleted")
    .limit(BACKFILL_BATCH_SIZE);

  let processed = 0;
  let failed = 0;
  for (const listing of listings ?? []) {
    const embedding = await getTextEmbedding(`${listing.title}\n${listing.description ?? ""}`);
    if (!embedding) {
      failed++;
      continue;
    }
    const { error } = await supabase.from("listings").update({ title_embedding: embedding as unknown as string }).eq("id", listing.id);
    if (error) failed++;
    else processed++;
  }

  const { count: remaining } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .is("title_embedding", null)
    .neq("status", "deleted");

  return { processed, failed, remaining: remaining ?? 0 };
}
