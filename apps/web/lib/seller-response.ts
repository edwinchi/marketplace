import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export type ResponseBucket = "hour" | "hours" | "day" | "days";

// Median reply time for a seller (supabase/migrations/20260101009200_seller_response_time.sql),
// bucketed the way Marktplaats phrases it. Cached per seller for an hour -- the underlying query
// walks the seller's conversations, and a seller's typical reply speed doesn't change minute to
// minute. Null (nothing shown) when there's not enough history yet, when replies typically take
// longer than a few days (not a signal worth advertising), or if the function isn't deployed yet.
export const getSellerResponseBucket = unstable_cache(
  async (sellerId: string): Promise<ResponseBucket | null> => {
    const { data: minutes, error } = await createServiceClient().rpc("seller_response_minutes", { p_profile_id: sellerId });
    if (error || minutes == null) return null;
    return responseBucketForMinutes(minutes);
  },
  ["seller-response-bucket"],
  { revalidate: 3600 },
);

export function responseBucketForMinutes(minutes: number): ResponseBucket | null {
  if (minutes <= 60) return "hour";
  if (minutes <= 6 * 60) return "hours";
  if (minutes <= 24 * 60) return "day";
  if (minutes <= 3 * 24 * 60) return "days";
  return null;
}
