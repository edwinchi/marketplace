"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { toMinorUnits } from "@/lib/money";
import type { Database } from "@/lib/supabase/database.types";
import { slugPath } from "@/lib/slug";

type AttributeValueInsert = Database["public"]["Tables"]["listing_attribute_values"]["Insert"];

export type ListingFormState = { error: string | null };

// Dynamic attribute inputs are named attr__<attributeId>__<stableKey>__<dataType> — the form
// already knows this from attributesByCategory (lib/categories.ts), so encoding it here avoids a
// second server-side lookup. It's not a trust boundary: worst case a mismatched dataType just
// lands the value in the wrong (still-typed) column or fails the table's CHECK constraint.
const ATTR_FIELD_RE = /^attr__([^_]+(?:-[^_]+)*)__(.+)__(.+)$/;

async function saveAttributeValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  formData: FormData,
) {
  let conditionStableKey: string | null = null;

  for (const [key, rawValue] of formData.entries()) {
    const match = key.match(ATTR_FIELD_RE);
    if (!match) continue;
    const [, attributeId, stableKey, dataType] = match;
    const value = String(rawValue).trim();
    if (!value) continue;

    const row: AttributeValueInsert = { listing_id: listingId, attribute_id: attributeId };
    if (dataType === "single_select") row.value_option_id = value;
    else if (dataType === "integer" || dataType === "decimal") row.value_number = Number(value);
    else if (dataType === "date") row.value_date = value;
    else row.value_text = value;

    const { error } = await supabase.from("listing_attribute_values").insert(row);
    if (error) throw new Error(error.message);

    if (stableKey === "condition" && dataType === "single_select") {
      const { data: option } = await supabase
        .from("attribute_options")
        .select("stable_key")
        .eq("id", value)
        .single();
      conditionStableKey = option?.stable_key ?? null;
    }
  }

  if (conditionStableKey) {
    await supabase.from("listings").update({ condition_code: conditionStableKey }).eq("id", listingId);
  }
}

async function uploadPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
  listingId: string,
  formData: FormData,
) {
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() || "jpg";
    // First path segment must be the uploader's auth.uid() — storage RLS (20260101001900
    // migration) checks exactly this, matching client-writable paths to their owner.
    const path = `${authUserId}/${listingId}/${i}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listings").upload(path, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    await supabase.from("listing_media").insert({ listing_id: listingId, storage_key: path, media_type: "image", sort_order: i });
  }
}

// The seller's own website — shown alongside "Message seller" on every one of their listings, not
// stored per-listing. Bare domains ("example.com") are accepted and given a scheme so the eventual
// <a href> is a real, clickable link rather than a relative path on this site.
function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export async function createListing(_prevState: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { error: "You must be signed in to post a listing." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const currencyCode = String(formData.get("currency_code") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "");
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const pickupAvailable = formData.get("pickup_available") === "on";
  const deliveryAvailable = formData.get("delivery_available") === "on";
  const offersAllowed = formData.get("offers_allowed") === "on";
  const priceType = formData.get("price_type") === "bidding" ? "bidding" : "fixed";
  const websiteUrlRaw = String(formData.get("website_url") ?? "");

  if (!title || !description || !categoryId || !price || !currencyCode || !city || !countryCode) {
    return { error: "Please fill in every required field." };
  }
  if (websiteUrlRaw.trim() && !normalizeWebsiteUrl(websiteUrlRaw)) {
    return { error: "That website address doesn't look right." };
  }

  const supabase = await createClient();

  if (websiteUrlRaw.trim()) {
    await supabase.from("profiles").update({ website_url: normalizeWebsiteUrl(websiteUrlRaw) }).eq("id", profile.id);
  }

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .insert({ city, country_code: countryCode, postal_code: postalCode || null })
    .select("id")
    .single();
  if (locationError || !location) return { error: locationError?.message ?? "Could not save location." };

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      seller_id: profile.id,
      category_id: categoryId,
      location_id: location.id,
      source_language: "en",
      title,
      description,
      price_minor: toMinorUnits(price),
      currency_code: currencyCode,
      price_type: priceType,
      pickup_available: pickupAvailable,
      delivery_available: deliveryAvailable,
      offers_allowed: offersAllowed,
      status: "active",
      published_at: new Date().toISOString(),
      // 60 days, matching common classifieds convention (Marktplaats et al.) — the expiry sweep
      // (supabase/migrations/20260101004200_listing_expiry.sql) flips anything past this to
      // 'expired' so the marketplace feed doesn't fill up with abandoned listings.
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (listingError || !listing) return { error: listingError?.message ?? "Could not create listing." };

  try {
    await saveAttributeValues(supabase, listing.id, formData);
    await uploadPhotos(supabase, user.id, listing.id, formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save listing details." };
  }

  revalidatePath("/");
  redirect(`/listings/${slugPath(title, listing.id)}`);
}

export async function updateListing(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "You must be signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const currencyCode = String(formData.get("currency_code") ?? "");
  const websiteUrlRaw = String(formData.get("website_url") ?? "");

  if (!title || !description || !categoryId || !price || !currencyCode) {
    return { error: "Please fill in every required field." };
  }
  if (websiteUrlRaw.trim() && !normalizeWebsiteUrl(websiteUrlRaw)) {
    return { error: "That website address doesn't look right." };
  }

  const supabase = await createClient();

  // Seller-wide, not per-listing (same field createListing writes) — an empty submission here
  // intentionally clears it, unlike create, since this is the one place a seller can remove it.
  await supabase.from("profiles").update({ website_url: normalizeWebsiteUrl(websiteUrlRaw) }).eq("id", profile.id);

  // RLS's listing_write policy already scopes this update to seller_id = current_profile_id().
  const { error: updateError } = await supabase
    .from("listings")
    .update({ title, description, category_id: categoryId, price_minor: toMinorUnits(price), currency_code: currencyCode })
    .eq("id", listingId);
  if (updateError) return { error: updateError.message };

  await supabase.from("listing_attribute_values").delete().eq("listing_id", listingId);
  try {
    await saveAttributeValues(supabase, listingId, formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save listing details." };
  }

  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${slugPath(title, listingId)}`);
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();
  await supabase.from("listings").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", listingId);
  revalidatePath("/");
  revalidatePath("/my-account/my-listings");
  redirect("/my-account/my-listings");
}

