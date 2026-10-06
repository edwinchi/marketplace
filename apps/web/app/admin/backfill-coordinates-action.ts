"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { geocodeLocation } from "@/lib/geocode";

// Same click-to-run-a-batch shape as backfillListingEmbeddings: a Server Action has a real timeout,
// and non-Dutch lookups go through Nominatim, whose usage policy caps us at ~1 request/second --
// so a batch is small and paces itself. Every run only touches locations still missing
// coordinates; ones that can't be geocoded (a typo'd town) stay counted in `remaining` and show up
// as `failed`, rather than being silently dropped.
const BATCH_SIZE = 20;
const NOMINATIM_GAP_MS = 1100;

export async function backfillLocationCoordinates(): Promise<{ processed: number; failed: number; remaining: number }> {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, city, postal_code, country_code")
    .is("latitude", null)
    .order("id")
    .limit(BATCH_SIZE);

  let processed = 0;
  let failed = 0;
  for (const loc of locations ?? []) {
    const countryCode = (loc.country_code ?? "NL").trim();
    const point = await geocodeLocation({ city: loc.city, postalCode: loc.postal_code, countryCode });
    if (point) {
      const { error } = await supabase.from("locations").update({ latitude: point.lat, longitude: point.lng }).eq("id", loc.id);
      if (error) failed++;
      else processed++;
    } else {
      failed++;
    }
    if (countryCode !== "NL") await new Promise((r) => setTimeout(r, NOMINATIM_GAP_MS));
  }

  const { count: remaining } = await supabase.from("locations").select("id", { count: "exact", head: true }).is("latitude", null);
  return { processed, failed, remaining: remaining ?? 0 };
}
