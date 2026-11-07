import { resolveMediaUrl } from "@/lib/media";
import { ListingCard } from "@/components/listing-card";

type Listing = {
  id: string;
  title: string;
  price_minor: number | null;
  currency_code: string;
  // Optional so a caller whose query predates these still type-checks; without them the card just
  // shows the amount and no Reserved badge.
  price_type?: string | null;
  is_reserved?: boolean | null;
  locations: { city: string | null } | { city: string | null }[] | null;
  listing_media: { storage_key: string; sort_order: number }[] | null;
  // Optional: shown on the card when the caller's query selects them (city + date line, Promoted).
  pickup_available?: boolean | null;
  delivery_available?: boolean | null;
  published_at?: string | null;
  boost_rank?: number | null;
};

// Sellers type their city in any case ("ZWOLLE", "zwolle"): show all-caps or all-lowercase names
// as "Zwolle", "Den Haag", "'s-Hertogenbosch"; mixed-case names are left as typed.
export function displayCity(city: string | null | undefined): string | null {
  const c = city?.trim();
  if (!c) return null;
  if (c !== c.toUpperCase() && c !== c.toLowerCase()) return c;
  return c.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function ListingGrid({ listings, favoritedIds, signedIn }: { listings: Listing[]; favoritedIds: Set<string>; signedIn: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {listings.map((l) => {
        const sortedMedia = [...(l.listing_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        const media = sortedMedia[0];
        const location = Array.isArray(l.locations) ? l.locations[0] : l.locations;
        return (
          <ListingCard
            key={l.id}
            id={l.id}
            title={l.title}
            priceMinor={l.price_minor}
            currencyCode={l.currency_code}
            priceType={l.price_type}
            isReserved={l.is_reserved}
            imageUrl={media ? resolveMediaUrl(media.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null}
            isFavorited={favoritedIds.has(l.id)}
            signedIn={signedIn}
            photoCount={sortedMedia.length}
            city={displayCity(location?.city)}
            publishedAt={l.published_at ?? null}
            promoted={(l.boost_rank ?? 0) > 0}
          />
        );
      })}
    </div>
  );
}
