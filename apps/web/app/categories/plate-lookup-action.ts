"use server";

import { lookupVehicleByPlate, normalizePlate, type VehicleLookupResult } from "@/lib/rdw";

export type PlateLookupResult = { data: VehicleLookupResult | null; error: string | null };

export async function searchVehicleByPlate(plate: string): Promise<PlateLookupResult> {
  const normalized = normalizePlate(plate);
  if (!normalized) return { data: null, error: "Enter a license plate number." };

  try {
    const result = await lookupVehicleByPlate(normalized);
    if (!result) return { data: null, error: "No Dutch-registered vehicle found for that plate." };
    return { data: result, error: null };
  } catch {
    return { data: null, error: "Couldn't reach the vehicle registry — try again in a moment." };
  }
}
