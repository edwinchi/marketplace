"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

// Service-role client, not the request-scoped one -- an admin reviewing someone else's listing
// isn't its seller, so the normal listing_write RLS policy (seller_id = current_profile_id())
// wouldn't allow either action below.
export async function clearModerationFlag(listingId: string) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { error } = await supabase.from("listings").update({ moderation_status: "clear" }).eq("id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/moderation");
}

// Same soft-delete the seller's own deleteListing() uses (app/listings/actions.ts) -- status
// change only, nothing destroyed, so it's reversible if this turns out to be a false positive.
export async function removeFlaggedListing(listingId: string) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("listings")
    .update({ status: "deleted", deleted_at: new Date().toISOString(), moderation_status: "clear" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/moderation");
}
