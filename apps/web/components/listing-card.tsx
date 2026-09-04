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
  priceMinor: number;
  currencyCode: string;
  city?: string | null;
  imageUrl?: string | null;
  isFavorited: boolean;
  signedIn: boolean;
};

export async function ListingCard({ id, title, priceMinor, currencyCode, city, imageUrl, isFavorited, signedIn }: Props) {
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;
  const rates = displayCurrency ? await getExchangeRates() : null;

  return (
    <Link
      href={`/listings/${slugPath(title, id)}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
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
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        <p className="text-sm font-bold tracking-tight">
          <Price minorUnits={priceMinor} currency={currencyCode} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
        </p>
        <p className="line-clamp-2 text-xs leading-snug text-foreground/80 transition-colors group-hover:text-foreground">{title}</p>
        {city && <p className="text-[11px] text-muted-foreground">{city}</p>}
      </div>
    </Link>
  );
}
