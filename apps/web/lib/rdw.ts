// RDW (Rijksdienst voor het Wegverkeer) Open Data — the Dutch government's public vehicle
// registration API. Free, no API key, no account: see agents.md-linked roadmap discussion. Only
// covers Dutch-plated ("kenteken") vehicles; that's a real scope limit, not a bug, and the UI
// says so rather than pretending broader coverage.
//
// Two separate resources need querying and joining by plate: the main vehicle dataset (make,
// model, color, dates, etc.) and a separate one-to-many fuel-type dataset. Verified live against
// https://opendata.rdw.nl before building this — field names below are copied from a real response,
// not guessed from docs.
const VEHICLE_RESOURCE = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const FUEL_RESOURCE = "https://opendata.rdw.nl/resource/8ys7-d773.json";

export type VehicleLookupResult = {
  plate: string;
  make: string;
  model: string;
  // Trim/version string (e.g. "1.4 TSI 125 ACTIVE") -- only ever populated for RegCheck-sourced
  // countries (lib/regcheck.ts), which carry it in ExtendedData.libVersion. RDW has no equivalent
  // field; always null for NL.
  trim: string | null;
  vehicleType: string;
  color: string;
  fuelType: string | null;
  // Matches one of this project's own seeded fuel_type attribute_options.stable_key values
  // (supabase/migrations/20260101000600_seed_attributes_mappings.sql) -- null when RDW's fuel
  // description doesn't map cleanly to one of them, so the caller can leave that field blank
  // rather than guess.
  fuelTypeStableKey: string | null;
  doors: number | null;
  seats: number | null;
  cylinders: number | null;
  engineDisplacementCc: number | null;
  // Net power, converted to metric horsepower (pk) -- RDW-only (nettomaximumvermogen, kW). No
  // verified real-power field from RegCheck yet (its EngineSize is fiscal horsepower, not this).
  powerHp: number | null;
  // Automatic/manual -- opportunistic from RegCheck's ExtendedData.boiteDeVitesse when populated
  // (empty in every real response seen so far). RDW has no transmission-type field at all.
  transmission: string | null;
  firstRegisteredAt: string | null;
  motExpiresAt: string | null;
  // RDW-only environmental figures (co2GramsPerKm is also opportunistically read from RegCheck's
  // ExtendedData.Co2 when a country happens to populate it).
  fuelConsumptionL100km: number | null;
  co2GramsPerKm: number | null;
  energyLabel: string | null;
  emissionStandard: string | null;
};

// RDW's brandstof_omschrijving values, mapped to this project's seeded fuel_type options. More
// than one fuel row for the same plate (common for hybrids) means "hybrid" regardless of which
// two fuels they are -- that's a more useful signal than picking one arbitrarily.
const FUEL_MAP: Record<string, string> = {
  benzine: "petrol",
  diesel: "diesel",
  elektriciteit: "electric",
  waterstof: "hydrogen",
  lpg: "lpg",
  "cng (compressed natural gas)": "lpg",
};

function mapFuelTypeToStableKey(descriptions: string[]): string | null {
  if (descriptions.length > 1) return "hybrid";
  const key = descriptions[0]?.trim().toLowerCase();
  return key ? (FUEL_MAP[key] ?? null) : null;
}

// Dutch color names RDW actually returns (eerste_kleur), translated for display in an English UI.
// Deliberately small and literal -- unrecognized values pass through untranslated rather than
// guessing.
const COLOR_MAP: Record<string, string> = {
  grijs: "Grey",
  wit: "White",
  zwart: "Black",
  rood: "Red",
  blauw: "Blue",
  groen: "Green",
  geel: "Yellow",
  oranje: "Orange",
  bruin: "Brown",
  paars: "Purple",
  roze: "Pink",
  beige: "Beige",
  zilver: "Silver",
  goud: "Gold",
};

export function translateDutchColor(dutch: string): string {
  const key = dutch.trim().toLowerCase();
  return COLOR_MAP[key] ?? dutch;
}

