import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { MessageCircle, Globe, Calendar, Fuel, Cog, Gauge, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoryPath } from "@/lib/categories";
import { cookies } from "next/headers";
import { formatPrice, DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { getExchangeRates } from "@/lib/exchange-rates";
import { resolveMediaUrl } from "@/lib/media";
import { getCountryName } from "@/lib/countries";
import { Price } from "@/components/price";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BackButton } from "@/components/back-button";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { SaveShareBar } from "@/components/listings/save-share-bar";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { OfferBox } from "@/components/listings/offer-box";
import { messageSellerAction } from "@/app/listings/message-seller-action";
import { followSeller, unfollowSeller } from "@/app/my-account/favorite-sellers/actions";
import { UserPlus, UserCheck } from "lucide-react";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const [t, locale, cookieStore] = await Promise.all([getTranslations("Listing"), getLocale(), cookies()]);
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;
  const rates = displayCurrency ? await getExchangeRates() : null;

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, description, price_minor, currency_code, price_type, pickup_available, delivery_available, offers_allowed, status, seller_id, category_id, location_id, created_at",
    )
    .eq("id", id)
    .single();
  if (!listing) notFound();

  const isOwner = profile?.id === listing.seller_id;

  // Offers are private between buyer and seller (RLS: offer_party_read), unlike Marktplaats'
  // publicly-visible bid list — so the owner sees every offer on their listing, a signed-in buyer
  // sees only their own, and everyone else sees none. Both branches select the same columns so
  // `offers` has one consistent shape below regardless of which branch ran.
  const offersQuery = isOwner
    ? supabase
        .from("offers")
        .select("id, amount_minor, currency_code, status, created_at, profiles(display_name, username)")
        .eq("listing_id", id)
        .order("created_at", { ascending: false })
    : profile
      ? supabase
          .from("offers")
          .select("id, amount_minor, currency_code, status, created_at, profiles(display_name, username)")
          .eq("listing_id", id)
          .eq("buyer_id", profile.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as { id: string; amount_minor: number; currency_code: string; status: string; created_at: string; profiles: { display_name: string | null; username: string } }[],
        });

  const [categoryPath, { data: location }, { data: seller }, { data: attributeValues }, { data: media }, { data: favoriteRow }, { count: otherListingsCount }, { count: favoriteCount }, { data: offers }, { data: followRow }, { data: sellerReviews }] =
    await Promise.all([
      getCategoryPath(listing.category_id),
      listing.location_id
        ? supabase.from("locations").select("city, country_code").eq("id", listing.location_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("username, display_name, created_at, website_url, account_type").eq("id", listing.seller_id).single(),
      supabase
        .from("listing_attribute_values")
        .select(
          "value_text, value_number, value_date, value_option_id, attributes(stable_key, unit_code, attribute_translations(name, language_code)), attribute_options(attribute_option_translations(label, language_code))",
        )
        .eq("listing_id", id),
      supabase.from("listing_media").select("storage_key").eq("listing_id", id).order("sort_order"),
      profile
        ? supabase.from("favorites").select("listing_id").eq("profile_id", profile.id).eq("listing_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", listing.seller_id).eq("status", "active").neq("id", id),
      // Computed live from the favorites table rather than trusting listings.favorite_count — that
      // column has no maintaining trigger in this schema, so it would just always read 0.
      supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("listing_id", id),
      offersQuery,
      profile && profile.id !== listing.seller_id
        ? supabase.from("favorite_sellers").select("seller_profile_id").eq("profile_id", profile.id).eq("seller_profile_id", listing.seller_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("reviews").select("rating").eq("reviewee_profile_id", listing.seller_id),
    ]);

  const reviewCount = sellerReviews?.length ?? 0;
  const reviewAverage = reviewCount ? (sellerReviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1) : null;

  // Best-effort view-history recording — not on the critical path (not part of the Promise.all
  // above), and never blocks the page on failure: a missed "recently viewed" row is harmless,
  // unlike a missed listing render.
  if (profile) {
    supabase
      .from("recently_viewed_listings")
      .upsert({ profile_id: profile.id, listing_id: id, viewed_at: new Date().toISOString() }, { onConflict: "profile_id,listing_id" })
      .then(({ error }) => {
        if (error) console.error("Failed to record recently-viewed listing:", error);
      });
  }

  const images = (media ?? []).map((m) => resolveMediaUrl(m.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!));

  // Real quick-spec strip for automotive listings — pulled from the same attribute rows the full
  // characteristics list below already fetched (brand/production_year/mileage/fuel_type/
  // transmission), not a separate query. Renders nothing when a listing simply doesn't have these
  // (a non-car category, or a car listing missing some fields) rather than showing blank icons.
  const specByKey = new Map<string, string>();
  for (const av of attributeValues ?? []) {
    const attr = Array.isArray(av.attributes) ? av.attributes[0] : av.attributes;
    if (!attr?.stable_key) continue;
    const optionTranslations = Array.isArray(av.attribute_options) ? av.attribute_options[0] : av.attribute_options;
    const optionLabel = optionTranslations?.attribute_option_translations?.find((t: { language_code: string; label: string }) => t.language_code === "en")?.label;
    const value = optionLabel ?? av.value_text ?? av.value_number;
    if (value != null) specByKey.set(attr.stable_key, String(value));
  }
  const quickSpecs = [
    { key: "brand", icon: Tag, label: specByKey.get("brand") },
    { key: "production_year", icon: Calendar, label: specByKey.get("production_year") },
    { key: "mileage", icon: Gauge, label: specByKey.get("mileage") ? `${Number(specByKey.get("mileage")).toLocaleString()} km` : undefined },
    { key: "fuel_type", icon: Fuel, label: specByKey.get("fuel_type") },
    { key: "transmission", icon: Cog, label: specByKey.get("transmission") },
  ].filter((s): s is { key: string; icon: typeof Tag; label: string } => !!s.label);
  const breadcrumbPath = [...categoryPath.map((n) => ({ id: n.id, name: n.name })), { id: listing.id, name: listing.title }];

  const memberSince = new Date(seller?.created_at ?? listing.created_at);
  const yearsOnPlatform = Math.max(0, Math.floor((Date.now() - memberSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  const tenureLabel = yearsOnPlatform > 0 ? t("yearsOnPlatform", { count: yearsOnPlatform }) : t("newOnPlatform");
  const sellerName = seller?.display_name || seller?.username || t("aSeller");
  const sellerInitial = sellerName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-3">
        <BackButton />
      </div>
      <Breadcrumbs path={breadcrumbPath} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: photos, characteristics, description */}
        <div className="lg:col-span-2">
          {listing.status !== "active" && (
            <Badge variant="outline" className="mb-2">
              {listing.status}
            </Badge>
          )}
          <PhotoGallery
            images={images}
            title={listing.title}
            listingId={listing.id}
            initialFavorited={!!favoriteRow}
            signedIn={!!profile}
            favoriteCount={favoriteCount ?? 0}
          />

          {attributeValues && attributeValues.length > 0 && (
            <>
              <Separator className="my-6" />
              <section>
                <h2 className="mb-3 text-lg font-semibold">{t("characteristics")}</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {attributeValues.map((av, i) => {
                    const attr = Array.isArray(av.attributes) ? av.attributes[0] : av.attributes;
                    const attrTranslations = attr?.attribute_translations ?? [];
                    const translation =
                      attrTranslations.find((tr: { language_code: string; name: string }) => tr.language_code === locale) ??
                      attrTranslations.find((tr: { language_code: string; name: string }) => tr.language_code === "en");
                    const optionTranslations = Array.isArray(av.attribute_options) ? av.attribute_options[0] : av.attribute_options;
                    const optionTrList = optionTranslations?.attribute_option_translations ?? [];
                    const optionLabel = (
                      optionTrList.find((tr: { language_code: string; label: string }) => tr.language_code === locale) ??
                      optionTrList.find((tr: { language_code: string; label: string }) => tr.language_code === "en")
                    )?.label;
                    const value = optionLabel ?? av.value_text ?? av.value_number ?? av.value_date;
                    if (!translation || value == null) return null;
                    return (
                      <div key={i} className="contents">
                        <dt className="text-muted-foreground">{translation.name}</dt>
                        <dd>
                          {value}
                          {attr?.unit_code ? ` ${attr.unit_code}` : ""}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            </>
          )}

          <Separator className="my-6" />
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("description")}</h2>
            <p className="whitespace-pre-wrap">{listing.description}</p>
          </section>

          {isOwner && (
            <div className="mt-6 flex gap-2">
              <Link href={`/listings/${listing.id}/edit`} className={buttonVariants({ variant: "outline", className: "transition-transform duration-150 hover:-translate-y-0.5" })}>
                {t("edit")}
              </Link>
              <DeleteListingButton listingId={listing.id} />
            </div>
          )}
        </div>

        {/* Right column: price, seller mini-card, message + offer */}
        <div className="flex flex-col gap-4">
          <SaveShareBar listingId={listing.id} title={listing.title} initialFavorited={!!favoriteRow} signedIn={!!profile} />

          <div>
            <h1 className="text-xl font-semibold">{listing.title}</h1>
            <p className="mt-1 text-3xl font-bold">
              <Price minorUnits={listing.price_minor ?? 0} currency={listing.currency_code} displayCurrency={displayCurrency} rates={rates?.rates ?? null} locale={locale} />
            </p>
            {listing.price_type === "bidding" && <p className="text-sm text-muted-foreground">{t("openToOffers")}</p>}
          </div>

          {quickSpecs.length > 0 && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-linear-to-br from-[#082040]/3 to-[#e89818]/3 p-3 sm:grid-cols-3">
              {quickSpecs.map(({ key, icon: Icon, label }) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e89818]/10 text-[#e89818]">
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {listing.pickup_available && <Badge variant="secondary">{t("pickup")}</Badge>}
            {listing.delivery_available && <Badge variant="secondary">{t("shipping")}</Badge>}
          </div>

          {!isOwner && (
            <>
              <Card size="sm" className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {sellerInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{sellerName}</p>
                    <p className="text-xs text-muted-foreground">{tenureLabel}</p>
                  </div>
                  {profile && (
                    <form action={followRow ? unfollowSeller : followSeller}>
                      <input type="hidden" name="sellerProfileId" value={listing.seller_id} />
                      <input type="hidden" name="returnTo" value={`/listings/${listing.id}`} />
                      <Button type="submit" variant={followRow ? "secondary" : "outline"} size="sm" className="gap-1.5 transition-transform duration-150 hover:-translate-y-0.5">
                        {followRow ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {followRow ? t("following") : t("follow")}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {seller?.website_url ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={seller.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={buttonVariants({ className: "gap-1.5 transition-transform duration-150 hover:-translate-y-0.5" })}
                  >
                    <Globe className="size-4" />
                    {t("website")}
                  </a>
                  <form action={messageSellerAction.bind(null, listing.id)}>
                    <Button type="submit" variant="outline" className="w-full gap-1.5 transition-transform duration-150 hover:-translate-y-0.5">
                      <MessageCircle className="size-4" />
                      {t("message")}
                    </Button>
                  </form>
                </div>
              ) : (
                <form action={messageSellerAction.bind(null, listing.id)}>
                  <Button type="submit" className="w-full gap-2 transition-transform duration-150 hover:-translate-y-0.5">
                    <MessageCircle className="size-4" />
                    {t("messageSeller")}
                  </Button>
                </form>
              )}

              {listing.offers_allowed && (
                <OfferBox listingId={listing.id} currencyCode={listing.currency_code} signedIn={!!profile} />
              )}
            </>
          )}

          {offers && offers.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">{isOwner ? t("offersCount", { count: offers.length }) : t("yourOffers")}</h2>
              <ul className="flex flex-col gap-2">
                {offers.map((o) => {
                  const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
                  return (
                    <li key={o.id} className="flex items-center justify-between rounded-md border p-2 text-sm transition-colors hover:bg-muted/50">
                      <span className={isOwner ? "" : "text-muted-foreground capitalize"}>
                        {isOwner ? buyer?.display_name || buyer?.username || t("aBuyer") : o.status}
                      </span>
                      <span className="font-medium">{formatPrice(o.amount_minor, o.currency_code)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Seller trust info + location, full width below the two-column layout */}
      <Separator className="my-8" />
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {!isOwner && (
          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                    {sellerInitial}
                  </div>
                  <div>
                    <p className="font-medium">{sellerName}</p>
                    <p className="text-xs text-muted-foreground">{tenureLabel}</p>
                  </div>
                </div>
                {profile && (
                  <form action={followRow ? unfollowSeller : followSeller}>
                    <input type="hidden" name="sellerProfileId" value={listing.seller_id} />
                    <input type="hidden" name="returnTo" value={`/listings/${listing.id}`} />
                    <Button type="submit" variant={followRow ? "secondary" : "outline"} size="sm" className="gap-1.5 transition-transform duration-150 hover:-translate-y-0.5">
                      {followRow ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                      {followRow ? t("following") : t("follow")}
                    </Button>
                  </form>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium">{t("moreFromSeller")}</p>
                  <p className="text-sm text-muted-foreground">{t("otherActiveListings", { count: otherListingsCount ?? 0 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("reviews")}</p>
                  <p className="text-sm text-muted-foreground">
                    {reviewCount ? t("reviewSummary", { rating: reviewAverage ?? "0.0", count: reviewCount }) : t("noReviewsYet")}{" "}
                    <Link href={`/experiences/${listing.seller_id}`} className="underline transition-colors hover:text-foreground">
                      {reviewCount ? t("seeAll") : t("beTheFirstReview")}
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("identityVerification")}</p>
                  <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
                </div>
              </div>

              <p className="border-t pt-4 text-xs text-muted-foreground">
                {seller?.account_type === "business" ? t("businessSellerNotice") : t("privateSellerNotice")}{" "}
                <Link href="/safety" className="underline transition-colors hover:text-foreground">
                  {t("learnMore")}
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {location && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">
              {location.city}, {getCountryName(location.country_code)}
            </h2>
            <iframe
              title="Listing location"
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${location.city}, ${getCountryName(location.country_code)}`)}&output=embed`}
              className="aspect-video w-full rounded-lg border"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
