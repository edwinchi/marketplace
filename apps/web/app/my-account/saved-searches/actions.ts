"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

// saved_search_owner's RLS policy (FOR ALL, profile_id = current_profile_id()) already permits a
// normal authenticated insert/update/delete on the caller's own rows — no SECURITY DEFINER needed
// here, unlike start_conversation's case.
// Stores every filter the homepage applies (app/page.tsx), not just q/category/city -- price range
// and condition used to be silently dropped, so an alert for "bikes under €200" would have matched
// every bike. Price bounds are kept in the app's ×100 minor units, and the results page URL is kept
// alongside so a saved-search notification opens exactly what was saved
// (supabase/migrations/20260101009100_saved_search_alerts.sql reads all of these).
export async function saveSearch(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const field = (key: string) => String(formData.get(key) || "").trim();
  const query_text = field("q") || null;
  const category_id = field("category") && field("category") !== "all" ? field("category") : null;
  const city = field("city") || null;
  const condition = field("condition") || null;
  const toMinor = (value: string) => {
    const n = Number(value);
    return value && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };
  const priceMinMinor = toMinor(field("priceMin"));
  const priceMaxMinor = toMinor(field("priceMax"));

  const params = new URLSearchParams();
  if (query_text) params.set("q", query_text);
  if (category_id) params.set("category", category_id);
  if (city) params.set("city", city);
  if (priceMinMinor != null) params.set("priceMin", field("priceMin"));
  if (priceMaxMinor != null) params.set("priceMax", field("priceMax"));
  if (condition) params.set("condition", condition);
  const url = params.size ? `/?${params.toString()}` : "/";

  await supabase.from("saved_searches").insert({
    profile_id: profile.id,
    name: query_text || city || "Saved search",
    query_text,
    category_id,
    filters: { city, condition, priceMinMinor, priceMaxMinor, url },
  });

  revalidatePath("/my-account/saved-searches");
  // Same-site paths only -- never a redirect target taken verbatim from form data.
  const returnTo = field("returnTo");
  redirect(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
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
