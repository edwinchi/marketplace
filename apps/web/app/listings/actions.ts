"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { toMinorUnits } from "@/lib/money";
import { getCurrencyForCountry, ANCHOR_COUNTRIES } from "@/lib/countries";
import type { Database } from "@/lib/supabase/database.types";
import { slugPath } from "@/lib/slug";
import { getTextEmbedding } from "@/lib/embeddings";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { getNewListingNotificationsGlobalUnlockSetting } from "@/lib/app-settings";
import { translateListing } from "./translate-action";

type AttributeValueInsert = Database["public"]["Tables"]["listing_attribute_values"]["Insert"];

export type ListingFormState = { error: string | null };

// Fire-and-forget, scheduled via next/server's after() rather than a bare unawaited promise --
// this runs inside a Server Action that ends in redirect(), and a serverless function isn't
// guaranteed to keep running background work once its response has gone out. Never blocks listing
// create/update on embedding latency or failure (see lib/embeddings.ts's own best-effort design);
// worst case a listing's title_embedding stays null and it just doesn't participate in semantic
// search (see supabase/migrations/20260101005700_semantic_search.sql), same as any older listing.
function enqueueEmbedding(supabase: Awaited<ReturnType<typeof createClient>>, listingId: string, title: string, description: string) {
  after(async () => {
    const embedding = await getTextEmbedding(`${title}\n${description}`);
    if (!embedding) return;
    const { error } = await supabase.from("listings").update({ title_embedding: embedding as unknown as string }).eq("id", listingId);
    if (error) console.error(`Failed to store title_embedding for listing ${listingId}:`, error);
  });
}

// Same after()-scheduled, best-effort pattern as enqueueEmbedding above. Checks eligibility first
// (rather than just calling translateListing and swallowing its error) so a seller without Seller
// Pro access -- by far the common case whenever the admin's global unlock (app_settings.
// seller_pro_global_unlock, see lib/seller-pro.ts) is off -- doesn't log a spurious "not eligible"
// error on every single listing save site-wide; a real translation failure once someone IS
// eligible still gets logged.
function enqueueTranslation(listingId: string) {
  after(async () => {
    if (!(await isSellerProSubscriber())) return;
    const { error } = await translateListing(listingId, "fr");
    if (error) console.error(`Failed to auto-translate listing ${listingId}:`, error);
  });
}

// Same after()-scheduled, best-effort pattern as the two helpers above -- fans a "new listing"
// notification out to every registered user who hasn't opted out (profiles.notify_new_listings,
// default true), in one set-based INSERT ... SELECT (see
// supabase/migrations/20260101006100_new_listing_notifications.sql) rather than fetching every
// eligible profile id into this request and inserting row-by-row. Only wired into createListing,
// not updateListing -- this is about new postings, not edits to existing ones.
//
// The broadcast itself is a Seller Pro perk for the POSTER, not a gate on who can receive it --
// a Seller Pro seller's listing reaches every opted-in registered user in the listing's own
// country; a non-subscriber's listing doesn't get this treatment at all, unless the admin's global
// unlock (app_settings.new_listing_notifications_global_unlock, see lib/app-settings.ts) makes it
// free for every seller. isSellerProSubscriber() here reflects the CURRENT caller, i.e. the seller
// who just posted, since this only ever runs from within their own createListing call.
//
// countryCode scopes recipients to profiles.country_code (see
// supabase/migrations/20260101006200_profile_country_and_notification_scoping.sql) -- an explicit,
// user-set field, not inferred -- to cut exposure to people not really in that market and the size
// of each broadcast. A recipient with no country set never matches and won't be notified; only a
// null countryCode here (which shouldn't happen in practice, every listing requires a country at
// creation) would skip the filter and notify everyone regardless of country.
function enqueueNewListingNotifications(supabase: Awaited<ReturnType<typeof createClient>>, listingId: string, sellerId: string, title: string, countryCode: string | null) {
  after(async () => {
    const [sellerIsPro, globalUnlock] = await Promise.all([isSellerProSubscriber(), getNewListingNotificationsGlobalUnlockSetting()]);
    if (!sellerIsPro && !globalUnlock) return;

    const { error } = await supabase.rpc("notify_new_listing", { p_listing_id: listingId, p_seller_id: sellerId, p_title: title, p_country_code: countryCode });
    if (error) console.error(`Failed to fan out new-listing notifications for listing ${listingId}:`, error);
  });
}

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

