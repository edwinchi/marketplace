import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { FavoriteButton } from "@/components/favorite-button";

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

export function ListingCard({ id, title, priceMinor, currencyCode, city, imageUrl, isFavorited, signedIn }: Props) {
  return (
    <Link
      href={`/listings/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg"
    >
      <FavoriteButton listingId={id} initialFavorited={isFavorited} signedIn={signedIn} />
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted text-muted-foreground">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff className="size-8" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-3.5">
        <p className="text-base font-bold tracking-tight">{formatPrice(priceMinor, currencyCode)}</p>
        <p className="line-clamp-2 text-sm text-foreground/80 transition-colors group-hover:text-foreground">{title}</p>
        {city && <p className="text-xs text-muted-foreground">{city}</p>}
      </div>
    </Link>
  );
}
