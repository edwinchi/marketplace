import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Eye, Heart, MessageCircle, Handshake, Camera, Clock, Lock, TrendingUp } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { callFreeTextModel } from "@/lib/ai-text";
import { getCategoryPath } from "@/lib/categories";
import { slugPath } from "@/lib/slug";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Below this many total listings (active+sold, deleted excluded), any comparison is just noise --
// matches the same "need enough real data before saying anything" gate price-suggestion-action.ts
// uses for comparable listings.
const MIN_LISTINGS_FOR_INSIGHTS = 3;
// A listing needs a few days of real traffic before its view count means anything -- comparing a
// listing posted an hour ago against one that's been up for a month isn't a fair read.
const MIN_AGE_DAYS_FOR_VIEW_COMPARISON = 3;
// Only benchmark against a category when there's a real crowd to compare against.
const MIN_OTHER_ACTIVE_FOR_CATEGORY_BENCHMARK = 5;

type ListingRow = {
  id: string;
  title: string;
  category_id: string;
  view_count: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function countByListingId(rows: { listing_id: string | null }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.listing_id) continue;
    map.set(r.listing_id, (map.get(r.listing_id) ?? 0) + 1);
  }
  return map;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

export default async function SellerInsightsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const isSubscriber = await isSellerProSubscriber();
  if (!isSubscriber) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[#082040]">Seller performance insights</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real tips from your own listing data — what gets more views, what sells faster. This is a Seller Pro feature.
            </p>
          </div>
          <Link href="/my-account/ai-features" className={buttonVariants({ className: "gap-1.5" })}>
            See Seller Pro
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, category_id, view_count, status, created_at, updated_at")
    .eq("seller_id", profile.id)
    .neq("status", "deleted")
    .returns<ListingRow[]>();

  if (!listings || listings.length < MIN_LISTINGS_FOR_INSIGHTS) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[#082040]">Not enough listings yet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real insights need real data to compare — post at least {MIN_LISTINGS_FOR_INSIGHTS} listings and check back here.
              You have {listings?.length ?? 0} so far.
            </p>
          </div>
          <Link href="/listings/new" className={buttonVariants({ variant: "outline" })}>
            Post an ad
          </Link>
        </div>
      </div>
    );
  }

  const listingIds = listings.map((l) => l.id);
  const [{ data: mediaRows }, { data: favoriteRows }, { data: conversationRows }, { data: offerRows }] = await Promise.all([
    supabase.from("listing_media").select("listing_id").eq("media_type", "image").in("listing_id", listingIds),
    supabase.from("favorites").select("listing_id").in("listing_id", listingIds),
    supabase.from("conversations").select("listing_id").in("listing_id", listingIds),
    supabase.from("offers").select("listing_id").in("listing_id", listingIds),
  ]);
  const photoCounts = countByListingId(mediaRows);
  const favoriteCounts = countByListingId(favoriteRows);
  const messageCounts = countByListingId(conversationRows);
  const offerCounts = countByListingId(offerRows);

  const totalViews = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0);
  const totalFavorites = [...favoriteCounts.values()].reduce((a, b) => a + b, 0);
  const totalMessages = [...messageCounts.values()].reduce((a, b) => a + b, 0);
  const totalOffers = [...offerCounts.values()].reduce((a, b) => a + b, 0);
  const activeCount = listings.filter((l) => l.status === "active").length;
  const soldListings = listings.filter((l) => l.status === "sold");

  // Old enough that its view count reflects real traffic, not just "posted five minutes ago".
  const matureListings = listings.filter((l) => daysSince(l.created_at) >= MIN_AGE_DAYS_FOR_VIEW_COMPARISON);

  let bestListing: ListingRow | null = null;
  let worstListing: ListingRow | null = null;
  if (matureListings.length >= 2) {
    const sorted = [...matureListings].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    bestListing = sorted[0];
    worstListing = sorted[sorted.length - 1];
  }

  let photoInsight: { avgWith: number; avgWithout: number; withCount: number; withoutCount: number } | null = null;
  const withPhotos = matureListings.filter((l) => (photoCounts.get(l.id) ?? 0) >= 4);
  const withoutPhotos = matureListings.filter((l) => (photoCounts.get(l.id) ?? 0) < 4);
  if (withPhotos.length >= 1 && withoutPhotos.length >= 1) {
    photoInsight = {
      avgWith: withPhotos.reduce((s, l) => s + (l.view_count ?? 0), 0) / withPhotos.length,
      avgWithout: withoutPhotos.reduce((s, l) => s + (l.view_count ?? 0), 0) / withoutPhotos.length,
      withCount: withPhotos.length,
      withoutCount: withoutPhotos.length,
    };
  }

  let avgDaysToSell: number | null = null;
  if (soldListings.length >= 1) {
    avgDaysToSell = soldListings.reduce((sum, l) => sum + (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000), 0) / soldListings.length;
  }

  // Benchmarked against their single largest active category only -- one focused, meaningful
  // comparison beats a wall of stats across every category they've ever dabbled in.
  let categoryBenchmark: { categoryLabel: string; yourAvg: number; marketAvg: number; otherCount: number } | null = null;
  const activeByCategory = new Map<string, ListingRow[]>();
  for (const l of listings.filter((l) => l.status === "active")) {
    activeByCategory.set(l.category_id, [...(activeByCategory.get(l.category_id) ?? []), l]);
  }
  const primaryCategory = [...activeByCategory.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (primaryCategory) {
    const [categoryId, ownListingsInCategory] = primaryCategory;
    const { data: othersInCategory } = await supabase
      .from("listings")
      .select("view_count")
      .eq("category_id", categoryId)
      .eq("status", "active")
      .not("id", "in", `(${listingIds.join(",")})`)
      .limit(500);
    if (othersInCategory && othersInCategory.length >= MIN_OTHER_ACTIVE_FOR_CATEGORY_BENCHMARK) {
      const categoryPath = await getCategoryPath(categoryId);
      categoryBenchmark = {
        categoryLabel: categoryPath.at(-1)?.name ?? "this category",
        yourAvg: ownListingsInCategory.reduce((s, l) => s + (l.view_count ?? 0), 0) / ownListingsInCategory.length,
        marketAvg: othersInCategory.reduce((s, l) => s + (l.view_count ?? 0), 0) / othersInCategory.length,
        otherCount: othersInCategory.length,
      };
    }
  }

  // A short, plain-language summary of the real numbers above -- explicitly barred from adding
  // any fact/number not already computed, same real-data-only rule as every other AI feature here.
  let aiSummary: string | null = null;
  const facts: string[] = [];
  if (photoInsight) facts.push(`Listings with 4+ photos average ${Math.round(photoInsight.avgWith)} views vs ${Math.round(photoInsight.avgWithout)} views for listings with fewer photos.`);
  if (categoryBenchmark) facts.push(`In ${categoryBenchmark.categoryLabel}, this seller's listings average ${Math.round(categoryBenchmark.yourAvg)} views vs a ${Math.round(categoryBenchmark.marketAvg)}-view average across ${categoryBenchmark.otherCount} other active listings in that category.`);
  if (avgDaysToSell != null) facts.push(`Sold listings took an average of ${avgDaysToSell.toFixed(1)} days to sell.`);
  if (bestListing && worstListing && bestListing.id !== worstListing.id) facts.push(`Best-performing listing has ${bestListing.view_count ?? 0} views; lowest-performing has ${worstListing.view_count ?? 0} views.`);
  if (facts.length > 0) {
    const { text } = await callFreeTextModel(
      `You are summarizing a seller's real listing performance data on AfroDeals, a classifieds marketplace. Here are the only facts you know, already computed from their real data:\n${facts.map((f) => `- ${f}`).join("\n")}\n\nWrite 1-2 short, encouraging, actionable sentences based ONLY on these facts. Do not invent any number, percentage, or fact not listed above. No markdown, no headers, plain sentences only.`,
      200,
    );
    aiSummary = text;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
          <BarChart3 className="size-4" />
        </span>
        <h1 className="text-xl font-semibold text-[#082040]">Seller performance insights</h1>
      </div>

      {aiSummary && (
        <p className="mb-6 rounded-xl border border-[#008848]/20 bg-[#008848]/5 p-4 text-sm text-[#046637]">{aiSummary}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Eye, label: "Total views", value: totalViews },
          { icon: Heart, label: "Total favorites", value: totalFavorites },
          { icon: MessageCircle, label: "Message threads", value: totalMessages },
          { icon: Handshake, label: "Offers received", value: totalOffers },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardContent>
              <s.icon className="size-4 text-muted-foreground" />
              <p className="mt-2 text-2xl font-bold text-[#082040]">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Across {listings.length} listing{listings.length === 1 ? "" : "s"} ({activeCount} active). View counts only
        started tracking recently, so older listings may show fewer views than they actually got.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {bestListing && worstListing && bestListing.id !== worstListing.id && (
          <Card>
            <CardContent>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
                <TrendingUp className="size-4 text-[#008848]" /> Your best vs. lowest performing listing
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link href={`/listings/${slugPath(bestListing.title, bestListing.id)}`} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <p className="text-xs text-muted-foreground">Best performing</p>
                  <p className="truncate text-sm font-medium">{bestListing.title}</p>
                  <p className="mt-1 text-xs text-[#046637]">{bestListing.view_count ?? 0} views</p>
                </Link>
                <Link href={`/listings/${slugPath(worstListing.title, worstListing.id)}`} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <p className="text-xs text-muted-foreground">Lowest performing</p>
                  <p className="truncate text-sm font-medium">{worstListing.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{worstListing.view_count ?? 0} views</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {photoInsight && (
          <Card>
            <CardContent>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
                <Camera className="size-4 text-[#008848]" /> Photos and views
              </p>
              <p className="text-sm text-muted-foreground">
                Your {photoInsight.withCount} listing{photoInsight.withCount === 1 ? "" : "s"} with 4+ photos average{" "}
                <span className="font-medium text-foreground">{Math.round(photoInsight.avgWith)} views</span>, vs{" "}
                <span className="font-medium text-foreground">{Math.round(photoInsight.avgWithout)} views</span> for your{" "}
                {photoInsight.withoutCount} listing{photoInsight.withoutCount === 1 ? "" : "s"} with fewer photos.
              </p>
            </CardContent>
          </Card>
        )}

        {categoryBenchmark && (
          <Card>
            <CardContent>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
                <BarChart3 className="size-4 text-[#008848]" /> How you compare in {categoryBenchmark.categoryLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                Your listings in {categoryBenchmark.categoryLabel} average{" "}
                <span className="font-medium text-foreground">{Math.round(categoryBenchmark.yourAvg)} views</span>, vs a{" "}
                <span className="font-medium text-foreground">{Math.round(categoryBenchmark.marketAvg)}-view</span> average across{" "}
                {categoryBenchmark.otherCount} other active listings in that category.
              </p>
            </CardContent>
          </Card>
        )}

        {avgDaysToSell != null && (
          <Card>
            <CardContent>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#082040]">
                <Clock className="size-4 text-[#008848]" /> Time to sell
              </p>
              <p className="text-sm text-muted-foreground">
                Your {soldListings.length} sold listing{soldListings.length === 1 ? "" : "s"} took an average of{" "}
                <span className="font-medium text-foreground">{avgDaysToSell.toFixed(1)} days</span> to sell.
              </p>
            </CardContent>
          </Card>
        )}

        {!bestListing && !photoInsight && !categoryBenchmark && avgDaysToSell == null && (
          <p className="text-sm text-muted-foreground">
            Check back in a few days — your listings are still too new for a meaningful comparison.
          </p>
        )}
      </div>

      <Link href="/my-account/my-listings" className={buttonVariants({ variant: "outline", className: "mt-6 w-fit" })}>
        Back to my listings
      </Link>
    </div>
  );
}
