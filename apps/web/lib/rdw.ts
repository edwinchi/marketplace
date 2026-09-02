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
  vehicleType: string;
  color: string;
  fuelType: string | null;
  doors: number | null;
  seats: number | null;
  engineDisplacementCc: number | null;
  firstRegisteredAt: string | null;
  motExpiresAt: string | null;
};

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

  return {
    plate,
    make: vehicle.merk ?? "",
    model: vehicle.handelsbenaming ?? "",
    vehicleType: vehicle.voertuigsoort ?? "",
    color: vehicle.eerste_kleur ?? "",
    fuelType: primaryFuel?.brandstof_omschrijving ?? null,
    doors: vehicle.aantal_deuren ? Number(vehicle.aantal_deuren) : null,
    seats: vehicle.aantal_zitplaatsen ? Number(vehicle.aantal_zitplaatsen) : null,
    engineDisplacementCc: vehicle.cilinderinhoud ? Number(vehicle.cilinderinhoud) : null,
    firstRegisteredAt: parseRdwDate(vehicle.datum_eerste_toelating),
    motExpiresAt: parseRdwDate(vehicle.vervaldatum_apk),
  };
}
