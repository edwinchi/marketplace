"use server";

import { lookupVehicleByPlate as lookupVehicleByPlateRdw, normalizePlate, type VehicleLookupResult } from "@/lib/rdw";
import { isRegcheckConfigured, lookupVehicleByPlateRegcheck } from "@/lib/regcheck";
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

  if (country.code === "NL") {
    try {
      const result = await lookupVehicleByPlateRdw(normalized);
      if (!result) return { data: null, error: "No Dutch-registered vehicle found for that plate." };
      return { data: result, error: null };
    } catch {
      return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
    }
  }

  // Every other available country routes through lib/regcheck.ts's generic dispatcher via its
  // regcheckMethod (see vehicle-registries.ts for which SOAP operation each country maps to).
  if (country.regcheckMethod) {
    if (!isRegcheckConfigured()) {
      return { data: null, error: `${country.name} lookup is being set up — check back soon.` };
    }
    try {
      const result = await lookupVehicleByPlateRegcheck(country.regcheckMethod, normalized);
      if (!result) return { data: null, error: `No ${country.name}-registered vehicle found for that plate.` };
      return { data: result, error: null };
    } catch {
      return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
    }
  }

  return { data: null, error: `${country.name} isn't supported yet — coming soon.` };
}
