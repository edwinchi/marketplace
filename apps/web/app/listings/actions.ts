"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { toMinorUnits, SUPPORTED_CURRENCIES } from "@/lib/money";
import { getCurrencyForCountry, ANCHOR_COUNTRIES } from "@/lib/countries";
import type { Database } from "@/lib/supabase/database.types";
import { slugPath } from "@/lib/slug";
import { getTextEmbedding } from "@/lib/embeddings";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { getNewListingNotificationsGlobalUnlockSetting } from "@/lib/app-settings";
import { pingIndexNow } from "@/lib/indexnow";
import { translateListingForAllVisitors } from "./translate-action";
import { checkListingContentPolicy } from "@/lib/content-moderation";
import { getNumericSetting } from "@/lib/numeric-settings";
import { getStripe } from "@/lib/stripe";
import { getSiteOrigin } from "@/lib/site-url";
import { tierFromBoostRank } from "@/lib/listing-tiers";

type AttributeValueInsert = Database["public"]["Tables"]["listing_attribute_values"]["Insert"];
type AttributeMultiOptionInsert = Database["public"]["Tables"]["listing_attribute_multi_options"]["Insert"];

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

// Same after()-scheduled, best-effort pattern -- a content-policy pre-screen (lib/content-moderation.ts)
// runs on every new listing, not just ones that used AI photo analysis. Only ever writes when
// flagged: an unflagged result leaves moderation_status at its 'pending' default rather than
// writing 'clear', so a listing this check never got to run for (a failed AI call) reads the same
// as one that passed -- both are "not yet flagged", the honest state either way. Never touches
// `status`/visibility -- flagged listings stay live, surfaced at /admin/moderation for a human to
// actually decide, not auto-removed on an unproven model's say-so.
//
// Service-role client, not the seller's own request-scoped one: moderation_status is column-level
// locked to service_role only (supabase/migrations/20260101007800_listing_moderation_lockdown.sql)
// specifically so a flagged seller can't just PATCH their own listing back to 'clear' themselves --
// the same self-service-bypass concern as listings.published_at and the ad-bump feature.
function enqueueModerationCheck(listingId: string, title: string, description: string) {
  after(async () => {
    const { flagged, reason } = await checkListingContentPolicy(title, description);
    if (!flagged) return;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("listings")
      .update({ moderation_status: "flagged", metadata: { moderation_reason: reason } })
      .eq("id", listingId);
    if (error) console.error(`Failed to record moderation flag for listing ${listingId}:`, error);
  });
}

