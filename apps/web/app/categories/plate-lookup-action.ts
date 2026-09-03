"use server";

import { lookupVehicleByPlate as lookupVehicleByPlateRdw, normalizePlate, type VehicleLookupResult } from "@/lib/rdw";
import { isRegcheckConfigured, lookupVehicleByPlateRegcheck, lookupVehicleGermanyByKba } from "@/lib/regcheck";
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

// Germany (and any future kbaBased country) has no plate lookup at all -- this takes an HSN/TSN
// document number instead, entered through a distinct input (see plate-lookup.tsx).
export async function searchVehicleByKba(kbaNumber: string, countryCode: string): Promise<PlateLookupResult> {
  const cleaned = kbaNumber.trim();
  if (!cleaned) return { data: null, error: "Enter the HSN/TSN number from your vehicle document." };

  const country = VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === countryCode);
  if (!country || !country.kbaBased) return { data: null, error: "Unknown country." };

  if (!isRegcheckConfigured()) {
    return { data: null, error: `${country.name} lookup is being set up — check back soon.` };
  }
  try {
    const result = await lookupVehicleGermanyByKba(cleaned);
    if (!result) return { data: null, error: `No vehicle found for that HSN/TSN number.` };
    return { data: result, error: null };
  } catch {
    return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
  }
}
