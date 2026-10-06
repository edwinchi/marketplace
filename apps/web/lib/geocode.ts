import { unstable_cache } from "next/cache";

export type LatLng = { lat: number; lng: number };

// Coordinates for distance search (supabase/migrations/20260101009400_distance_search.sql).
// PDOK Locatieserver for the Netherlands -- the government's own free, keyless geocoder, exact to
// the 6-character postcode -- and OpenStreetMap Nominatim everywhere else (free, but its usage
// policy allows at most ~1 request/second with an identifying User-Agent, which listing-posting
// volume stays far below; the admin backfill paces itself to match). Best-effort throughout: a
// failed lookup returns null and never blocks posting or searching -- the listing just doesn't
// show up in distance-filtered results until it has coordinates.

const NL_POSTCODE = /^\d{4}\s?[A-Z]{2}$/i;
const USER_AGENT = "MarketitNow/1.0 (+https://marketitnow.net)";
const TIMEOUT_MS = 4000;

// "POINT(4.90008448 52.37881084)" -> lng 4.90, lat 52.37
export function parseWktPoint(wkt: string | undefined | null): LatLng | null {
  const m = wkt?.match(/^POINT\((-?[\d.]+) (-?[\d.]+)\)$/);
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function parseNominatim(body: unknown): LatLng | null {
  const first = Array.isArray(body) ? (body[0] as { lat?: string; lon?: string } | undefined) : undefined;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  return first && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function pdok(query: string, type: "postcode" | "woonplaats"): Promise<LatLng | null> {
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(query)}&rows=1&fq=type:${type}&fl=centroide_ll`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: { docs?: { centroide_ll?: string }[] } };
    return parseWktPoint(json.response?.docs?.[0]?.centroide_ll);
  } catch {
    return null;
  }
}

async function nominatim(params: Record<string, string>): Promise<LatLng | null> {
  try {
    const qs = new URLSearchParams({ format: "jsonv2", limit: "1", ...params });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return parseNominatim(await res.json());
  } catch {
    return null;
  }
}

// A listing's own location: country is always known here.
export async function geocodeLocation({ city, postalCode, countryCode }: { city: string | null; postalCode: string | null; countryCode: string }): Promise<LatLng | null> {
  const postcode = postalCode?.trim() ?? "";
  if (countryCode === "NL") {
    if (NL_POSTCODE.test(postcode)) {
      const exact = await pdok(postcode.replace(/\s/g, "").toUpperCase(), "postcode");
      if (exact) return exact;
    }
    if (city) return pdok(city, "woonplaats");
    return null;
  }
  if (!city && !postcode) return null;
  return nominatim({
    countrycodes: countryCode.toLowerCase(),
    ...(city ? { city } : {}),
    ...(postcode ? { postalcode: postcode } : {}),
  });
}

// What a buyer typed into the distance filter ("1012AB", "Utrecht", "Lagos"): no country given,
// so a Dutch postcode goes to PDOK, a place name tries PDOK's towns first (the site's home market)
// and falls back to Nominatim worldwide. Cached for a day per input -- the same few towns get
// searched over and over, and it keeps Nominatim traffic minimal.
export const geocodeSearchInput = unstable_cache(
  async (input: string): Promise<LatLng | null> => {
    const q = input.trim();
    if (!q) return null;
    if (NL_POSTCODE.test(q)) return pdok(q.replace(/\s/g, "").toUpperCase(), "postcode");
    return (await pdok(q, "woonplaats")) ?? (await nominatim({ q }));
  },
  ["geocode-search-input"],
  { revalidate: 86400 },
);