// Same after()-scheduled, best-effort pattern as enqueueEmbedding above. Permanent, unconditional
// behavior (not a Seller Pro perk, and not gated behind any admin toggle) -- every real listing
// gets translated for every supported non-English visitor, by explicit, repeated request: this is
// a site-wide reach/SEO feature (a French- or Dutch-locale visitor can read any real listing, not
// just ones from paying sellers), not a per-seller productivity perk. The manual "Translate" button
// on the edit-listing page (translateListing in translate-action.ts) stays Seller Pro-exclusive --
// this is only about the automatic background pass every create/update already triggers.
function enqueueTranslation(listingId: string, title: string, description: string) {
  after(async () => {
    const { error } = await translateListingForAllVisitors(listingId, title, description);
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

  // Grouped by attribute id first, not inserted per form-data entry directly: a multi_select
  // renders as several checkboxes sharing one field name (components/listing-attribute-field.tsx),
  // so formData has one entry per checked option, all needing to land in the SAME
  // listing_attribute_multi_options rows for one attribute, not one listing_attribute_values row
  // each (that would violate its (listing_id, attribute_id) primary key on the second checked box).
  const byAttribute = new Map<string, { stableKey: string; dataType: string; values: string[] }>();
  for (const [key, rawValue] of formData.entries()) {
    const match = key.match(ATTR_FIELD_RE);
    if (!match) continue;
    const [, attributeId, stableKey, dataType] = match;
    const value = String(rawValue).trim();
    if (!value) continue;
    const entry = byAttribute.get(attributeId) ?? { stableKey, dataType, values: [] };
    entry.values.push(value);
    byAttribute.set(attributeId, entry);
  }

  const multiOptionRows: AttributeMultiOptionInsert[] = [];
  for (const [attributeId, { stableKey, dataType, values }] of byAttribute) {
    if (dataType === "multi_select") {
      for (const optionId of values) multiOptionRows.push({ listing_id: listingId, attribute_id: attributeId, option_id: optionId });
      continue;
    }

    const value = values[0];
    const row: AttributeValueInsert = { listing_id: listingId, attribute_id: attributeId };
    if (dataType === "single_select") row.value_option_id = value;
    else if (dataType === "integer" || dataType === "decimal") row.value_number = Number(value);
    else if (dataType === "date") row.value_date = value;
    else if (dataType === "boolean") row.value_boolean = value === "true";
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

  if (multiOptionRows.length > 0) {
    const { error } = await supabase.from("listing_attribute_multi_options").insert(multiOptionRows);
    if (error) throw new Error(error.message);
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

// Shared by createListing's tail and updateListing -- starts a Stripe Checkout session for a
// Plus/Premium tier upgrade and redirects there. A no-op (returns, never redirects) for "free" or
// an unrecognized tier value, so callers can invoke this unconditionally with whatever the form
// submitted rather than guarding it themselves.
async function maybeStartTierUpgradeCheckout({
  supabase,
  user,
  profile,
  listingId,
  title,
  listingPath,
  advertiseTier,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { email?: string | null };
  profile: { id: string };
  listingId: string;
  title: string;
  listingPath: string;
  advertiseTier: string;
}): Promise<void> {
  if (advertiseTier !== "plus" && advertiseTier !== "premium") return;
  const stripe = getStripe();
  if (!stripe) return;

  const priceCents = await getNumericSetting(advertiseTier === "plus" ? "listing_tier_plus_price_cents" : "listing_tier_premium_price_cents");
  const origin = await getSiteOrigin();
  const { data: buyerRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = buyerRow?.stripe_customer_id ?? undefined;
  // A stored id only resolves under the mode (test/live) it was created in -- same guard as every
  // other Stripe customer lookup in this codebase.
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = undefined;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { profile_id: profile.id } });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    // TEMPORARY diagnostic: explicit list bypasses Stripe's dynamic/AI-driven payment method
    // eligibility (which was silently excluding iDEAL for these small flat-fee amounts even
    // though it's enabled in the Dashboard) -- confirming live whether this actually unlocks it.
    payment_method_types: ["card", "ideal"],
    line_items: [
      {
        price_data: {
          // Flat platform fee, not proportional to the listing's own price -- always EUR
          // regardless of the listing's own currency_code (see bump-actions.ts's identical fix).
          currency: "eur",
          unit_amount: priceCents,
          product_data: { name: `${advertiseTier === "plus" ? "Plus" : "Premium"} listing: ${title}` },
        },
        quantity: 1,
      },
    ],
    // See app/listings/payment-actions.ts's identical line for why -- confirmed live, not a guess.
    ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
    success_url: `${origin}${listingPath}?tier=success`,
    cancel_url: `${origin}${listingPath}?tier=canceled`,
    metadata: { type: "listing_tier_upgrade", listing_id: listingId, tier: advertiseTier },
  });
  if (session.url) redirect(session.url);
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
  // Currency is an explicit seller choice (a dedicated picker under the price field), not derived
  // from country -- per explicit request, reversing an earlier fix that removed a manual picker
  // over a real country/currency mismatch bug (a Cameroon listing stored as NGN). Still validated
  // against the real currency list server-side (never trust an arbitrary client string into a
  // column exchange-rate conversion later reads), falling back to the country-derived default only
  // if the submitted value is missing or not a real supported code.
  const submittedCurrency = String(formData.get("currency_code") ?? "");
  const currencyCode = (SUPPORTED_CURRENCIES as readonly string[]).includes(submittedCurrency)
    ? (submittedCurrency as (typeof SUPPORTED_CURRENCIES)[number])
    : getCurrencyForCountry(countryCode);
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
  enqueueTranslation(listing.id, title, description);
  enqueueModerationCheck(listing.id, title, description);
  enqueueNewListingNotifications(supabase, listing.id, profile.id, title, countryCode || null);
  after(() => pingIndexNow([`https://marketitnow.net/listings/${slugPath(title, listing.id)}`]));

  revalidatePath("/");
  const listingPath = `/listings/${slugPath(title, listing.id)}`;

  // Plus/Premium (components/listings/advertise-tier-selector.tsx): the listing itself is never
  // blocked on payment -- it's already created and live at the free tier. A paid tier redirects to
  // Stripe instead of the listing page; the webhook (app/api/stripe/webhook/route.ts) applies
  // boost_rank once payment actually succeeds, same "create first, upgrade after" shape as the
  // ad-bump and Business-subscription flows.
  const advertiseTier = String(formData.get("advertise_tier") ?? "free");
  await maybeStartTierUpgradeCheckout({ supabase, user, profile, listingId: listing.id, title, listingPath, advertiseTier });

  redirect(listingPath);
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

  // Currency is now an explicit, independently editable seller choice (see createListing) --
  // validated against the real currency list, falling back to the listing's current currency
  // (fetched below) rather than guessing from country if the submitted value is missing/invalid.
  const { data: currentListing } = await supabase.from("listings").select("currency_code, boost_rank").eq("id", listingId).single();
  const submittedCurrency = String(formData.get("currency_code") ?? "");
  const currencyCode = (SUPPORTED_CURRENCIES as readonly string[]).includes(submittedCurrency)
    ? (submittedCurrency as (typeof SUPPORTED_CURRENCIES)[number])
    : (currentListing?.currency_code ?? "EUR");

  // RLS's listing_write policy already scopes this update to seller_id = current_profile_id().
  const { error: updateError } = await supabase
    .from("listings")
    .update({ title, description, category_id: categoryId, price_minor: toMinorUnits(price), currency_code: currencyCode })
    .eq("id", listingId);
  if (updateError) return { error: updateError.message };

  await supabase.from("listing_attribute_values").delete().eq("listing_id", listingId);
  await supabase.from("listing_attribute_multi_options").delete().eq("listing_id", listingId);
  try {
    await saveAttributeValues(supabase, listingId, formData);
    await updatePhotos(supabase, user.id, listingId, formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save listing details." };
  }

  enqueueEmbedding(supabase, listingId, title, description);
  enqueueTranslation(listingId, title, description);
  enqueueModerationCheck(listingId, title, description);
  after(() => pingIndexNow([`https://marketitnow.net/listings/${slugPath(title, listingId)}`]));

  // The real page lives at a slugged path (/listings/[...slug]) this function has no way to
  // reconstruct without a DB round-trip -- revalidating the literal route pattern instead of a
  // guessed resolved URL is the documented way to invalidate every path under a dynamic segment.
  revalidatePath("/listings/[...slug]", "page");
  const listingPath = `/listings/${slugPath(title, listingId)}`;

  // Only starts a checkout when the submitted tier is actually a change from what's already on
  // the listing -- otherwise re-saving an edit on an already-Plus/Premium listing would silently
  // re-charge the seller every time they touch the form. Picking "Free" while already on a paid
  // tier is a deliberate no-op, not a downgrade/cancellation -- there's no refund flow to pair it
  // with, so boost_rank is simply left as-is rather than taking away something already paid for.
  const advertiseTier = String(formData.get("advertise_tier") ?? "free");
  const currentTier = tierFromBoostRank(currentListing?.boost_rank);
  if (advertiseTier !== currentTier) {
    await maybeStartTierUpgradeCheckout({ supabase, user, profile, listingId, title, listingPath, advertiseTier });
  }

  redirect(listingPath);
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
