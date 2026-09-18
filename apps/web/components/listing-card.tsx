import Link from "next/link";
import Image from "next/image";
import { ImageOff, Camera } from "lucide-react";
import { getDisplayCurrency } from "@/lib/display-currency";
import { getExchangeRates } from "@/lib/exchange-rates";
import { FavoriteButton } from "@/components/favorite-button";
import { Price } from "@/components/price";
import { slugPath } from "@/lib/slug";

type Props = {
  id: string;
  title: string;
  priceMinor: number;
  currencyCode: string;
  city?: string | null;
  imageUrl?: string | null;
  isFavorited: boolean;
  signedIn: boolean;
  // Kept optional so existing callers don't need to change their queries, but no longer rendered
  // on the card itself -- browse/search cards are intentionally minimal (photo, title, price only)
  // so the buyer clicks through to the listing page for pickup/delivery, city, and age. Matches the
  // reference dense grid: small photo, heart icon, title, price, nothing else.
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  publishedAt?: string | null;
  photoCount?: number;
};

export async function ListingCard({
  id,
  title,
  priceMinor,
  currencyCode,
  imageUrl,
  isFavorited,
  signedIn,
  photoCount,
}: Props) {
  const displayCurrency = await getDisplayCurrency();
  const rates = displayCurrency ? await getExchangeRates() : null;

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
          <Price minorUnits={priceMinor} currency={currencyCode} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
        </p>
        <p className="line-clamp-2 text-xs leading-snug font-medium text-foreground/80 transition-colors group-hover:text-foreground">{title}</p>
      </div>
    </Link>
  );
}
