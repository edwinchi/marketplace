"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export async function followSeller(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const sellerProfileId = String(formData.get("sellerProfileId"));
  if (sellerProfileId === profile.id) return; // can't follow yourself

  const supabase = await createClient();
  // upsert + ignoreDuplicates rather than plain insert — clicking "Follow" on an already-followed
  // seller (e.g. a stale page, double-click) would otherwise hit the primary key and error.
  await supabase
    .from("favorite_sellers")
    .upsert({ profile_id: profile.id, seller_profile_id: sellerProfileId }, { onConflict: "profile_id,seller_profile_id", ignoreDuplicates: true });
  revalidatePath(String(formData.get("returnTo") || "/"));
  revalidatePath("/my-account/favorite-sellers");
}

export async function unfollowSeller(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const sellerProfileId = String(formData.get("sellerProfileId"));
  const supabase = await createClient();
  await supabase.from("favorite_sellers").delete().eq("profile_id", profile.id).eq("seller_profile_id", sellerProfileId);
  revalidatePath(String(formData.get("returnTo") || "/"));
  revalidatePath("/my-account/favorite-sellers");
}
