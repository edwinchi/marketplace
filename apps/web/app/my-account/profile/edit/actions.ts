"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export async function updateProfile(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const displayName = String(formData.get("display_name") || "").trim();
  const websiteUrlRaw = String(formData.get("website_url") || "").trim();
  const websiteUrl = websiteUrlRaw ? (websiteUrlRaw.startsWith("http") ? websiteUrlRaw : `https://${websiteUrlRaw}`) : null;
  const phoneNumber = String(formData.get("phone_number") || "").trim() || null;
  const postalCode = String(formData.get("postal_code") || "").trim() || null;

  if (!displayName) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ display_name: displayName, website_url: websiteUrl }).eq("id", profile.id);

  // Separate, best-effort update — kept independent so that if phone_number/postal_code don't
  // exist yet on this database (still pending on production), it fails without rolling back the
  // display_name/website_url update above. See the matching comment in profile/page.tsx.
  await supabase.from("profiles").update({ phone_number: phoneNumber, postal_code: postalCode }).eq("id", profile.id);

  revalidatePath("/my-account/profile");
  redirect("/my-account/profile");
}
