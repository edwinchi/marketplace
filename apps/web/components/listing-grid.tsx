import { resolveMediaUrl } from "@/lib/media";
import { ListingCard } from "@/components/listing-card";

type Listing = {
  id: string;
  title: string;
  price_minor: number | null;
  currency_code: string;
  locations: { city: string | null } | { city: string | null }[] | null;
  listing_media: { storage_key: string; sort_order: number }[] | null;
};

export function ListingGrid({ listings, favoritedIds, signedIn }: { listings: Listing[]; favoritedIds: Set<string>; signedIn: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {listings.map((l) => {
        const media = [...(l.listing_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        return (
          <ListingCard
            key={l.id}
            id={l.id}
            title={l.title}
            priceMinor={l.price_minor ?? 0}
            currencyCode={l.currency_code}
            city={Array.isArray(l.locations) ? l.locations[0]?.city : l.locations?.city}
            imageUrl={media ? resolveMediaUrl(media.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null}
            isFavorited={favoritedIds.has(l.id)}
            signedIn={signedIn}
          />
        );
      })}
    </div>
  );
}
