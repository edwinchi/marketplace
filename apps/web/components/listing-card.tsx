import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ImageOff, Camera, Truck, Handshake } from "lucide-react";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { getExchangeRates } from "@/lib/exchange-rates";
import { formatListingAge } from "@/lib/relative-time";
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
  // All optional and additive -- callers that don't query these columns yet just render the card
  // without the corresponding badge/detail, same graceful-degradation pattern as `city` already
  // being optional here.
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
  city,
  imageUrl,
  isFavorited,
  signedIn,
  pickupAvailable,
  deliveryAvailable,
  publishedAt,
  photoCount,
}: Props) {
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;
  const rates = displayCurrency ? await getExchangeRates() : null;

  return (
    <Link
      href={`/listings/${slugPath(title, id)}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-200 hover:border-foreground/20 hover:shadow-md"
    >
      <FavoriteButton listingId={id} initialFavorited={isFavorited} signedIn={signedIn} />
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted text-muted-foreground">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 20vw, 50vw"
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
        <p className="text-base font-extrabold tracking-tight">
          <Price minorUnits={priceMinor} currency={currencyCode} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
        </p>
        <p className="line-clamp-2 text-xs leading-snug font-medium text-foreground/80 transition-colors group-hover:text-foreground">{title}</p>
        {(pickupAvailable || deliveryAvailable) && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {pickupAvailable && (
              <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Handshake className="size-2.5" />
                Pickup
              </span>
            )}
            {deliveryAvailable && (
              <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Truck className="size-2.5" />
                Delivery
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          {city && <span className="truncate">{city}</span>}
          {publishedAt && <span className="shrink-0">{formatListingAge(publishedAt)}</span>}
        </div>
      </div>
    </Link>
  );
}
