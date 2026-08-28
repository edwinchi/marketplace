import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { updateListing } from "@/app/listings/actions";
import { ListingForm } from "@/components/listing-form";

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
  if (listing.seller_id !== profile.id) redirect(`/listings/${id}`);

  const { categoryOptions, attributesByCategory } = await getCategoriesAndAttributes();

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