// RDW's `inrichting` (body configuration) is a more specific, more useful field than
// `voertuigsoort` (broad regulatory category, e.g. "Personenauto" for every passenger car) --
// verified real values below (e.g. "stationwagen") come from a live response. Falls back to
// voertuigsoort, untranslated, for values outside this list rather than guessing a translation.
const BODY_STYLE_MAP: Record<string, string> = {
  sedan: "Sedan",
  hatchback: "Hatchback",
  stationwagen: "Estate",
  coupe: "Coupe",
  cabriolet: "Convertible",
  mpv: "MPV",
  terreinwagen: "SUV",
  bestelauto: "Van",
  "pick-up": "Pickup",
};

function translateBodyStyle(inrichting: string | undefined, voertuigsoort: string | undefined): string {
  const key = inrichting?.trim().toLowerCase();
  if (key && BODY_STYLE_MAP[key]) return BODY_STYLE_MAP[key];
  return inrichting || voertuigsoort || "";
}

// RDW stores/queries plates with no separator ("TH918F"), but Dutch plates are conventionally
// displayed and typed with dashes ("TH-918-F") — strip everything but letters/digits and
// uppercase, so either form works as input.
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseRdwDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export async function lookupVehicleByPlate(rawPlate: string): Promise<VehicleLookupResult | null> {
  const plate = normalizePlate(rawPlate);
  if (!plate) return null;

  const [vehicleRes, fuelRes] = await Promise.all([
    fetch(`${VEHICLE_RESOURCE}?kenteken=${encodeURIComponent(plate)}`, { next: { revalidate: 0 } }),
    fetch(`${FUEL_RESOURCE}?kenteken=${encodeURIComponent(plate)}`, { next: { revalidate: 0 } }),
  ]);
  if (!vehicleRes.ok) return null;

  const vehicles: Record<string, string>[] = await vehicleRes.json();
  const vehicle = vehicles[0];
  if (!vehicle) return null;

  const fuels: Record<string, string>[] = fuelRes.ok ? await fuelRes.json() : [];
  // brandstof_volgnummer=1 is the primary fuel type; multi-fuel vehicles (hybrids) list more, but
  // the primary one is what a buyer actually wants to see at a glance.
  const primaryFuel = fuels.find((f) => f.brandstof_volgnummer === "1") ?? fuels[0];
  const fuelDescriptions = fuels.map((f) => f.brandstof_omschrijving).filter((d): d is string => !!d);

  // nettomaximumvermogen is net power in kW (verified against a live response) -- 1 kW = 1.35962
  // metric horsepower (pk), the unit Dutch buyers expect.
  const powerKw = primaryFuel?.nettomaximumvermogen ? Number(primaryFuel.nettomaximumvermogen) : NaN;

  return {
    plate,
    make: vehicle.merk ?? "",
    model: vehicle.handelsbenaming ?? "",
    trim: null,
    vehicleType: translateBodyStyle(vehicle.inrichting, vehicle.voertuigsoort),
    color: vehicle.eerste_kleur ?? "",
    fuelType: primaryFuel?.brandstof_omschrijving ?? null,
    fuelTypeStableKey: mapFuelTypeToStableKey(fuelDescriptions),
    doors: vehicle.aantal_deuren ? Number(vehicle.aantal_deuren) : null,
    seats: vehicle.aantal_zitplaatsen ? Number(vehicle.aantal_zitplaatsen) : null,
    cylinders: vehicle.aantal_cilinders ? Number(vehicle.aantal_cilinders) : null,
    engineDisplacementCc: vehicle.cilinderinhoud ? Number(vehicle.cilinderinhoud) : null,
    powerHp: Number.isFinite(powerKw) && powerKw > 0 ? Math.round(powerKw * 1.35962) : null,
    transmission: null,
    firstRegisteredAt: parseRdwDate(vehicle.datum_eerste_toelating),
    motExpiresAt: parseRdwDate(vehicle.vervaldatum_apk),
    fuelConsumptionL100km: primaryFuel?.brandstofverbruik_gecombineerd ? Number(primaryFuel.brandstofverbruik_gecombineerd) : null,
    co2GramsPerKm: primaryFuel?.co2_uitstoot_gecombineerd ? Number(primaryFuel.co2_uitstoot_gecombineerd) : null,
    energyLabel: vehicle.zuinigheidsclassificatie || null,
    emissionStandard: primaryFuel?.uitlaatemissieniveau || null,
  };
}
