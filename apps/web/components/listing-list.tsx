import { resolveMediaUrl } from "@/lib/media";
import { ListingRow } from "@/components/listing-row";

type Listing = {
  id: string;
  title: string;
  description: string;
  price_minor: number | null;
  currency_code: string;
  pickup_available: boolean;
  delivery_available: boolean;
  locations: { city: string | null } | { city: string | null }[] | null;
  profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null;
  listing_media: { storage_key: string; sort_order: number }[] | null;
};

export function ListingList({ listings, favoritedIds, signedIn }: { listings: Listing[]; favoritedIds: Set<string>; signedIn: boolean }) {
  return (
    <div className="flex flex-col">
      {listings.map((l) => {
        const media = [...(l.listing_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        const seller = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
        return (
          <ListingRow
            key={l.id}
            id={l.id}
            title={l.title}
            description={l.description}
            priceMinor={l.price_minor ?? 0}
            currencyCode={l.currency_code}
            city={Array.isArray(l.locations) ? l.locations[0]?.city : l.locations?.city}
            imageUrl={media ? resolveMediaUrl(media.storage_key, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null}
            pickupAvailable={l.pickup_available}
            deliveryAvailable={l.delivery_available}
            sellerName={seller?.display_name || seller?.username || "a seller"}
            isFavorited={favoritedIds.has(l.id)}
            signedIn={signedIn}
          />
        );
      })}
    </div>
  );
}