// Marks a deal done without deleting anything — reuses the same "hidden from browse" mechanism as
// delete (the active-feed RLS policy only ever matches status='active'), but keeps the listing
// visible on the seller's own profile/history as a completed sale, unlike a delete.
export async function markListingSold(listingId: string) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase.from("listings").update({ status: "sold" }).eq("id", listingId).eq("seller_id", profile.id);
  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
}

// Undoes markListingSold, or brings back a listing the expiry sweep flipped to 'expired' — same
// action either way, since both just need status returned to 'active' to reappear in browse/search.
export async function relistListing(listingId: string) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase
    .from("listings")
    .update({ status: "active", expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() })
    .eq("id", listingId)
    .eq("seller_id", profile.id);
  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
}

export type DeleteResult = { error: string | null };

// Real hard delete — removes the row entirely, unlike deleteListing()'s soft delete above.
// listing_media/listing_translations/listing_attribute_values/listing_attribute_multi_options/
// listing_ai_metadata/favorites all cascade on listings.id, so those go with it. offers and
// conversations do NOT cascade (real transaction/message history shouldn't silently vanish), so
// deleting a listing with either fails with a foreign-key violation — caught below and surfaced
// as a clear reason instead of a raw DB error, with the existing soft delete as the fallback.
export async function deleteListingPermanently(listingId: string): Promise<DeleteResult> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: media } = await supabase.from("listing_media").select("storage_key").eq("listing_id", listingId);

  const { error } = await supabase.from("listings").delete().eq("id", listingId).eq("seller_id", profile.id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Can't permanently delete this listing — it has offers or messages tied to it that need to stay. Use Remove instead to hide it from buyers.",
      };
    }
    return { error: error.message };
  }

  // listing_media rows are already gone (cascade) — the actual uploaded photo files in Storage
  // are a separate thing and don't cascade, so remove them explicitly or they'd sit orphaned.
  if (media?.length) {
    await supabase.storage.from("listings").remove(media.map((m) => m.storage_key));
  }

  revalidatePath("/");
  revalidatePath("/my-account/my-listings");
  return { error: null };
}
