import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { FavoriteButton } from "@/components/favorite-button";

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

export function ListingRow({
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

  return (
    <Link href={`/listings/${id}`} className="flex gap-4 border-b py-4 first:pt-0 last:border-b-0 hover:bg-accent/30">
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
        <p className="font-semibold">{formatPrice(priceMinor, currencyCode)}</p>
        <div className="text-xs text-muted-foreground">
          <p>{sellerName}</p>
          {city && <p>{city}</p>}
        </div>
      </div>
    </Link>
  );
}