// Reconciles listing_media with the edit form's photo manager (components/listings/edit-photo-
// manager.tsx) against a `photo_order` list of `existing:<mediaId>` / `new` tokens in final order,
// rather than diffing before/after: existing photos not named in it are removed (row + storage
// object — best-effort on the storage side, since a stray orphaned object is harmless but blocking
// the whole save on a transient storage hiccup isn't worth it), survivors get a fresh sort_order
// matching their new position, and "new" tokens consume the next file from the `photos` input in
// order and get uploaded fresh. Guarded by photo_manager_present so a form that doesn't render the
// manager at all (there isn't one today, but nothing here should assume it always will) leaves
// photos untouched instead of reading its absence as "remove everything".
async function updatePhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUserId: string,
  listingId: string,
  formData: FormData,
) {
  if (formData.get("photo_manager_present") !== "1") return;

  const order = formData.getAll("photo_order").map(String);
  const newFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  const { data: currentRows } = await supabase.from("listing_media").select("id, storage_key").eq("listing_id", listingId);
  const keptIds = new Set(order.filter((t) => t.startsWith("existing:")).map((t) => t.slice("existing:".length)));

  for (const row of (currentRows ?? []).filter((r) => !keptIds.has(r.id))) {
    await supabase.storage.from("listings").remove([row.storage_key]);
    await supabase.from("listing_media").delete().eq("id", row.id);
  }

  let newFileIndex = 0;
  for (let sortOrder = 0; sortOrder < order.length; sortOrder++) {
    const token = order[sortOrder];
    if (token.startsWith("existing:")) {
      await supabase.from("listing_media").update({ sort_order: sortOrder }).eq("id", token.slice("existing:".length));
      continue;
    }
    const file = newFiles[newFileIndex++];
    if (!file) continue;
    const ext = file.name.split(".").pop() || "jpg";
    // A random filename, not the create-flow's index-based one -- an edit can add new photos
    // alongside survivors that already occupy whatever index-based names they were given at
    // creation, so reusing 0.jpg/1.jpg here risks overwriting one of those instead of adding a
    // new object.
    const path = `${authUserId}/${listingId}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listings").upload(path, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    await supabase.from("listing_media").insert({ listing_id: listingId, storage_key: path, media_type: "image", sort_order: sortOrder });
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
  const city = String(formData.get("city") ?? "").trim();
  const countryCode = String(formData.get("country_code") ?? "");
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const pickupAvailable = formData.get("pickup_available") === "on";
  const deliveryAvailable = formData.get("delivery_available") === "on";
  const offersAllowed = formData.get("offers_allowed") === "on";
  const priceType = formData.get("price_type") === "bidding" ? "bidding" : "fixed";
  const websiteUrlRaw = String(formData.get("website_url") ?? "");

  if (!title || !description || !categoryId || !price || !city || !countryCode) {
    return { error: "Please fill in every required field." };
  }
  // Validated against the real country list server-side -- a direct call to this action (bypassing
  // the <select> the UI renders) with a bogus code would otherwise silently store a garbage
  // locations.country_code and price in EUR (getCurrencyForCountry's fallback for an unrecognized
  // code), the same class of bug this whole country/currency fix was about. Same check
  // updateCountry() (my-account/preferences/actions.ts) already applies to the profile-level field.
  if (!ANCHOR_COUNTRIES.some((c) => c.code === countryCode)) {
    return { error: "Please choose a valid country." };
  }
  // Currency is derived from country server-side, not trusted from the client -- a stale form,
  // browser extension, or a client bug could otherwise submit a currency_code that doesn't match
  // the country actually being saved (confirmed live in production before this fix: real listings
  // existed with mismatched country/currency pairs, e.g. a Cameroon listing stored as NGN).
  const currencyCode = getCurrencyForCountry(countryCode);
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

  enqueueEmbedding(supabase, listing.id, title, description);
  enqueueTranslation(listing.id);
  enqueueNewListingNotifications(supabase, listing.id, profile.id, title, countryCode || null);

  revalidatePath("/");
  redirect(`/listings/${slugPath(title, listing.id)}`);
}

export async function updateListing(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { error: "You must be signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const websiteUrlRaw = String(formData.get("website_url") ?? "");

  if (!title || !description || !categoryId || !price) {
    return { error: "Please fill in every required field." };
  }
  if (websiteUrlRaw.trim() && !normalizeWebsiteUrl(websiteUrlRaw)) {
    return { error: "That website address doesn't look right." };
  }

  const supabase = await createClient();

  // Seller-wide, not per-listing (same field createListing writes) — an empty submission here
  // intentionally clears it, unlike create, since this is the one place a seller can remove it.
  await supabase.from("profiles").update({ website_url: normalizeWebsiteUrl(websiteUrlRaw) }).eq("id", profile.id);

  // currency_code is deliberately not updated here -- it's derived from the listing's country at
  // creation (see createListing), and country isn't editable post-creation (v1 limitation), so
  // there's nothing for currency to legitimately change to. Not accepting it from the client at
  // all avoids the edit-time half of the country/currency mismatch bug this whole change fixes.
  // RLS's listing_write policy already scopes this update to seller_id = current_profile_id().
  const { error: updateError } = await supabase
    .from("listings")
    .update({ title, description, category_id: categoryId, price_minor: toMinorUnits(price) })
    .eq("id", listingId);
  if (updateError) return { error: updateError.message };

  await supabase.from("listing_attribute_values").delete().eq("listing_id", listingId);
  try {
    await saveAttributeValues(supabase, listingId, formData);
    await updatePhotos(supabase, user.id, listingId, formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save listing details." };
  }

  enqueueEmbedding(supabase, listingId, title, description);
  enqueueTranslation(listingId);

  // The real page lives at a slugged path (/listings/[...slug]) this function has no way to
  // reconstruct without a DB round-trip -- revalidating the literal route pattern instead of a
  // guessed resolved URL is the documented way to invalidate every path under a dynamic segment.
  revalidatePath("/listings/[...slug]", "page");
  redirect(`/listings/${slugPath(title, listingId)}`);
}

export async function deleteListing(listingId: string) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase.from("listings").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", listingId).eq("seller_id", profile.id);
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
  // The real page lives at a slugged path (/listings/[...slug]) this function has no way to
  // reconstruct without a DB round-trip -- revalidating the literal route pattern instead of a
  // guessed resolved URL is the documented way to invalidate every path under a dynamic segment.
  revalidatePath("/listings/[...slug]", "page");
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
  // The real page lives at a slugged path (/listings/[...slug]) this function has no way to
  // reconstruct without a DB round-trip -- revalidating the literal route pattern instead of a
  // guessed resolved URL is the documented way to invalidate every path under a dynamic segment.
  revalidatePath("/listings/[...slug]", "page");
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
