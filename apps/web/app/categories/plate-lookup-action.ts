"use server";

import { lookupVehicleByPlate as lookupVehicleByPlateRdw, normalizePlate, type VehicleLookupResult } from "@/lib/rdw";
import { isRegcheckConfigured, lookupVehicleByPlateRegcheck, lookupVehicleGermanyByKba } from "@/lib/regcheck";
import { VEHICLE_REGISTRY_COUNTRIES } from "@/lib/vehicle-registries";
import { headers } from "next/headers";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

// RegCheck bills per lookup, and these Server Actions are publicly POST-able without signing in, so
// without a cap anyone could script them to drain the account's credits. Per-IP, RegCheck paths
// only -- the Dutch RDW lookup is free open data and stays unlimited.
const REGCHECK_LOOKUPS_PER_HOUR = 10;
const RATE_LIMITED_ERROR = "Too many vehicle lookups from your connection — try again in an hour.";

async function allowRegcheckLookup(): Promise<boolean> {
  const ip = clientIpFromHeaders(await headers());
  return checkRateLimit(`regcheck-lookup:${ip}`, REGCHECK_LOOKUPS_PER_HOUR, 3600);
}

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
    if (!(await allowRegcheckLookup())) return { data: null, error: RATE_LIMITED_ERROR };
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
  if (!(await allowRegcheckLookup())) return { data: null, error: RATE_LIMITED_ERROR };
  try {
    const result = await lookupVehicleGermanyByKba(cleaned);
    if (!result) return { data: null, error: `No vehicle found for that HSN/TSN number.` };
    return { data: result, error: null };
  } catch {
    return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
  }
}
