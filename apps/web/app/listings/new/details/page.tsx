import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import { getCurrentUserAndProfileForRender } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes, getCategoryPath } from "@/lib/categories";
import { createListing } from "@/app/listings/actions";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { getNumericSetting } from "@/lib/numeric-settings";
import { NewListingStep2Form } from "@/components/listings/new-listing-step2-form";

export default async function NewListingDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; category?: string }>;
}) {
  const { title, category } = await searchParams;
  const { user, profile } = await getCurrentUserAndProfileForRender();
  if (!user || !profile) {
    const qs = new URLSearchParams();
    if (title) qs.set("title", title);
    if (category) qs.set("category", category);
    const next = qs.size > 0 ? `/listings/new/details?${qs.toString()}` : "/listings/new/details";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!title || !category) redirect("/listings/new");

  const [{ categoryOptions, attributesByCategory }, categoryPath, aiUsage, plusPriceCents, premiumPriceCents] = await Promise.all([
    getCategoriesAndAttributes(),
    getCategoryPath(category),
    getAiUsageStatus(),
    getNumericSetting("listing_tier_plus_price_cents"),
    getNumericSetting("listing_tier_premium_price_cents"),
  ]);
  const chosen = categoryOptions.find((c) => c.id === category);
  if (!chosen) redirect("/listings/new");

  // Where the item is: the seller's own country (profile, set under Ad & location preferences),
  // else the country they're browsing from, else the Netherlands. It used to be the first entry
  // of the country list (Nigeria) for everyone, so a seller in Zwolle published in NGN.
  const known = (c: string | null | undefined) => (c && ANCHOR_COUNTRIES.some((a) => a.code === c.toUpperCase()) ? c.toUpperCase() : null);
  const { data: sellerCountry } = await (await createClient()).from("profiles").select("country_code").eq("id", profile.id).maybeSingle();
  const defaultCountry = known(sellerCountry?.country_code) ?? known((await headers()).get("x-vercel-ip-country")) ?? "NL";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-semibold">Post an ad</h1>
      <NewListingStep2Form
        categoryId={category}
        categoryPath={categoryPath.map((n) => n.name)}
        title={title}
        defaultCountry={defaultCountry}
        attributes={attributesByCategory[category] ?? []}
        action={createListing}
        seller={{ name: profile.display_name || profile.username, email: user.email ?? "", websiteUrl: profile.website_url }}
        initialUsesLeft={aiUsage.usesLeft}
        unlimited={aiUsage.unlimited}
        plusPriceCents={plusPriceCents}
        premiumPriceCents={premiumPriceCents}
      />
    </div>
  );
}
