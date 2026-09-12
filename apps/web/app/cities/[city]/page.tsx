import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { getTargetCity } from "@/lib/target-cities";
import { getCountryName } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { slugPath } from "@/lib/slug";
import { ListingGrid } from "@/components/listing-grid";
import { buttonVariants } from "@/components/ui/button";

// A curated, real page per target city (see lib/target-cities.ts for why this isn't generated
// from the free-text locations.city column directly). Rendered per-request like every other page
// in this app, not statically generated -- createClient() (lib/supabase/server.ts) reads cookies()
// for the signed-in-visitor checks below (favorites, nav state), which only works in a real
// request context, not at build time.
export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const target = getTargetCity(city);
  if (!target) return {};
  return {
    title: `Buy & sell in ${target.name}`,
    description: `Free classifieds in ${target.name}, ${getCountryName(target.countryCode)} — phones, cars, electronics and more from real local sellers on MarketitNow. Post your first ad free.`,
    alternates: { canonical: `/cities/${target.slug}` },
  };
}

// Filtering by an embedded resource's column (locations.city) requires an inner join in
// PostgREST's embed syntax -- same gotcha app/page.tsx's own city filter already works around.
const LISTING_SELECT = "id, title, price_minor, currency_code, locations!inner(city), listing_media(storage_key, sort_order)";

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const target = getTargetCity(city);
  if (!target) notFound();

  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();

  const [{ data: listings }, { data: favorites }, { topLevelCategories }] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .ilike("locations.city", target.name)
      .order("published_at", { ascending: false })
      .limit(60),
    profile
      ? supabase.from("favorites").select("listing_id").eq("profile_id", profile.id)
      : Promise.resolve({ data: [] as { listing_id: string }[] | null }),
    getCategoriesAndAttributes(),
  ]);
  const favoritedIds = new Set((favorites ?? []).map((f) => f.listing_id));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buy &amp; sell in {target.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Real listings from sellers in {target.name}, {getCountryName(target.countryCode)} — phones, cars, electronics, and more.
          </p>
        </div>
        <Link href="/listings/new" className={buttonVariants({ size: "lg", className: "shrink-0 gap-1.5 whitespace-nowrap" })}>
          <PackagePlus className="size-4" />
          Post your first ad free
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} signedIn={!!profile} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
          <p className="text-muted-foreground">No listings in {target.name} yet — be the first.</p>
          <Link href="/listings/new" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
            Post a free ad
          </Link>
        </div>
      )}

      <div className="mt-4 border-t pt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Browse categories in {target.name}</h2>
        <div className="flex flex-wrap gap-2">
          {topLevelCategories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${slugPath(c.label, c.id)}?city=${encodeURIComponent(target.name)}`}
              className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-primary/10"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
