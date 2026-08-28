"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

// saved_search_owner's RLS policy (FOR ALL, profile_id = current_profile_id()) already permits a
// normal authenticated insert/update/delete on the caller's own rows — no SECURITY DEFINER needed
// here, unlike start_conversation's case.
export async function saveSearch(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const query_text = String(formData.get("q") || "").trim() || null;
  const category_id = String(formData.get("category") || "") || null;
  const name = query_text || "Saved search";

  await supabase.from("saved_searches").insert({
    profile_id: profile.id,
    name,
    query_text,
    category_id,
    filters: { city: String(formData.get("city") || "").trim() || null },
  });

  revalidatePath("/my-account/saved-searches");
  redirect(String(formData.get("returnTo") || "/"));
}

export async function deleteSavedSearch(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  await supabase.from("saved_searches").delete().eq("id", String(formData.get("id"))).eq("profile_id", profile.id);
  revalidatePath("/my-account/saved-searches");
}

export async function toggleSavedSearchChannel(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const isEmail = formData.get("channel") === "email";
  const value = formData.get("value") === "true";

  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .update(isEmail ? { notify_email: value } : { notify_push: value })
    .eq("id", String(formData.get("id")))
    .eq("profile_id", profile.id);
  revalidatePath("/my-account/saved-searches");
}
