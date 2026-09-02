"use server";

import { lookupVehicleByPlate, normalizePlate, type VehicleLookupResult } from "@/lib/rdw";
import { VEHICLE_REGISTRY_COUNTRIES } from "@/lib/vehicle-registries";

export type PlateLookupResult = { data: VehicleLookupResult | null; error: string | null };

export async function searchVehicleByPlate(plate: string, countryCode: string): Promise<PlateLookupResult> {
  const normalized = normalizePlate(plate);
  if (!normalized) return { data: null, error: "Enter a license plate number." };

  const country = VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return { data: null, error: "Unknown country." };

  if (!country.available) {
    return { data: null, error: `${country.name} isn't supported yet — coming soon. Netherlands is available now.` };
  }

  // Only NL/RDW is real right now (lib/rdw.ts) -- this switch is where a future country's lookup
  // function plugs in once it's been verified against real API docs, same as RDW was.
  switch (country.code) {
    case "NL": {
      try {
        const result = await lookupVehicleByPlate(normalized);
        if (!result) return { data: null, error: "No Dutch-registered vehicle found for that plate." };
        return { data: result, error: null };
      } catch {
        return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
      }
    }
    default:
      return { data: null, error: `${country.name} isn't supported yet — coming soon.` };
  }
}
