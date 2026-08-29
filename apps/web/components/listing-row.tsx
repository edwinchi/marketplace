import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ImageOff } from "lucide-react";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { getExchangeRates } from "@/lib/exchange-rates";
import { FavoriteButton } from "@/components/favorite-button";
import { Price } from "@/components/price";
import { slugPath } from "@/lib/slug";

type Props = {
  id: string;
  title: string;
  description: string;
  priceMinor: number;
  currencyCode: string;
  city?: string | null;
  imageUrl?: string | null;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  sellerName: string;
  isFavorited: boolean;
  signedIn: boolean;
};

export async function ListingRow({
  id,
  title,
  description,
  priceMinor,
  currencyCode,
  city,
  imageUrl,
  pickupAvailable,
  deliveryAvailable,
  sellerName,
  isFavorited,
  signedIn,
}: Props) {
  const delivery = [pickupAvailable && "Pickup", deliveryAvailable && "Shipping"].filter(Boolean).join(" or ");
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;
  const rates = displayCurrency ? await getExchangeRates() : null;

  return (
    <Link href={`/listings/${slugPath(title, id)}`} className="flex gap-4 border-b py-4 first:pt-0 last:border-b-0 hover:bg-accent/30">
      <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground sm:size-32">
        <FavoriteButton listingId={id} initialFavorited={isFavorited} signedIn={signedIn} />
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes="128px" className="object-cover" />
        ) : (
          <ImageOff className="size-6" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {delivery && <p className="text-xs text-muted-foreground">{delivery}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between text-right">
        <p className="font-semibold">
          <Price minorUnits={priceMinor} currency={currencyCode} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
        </p>
        <div className="text-xs text-muted-foreground">
          <p>{sellerName}</p>
          {city && <p>{city}</p>}
        </div>
      </div>
    </Link>
  );
}
