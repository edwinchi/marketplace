"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export async function updateProfile(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const displayName = String(formData.get("display_name") || "").trim();
  const websiteUrlRaw = String(formData.get("website_url") || "").trim();
  const websiteUrl = websiteUrlRaw ? (websiteUrlRaw.startsWith("http") ? websiteUrlRaw : `https://${websiteUrlRaw}`) : null;
  const phoneNumber = String(formData.get("phone_number") || "").trim() || null;
  const postalCode = String(formData.get("postal_code") || "").trim() || null;
  const accountTypeRaw = String(formData.get("account_type") || "private");

  if (!displayName) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ display_name: displayName, website_url: websiteUrl }).eq("id", profile.id);

  // Separate, best-effort update — kept independent so that if phone_number/postal_code don't
  // exist yet on this database (still pending on production), it fails without rolling back the
  // display_name/website_url update above. See the matching comment in profile/page.tsx.
  await supabase.from("profiles").update({ phone_number: phoneNumber, postal_code: postalCode }).eq("id", profile.id);

  // One-way: private -> business is allowed (matches the reference's transparency-law note that
  // you can't switch back from business to private once declared), business -> private is not.
  if (accountTypeRaw === "business" && profile.account_type !== "business") {
    await supabase.from("profiles").update({ account_type: "business" }).eq("id", profile.id);
  }

  revalidatePath("/my-account/profile");
  redirect("/my-account/profile");
}

export async function deleteAccount() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  // Soft delete: other tables (listings, messages, offers, ...) reference profiles.id with no
  // cascade, so a hard delete would fail or orphan real transaction history. Marking the profile
  // deleted and removing the auth account (so the old credentials stop working) is the safe
  // equivalent, same pattern as the existing profiles.status column already supports.
  const supabase = await createClient();
  await supabase.from("profiles").update({ status: "deleted", display_name: null }).eq("id", profile.id);

  const service = createServiceClient();
  await service.auth.admin.deleteUser(user.id);

  await supabase.auth.signOut();
  redirect("/login");
}
