// Which country registries the plate lookup actually supports right now, vs. ones on the roadmap.
// Kept as one small list so the UI (country selector) and the server action (routing + honest
// "not available yet" messaging) can't drift out of sync with each other.
//
// NL/RDW is real and free (lib/rdw.ts, verified against the live API). FR and DE are deliberately
// listed as unavailable rather than silently omitted -- both have real providers
// (immatriculationapi.com for FR, kbaapi.de for DE), but each needs its own trial-account signup
// to see real API docs before writing code against it, same bar RDW was held to. Don't wire either
// up without that verification step, however tempting it is to guess the shape from RDW's.
export type VehicleRegistryCountry = {
  code: string;
  name: string;
  available: boolean;
};

export const VEHICLE_REGISTRY_COUNTRIES: VehicleRegistryCountry[] = [
  { code: "NL", name: "Netherlands", available: true },
  { code: "FR", name: "France", available: false },
  { code: "DE", name: "Germany", available: false },
  { code: "BE", name: "Belgium", available: false },
  { code: "GB", name: "United Kingdom", available: false },
  { code: "IE", name: "Ireland", available: false },
];

export const DEFAULT_REGISTRY_COUNTRY = "NL";
