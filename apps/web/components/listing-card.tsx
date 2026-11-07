import Link from "next/link";
import Image from "next/image";
import { ImageOff, Camera } from "lucide-react";
import { getDisplayCurrency } from "@/lib/display-currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { FavoriteButton } from "@/components/favorite-button";
import { getLocale, getTranslations } from "next-intl/server";
import { ListingPrice } from "@/components/listing-price";
import { slugPath } from "@/lib/slug";

type Props = {
  id: string;
  title: string;
  priceMinor: number | null;
  currencyCode: string;
  priceType?: string | null;
  isReserved?: boolean | null;
  city?: string | null;
  imageUrl?: string | null;
  isFavorited: boolean;
  signedIn: boolean;
  // Not shown: the card stays dense; pickup/delivery is on the listing page.
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  publishedAt?: string | null;
  photoCount?: number;
  // A paid boost (boost_rank > 0): labelled so paid placement is recognisable (EU UCPD Annex I 11a).
  promoted?: boolean;
};

// "Today" / "Yesterday" / "3 Nov" in the visitor's language and Amsterdam time, like Marktplaats'
// cards. City + age is what a local buyer scans for first.
function postedLabel(iso: string, locale: string, t: (k: "today" | "yesterday") => string): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);
  const posted = new Date(iso);
  const now = new Date();
  if (day(posted) === day(now)) return t("today");
  if (day(posted) === day(new Date(now.getTime() - 86_400_000))) return t("yesterday");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" }).format(posted);
}

export async function ListingCard({
  id,
  title,
  priceMinor,
  currencyCode,
  priceType,
  isReserved,
  imageUrl,
  isFavorited,
  signedIn,
  photoCount,
  city,
  publishedAt,
  promoted,
}: Props) {
  const displayCurrency = await getDisplayCurrency();
  const rates = displayCurrency ? await getExchangeRates() : null;
  const [t, locale] = await Promise.all([getTranslations("Listing"), getLocale()]);
  const posted = publishedAt ? postedLabel(publishedAt, locale, (k) => t(k)) : null;
  const meta = [city, posted].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/listings/${slugPath(title, id)}`}
      // @container, not a viewport breakpoint, sizes the price by this card's own actual rendered
      // width -- correct in a way viewport breakpoints can't be, since the same viewport shows
      // 3-7 columns depending on the grid's own breakpoints, so a "sm:" viewport class would scale
      // every card at once regardless of how narrow each one actually is at a given column count.
      className="group @container relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-200 hover:border-foreground/20 hover:shadow-md"
    >
      <FavoriteButton listingId={id} initialFavorited={isFavorited} signedIn={signedIn} />
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted text-muted-foreground">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(min-width: 1536px) 14vw, (min-width: 1024px) 17vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff className="size-7" />
        )}
        {(isReserved || promoted) && (
          <span className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
            {isReserved && (
              <span className="rounded-full bg-[#e89818] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">{t("reserved")}</span>
            )}
            {promoted && (
              <span className="rounded-full bg-[#082040]/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">{t("promoted")}</span>
            )}
          </span>
        )}
        {/* Multi-photo completeness is its own quiet trust signal on a classifieds card -- a
            listing with several angles reads as more serious/real than a single crop. */}
        {!!photoCount && photoCount > 1 && (
          <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Camera className="size-3" />
            {photoCount}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <p className="text-base font-extrabold tracking-tight @[13rem]:text-lg">
          <ListingPrice priceType={priceType} minorUnits={priceMinor} currency={currencyCode} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
        </p>
        <p className="line-clamp-2 text-xs leading-snug font-medium text-foreground/80 transition-colors group-hover:text-foreground">{title}</p>
        {meta && <p className="truncate text-[11px] text-muted-foreground">{meta}</p>}
      </div>
    </Link>
  );
}
