"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export async function addAddress(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const recipientName = String(formData.get("recipient_name") || "").trim();
  const street = String(formData.get("street") || "").trim();
  const city = String(formData.get("city") || "").trim();
  if (!recipientName || !street || !city) return;

  const supabase = await createClient();
  await supabase.from("addresses").insert({
    profile_id: profile.id,
    label: String(formData.get("label") || "").trim() || null,
    recipient_name: recipientName,
    street,
    city,
    postal_code: String(formData.get("postal_code") || "").trim() || null,
    country_code: String(formData.get("country_code") || "NG"),
  });

  revalidatePath("/messages/address-profile");
}

export async function deleteAddress(formData: FormData) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", String(formData.get("id"))).eq("profile_id", profile.id);
  revalidatePath("/messages/address-profile");
}
