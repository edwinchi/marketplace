import { resolveMediaUrl } from "@/lib/media";
import { ListingCard } from "@/components/listing-card";

type Listing = {
  id: string;
  title: string;
  price_minor: number | null;
  currency_code: string;
  locations: { city: string | null } | { city: string | null }[] | null;
  listing_media: { storage_key: string; sort_order: number }[] | null;
  // Not rendered on the card (see ListingCard) -- kept optional so callers whose queries already
  // select these columns for other purposes don't need to change their select().
  pickup_available?: boolean | null;
  delivery_available?: boolean | null;
  published_at?: string | null;
};

export function ListingGrid({ listings, favoritedIds, signedIn }: { listings: Listing[]; favoritedIds: Set<string>; signedIn: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {listings.map((l) => {
        const sortedMedia = [...(l.listing_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        const media = sortedMedia[0];
        return (
          <ListingCard
            key={l.id}
            id={l.id}
            title={l.title}
            priceMinor={l.price_minor ?? 0}
            currencyCode={l.currency_code}
            imageUrl={media ? resolveMediaUrl(media.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null}
            isFavorited={favoritedIds.has(l.id)}
            signedIn={signedIn}
            photoCount={sortedMedia.length}
          />
        );
      })}
    </div>
  );
}
