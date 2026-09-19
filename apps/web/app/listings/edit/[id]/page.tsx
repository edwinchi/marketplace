import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { updateListing } from "@/app/listings/actions";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { resolveMediaUrl } from "@/lib/media";
import { ListingForm } from "@/components/listing-form";
import { LISTING_TRANSLATION_TARGETS } from "@/lib/listing-translations";
import { slugPath } from "@/lib/slug";
import { getNumericSetting } from "@/lib/numeric-settings";
import { tierFromBoostRank } from "@/lib/listing-tiers";

// Not part of the /listings/[...slug] catch-all -- a catch-all must be the last segment of a
// route, so "edit" can't nest inside it. This lives as a sibling static route instead (Next.js
// prioritizes a literal segment like "edit" over the catch-all at the same level). No slug
// decoration needed here since this page is owner-only, never shared/indexed.
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, description, category_id, price_minor, currency_code, seller_id, boost_rank")
    .eq("id", id)
    .single();
  if (!listing) notFound();
  if (listing.seller_id !== profile.id) redirect(`/listings/${slugPath(listing.title, id)}`);

  const [
    { categoryOptions, attributesByCategory },
    { data: media },
    aiUsage,
    isSellerPro,
    { data: translations },
    { data: attributeValues },
    { data: multiOptions },
    plusPriceCents,
    premiumPriceCents,
  ] = await Promise.all([
    getCategoriesAndAttributes(),
    supabase.from("listing_media").select("id, storage_key").eq("listing_id", id).eq("media_type", "image").order("sort_order"),
    getAiUsageStatus(),
    isSellerProSubscriber(),
    supabase.from("listing_translations").select("language_code").eq("listing_id", id).in("language_code", [...LISTING_TRANSLATION_TARGETS]),
    supabase
      .from("listing_attribute_values")
      .select("value_text, value_number, value_date, value_boolean, value_option_id, attributes(stable_key)")
      .eq("listing_id", id),
    supabase.from("listing_attribute_multi_options").select("option_id, attributes(stable_key)").eq("listing_id", id),
    getNumericSetting("listing_tier_plus_price_cents"),
    getNumericSetting("listing_tier_premium_price_cents"),
  ]);
  const initialPhotos = (media ?? []).map((m) => ({ id: m.id, url: resolveMediaUrl(m.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) }));

  // Keyed by stableKey (not attribute id) to match AttributeField's defaultValue contract --
  // single_select/boolean/etc. resolve to the option id or raw value as a plain string; multi_select
  // collects every matching row's option_id into an array instead.
  const attributeDefaultValues: Record<string, string | string[]> = {};
  for (const av of attributeValues ?? []) {
    const attr = Array.isArray(av.attributes) ? av.attributes[0] : av.attributes;
    if (!attr?.stable_key) continue;
    const value = av.value_option_id ?? av.value_text ?? av.value_number?.toString() ?? av.value_date ?? (av.value_boolean != null ? String(av.value_boolean) : null);
    if (value != null) attributeDefaultValues[attr.stable_key] = value;
  }
  for (const mo of multiOptions ?? []) {
    const attr = Array.isArray(mo.attributes) ? mo.attributes[0] : mo.attributes;
    if (!attr?.stable_key) continue;
    const existing = attributeDefaultValues[attr.stable_key];
    attributeDefaultValues[attr.stable_key] = Array.isArray(existing) ? [...existing, mo.option_id] : [mo.option_id];
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit listing</h1>
      {/* Location is set at creation only for v1 — editing it isn't wired up yet. */}
      <ListingForm
        categoryOptions={categoryOptions}
        attributesByCategory={attributesByCategory}
        action={updateListing.bind(null, id)}
        submitLabel="Save changes"
        hideLocation
        initialPhotos={initialPhotos}
        aiUsage={aiUsage}
        isSellerPro={isSellerPro}
        listingId={id}
        hasTranslations={(translations?.length ?? 0) > 0}
        attributeDefaultValues={attributeDefaultValues}
        plusPriceCents={plusPriceCents}
        premiumPriceCents={premiumPriceCents}
        initialTier={tierFromBoostRank(listing.boost_rank)}
        initial={{
          title: listing.title,
          description: listing.description,
          categoryId: listing.category_id,
          price: String((listing.price_minor ?? 0) / 100),
          currencyCode: listing.currency_code,
          websiteUrl: profile.website_url,
        }}
      />
    </div>
  );
}
