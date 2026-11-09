import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { BadgeEuro, Camera, MapPin, ArrowRight } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserAndProfileForRender } from "@/lib/supabase/profile";
import { ListingGrid } from "@/components/listing-grid";
import { buttonVariants } from "@/components/ui/button";

// Landing page for visitors from TikTok (marketitnow.net/tiktok is shown at the end of every
// video and in every caption, because a personal TikTok account can't have a bio link yet).
// One job: get them to post their first ad, or to browse. The intro video pop-up is skipped here
// (components/intro-video.tsx): they've just watched it on TikTok.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TikTok");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // A campaign page, not a page to rank: keep it out of search results.
    robots: { index: false, follow: true },
  };
}

const NEWEST_SELECT =
  "id, title, price_minor, currency_code, price_type, is_reserved, pickup_available, delivery_available, published_at, locations(city), listing_media(storage_key, sort_order)";

// Public data (active listings), so the service client and a short cache are fine, as on the
// homepage's default view.
const getNewestListings = unstable_cache(
  async () => {
    const { data } = await createServiceClient()
      .from("listings")
      .select(NEWEST_SELECT)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(12);
    return data ?? [];
  },
  ["tiktok-newest-listings"],
  { revalidate: 120 },
);

export default async function TikTokPage() {
  const [t, { profile }, listings] = await Promise.all([
    getTranslations("TikTok"),
    getCurrentUserAndProfileForRender(),
    getNewestListings(),
  ]);
  const postHref = profile ? "/listings/new" : "/login?tab=signup&next=/listings/new";
  const benefits = [
    { icon: BadgeEuro, title: t("benefit1Title"), body: t("benefit1Body") },
    { icon: Camera, title: t("benefit2Title"), body: t("benefit2Body") },
    { icon: MapPin, title: t("benefit3Title"), body: t("benefit3Body") },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-[#e89818]/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-96 rounded-full bg-[#008200]/25 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <p className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-white ring-1 ring-white/20">
            {t("kicker")}
          </p>
          <h1 className="font-heading text-4xl leading-tight font-bold text-balance sm:text-5xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-pretty text-white/85">{t("subtitle")}</p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link href={postHref} className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base" })}>
              {t("ctaPost")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/"
              className={buttonVariants({ size: "lg", variant: "outline", className: "h-12 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white" })}
            >
              {t("ctaBrowse")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="tiktok-why" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <h2 id="tiktok-why" className="sr-only">{t("whyTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#e89818]/10 text-primary-ink">
                <Icon className="size-5.5" aria-hidden />
              </span>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {listings.length > 0 && (
        <section aria-labelledby="tiktok-new" className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="tiktok-new" className="font-heading text-2xl font-bold">{t("newTitle")}</h2>
            <Link href="/" className="text-sm font-semibold text-primary-ink underline-offset-4 hover:underline">
              {t("seeAll")}
            </Link>
          </div>
          <ListingGrid listings={listings} favoritedIds={new Set()} signedIn={!!profile} />
        </section>
      )}

      <section className="border-t bg-muted/40 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="font-heading text-2xl font-bold text-balance">{t("finalTitle")}</h2>
          <p className="text-muted-foreground">{t("finalBody")}</p>
          <Link href={postHref} className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base" })}>
            {t("ctaPost")}
          </Link>
        </div>
      </section>
    </div>
  );
}
