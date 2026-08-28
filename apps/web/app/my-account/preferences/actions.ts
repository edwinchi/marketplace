"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

// Whitelisted, not a raw column name from the client — formData is user-controlled input, and
// writing an arbitrary column name straight from it would let a crafted request touch any column
// on the caller's own row (RLS still scopes it to their own profile, but the column itself must
// stay restricted to what this form is actually meant to edit).
const TOGGLE_FIELDS = ["marketing_emails_opt_in", "notify_new_messages", "notify_offers", "location_sharing_opt_in"] as const;
type ToggleField = (typeof TOGGLE_FIELDS)[number];

export async function updateProfileToggle(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const field = String(formData.get("field") || "");
  if (!TOGGLE_FIELDS.includes(field as ToggleField)) return;

  const value = formData.get("value") === "true";
  const update: Partial<Record<ToggleField, boolean>> =
    field === "marketing_emails_opt_in"
      ? { marketing_emails_opt_in: value }
      : field === "notify_new_messages"
        ? { notify_new_messages: value }
        : field === "notify_offers"
          ? { notify_offers: value }
          : { location_sharing_opt_in: value };

  const supabase = await createClient();
  await supabase.from("profiles").update(update).eq("id", profile.id);

  revalidatePath(String(formData.get("returnTo") || "/my-account/profile"));
}

export async function updatePreferredCity(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const city = String(formData.get("preferred_city") || "").trim();
  const supabase = await createClient();
  await supabase.from("profiles").update({ preferred_city: city || null }).eq("id", profile.id);

  revalidatePath("/my-account/preferences/location");
}
