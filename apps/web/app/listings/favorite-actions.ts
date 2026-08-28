"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export async function toggleFavorite(listingId: string, currentlyFavorited: boolean) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to save favorites." };

  const supabase = await createClient();
  if (currentlyFavorited) {
    await supabase.from("favorites").delete().eq("profile_id", profile.id).eq("listing_id", listingId);
  } else {
    await supabase.from("favorites").insert({ profile_id: profile.id, listing_id: listingId });
  }
  revalidatePath("/");
  return { error: null };
}
