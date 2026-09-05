import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { updateListing } from "@/app/listings/actions";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { resolveMediaUrl } from "@/lib/media";
import { ListingForm } from "@/components/listing-form";
import { slugPath } from "@/lib/slug";

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
    .select("id, title, description, category_id, price_minor, currency_code, seller_id")
    .eq("id", id)
    .single();
  if (!listing) notFound();
  if (listing.seller_id !== profile.id) redirect(`/listings/${slugPath(listing.title, id)}`);

  const [{ categoryOptions, attributesByCategory }, { data: media }, aiUsage] = await Promise.all([
    getCategoriesAndAttributes(),
    supabase.from("listing_media").select("storage_key").eq("listing_id", id).eq("media_type", "image").order("sort_order").limit(1),
    getAiUsageStatus(),
  ]);
  const coverPhotoUrl = media?.[0] ? resolveMediaUrl(media[0].storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null;

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
        coverPhotoUrl={coverPhotoUrl}
        aiUsage={aiUsage}
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
