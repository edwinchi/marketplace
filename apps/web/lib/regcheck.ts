// RegCheck (regcheck.org.uk, part of the carregistrationapi.com family that also runs
// immatriculationapi.com and kbaapi.de) — one SOAP API, one shared `username` credential, covering
// vehicle registry lookups for France, Belgium, Ireland, Netherlands and Germany.
//
// Verified against two real, funded CheckFrance calls (EK-366-AS -> 2017 Skoda Kodiaq,
// ED-062-MQ -> 2000 VW Golf) before finalizing the field mapping below -- not guessed from the
// WSDL alone. Two things the schema didn't reveal that real responses did:
//   - `vehicleJson` (a JSON string embedded in the SOAP response) is more complete and more
//     reliable than the sibling `vehicleData` XML block -- e.g. one real response's vehicleData
//     had BodyStyle="0" (meaningless) while the same response's vehicleJson had BodyStyle="" (an
//     honest "unknown"). Parsing reads vehicleJson, not vehicleData.
//   - `EngineSize` is French fiscal horsepower ("5", "7"), not engine displacement -- deliberately
//     never mapped to cc. `ExtendedData.EngineCC`, when populated, is the real displacement figure
//     and is used for that instead.
//   - The `ImageUrl` field this API returns is dead (confirmed live -- every value redirects to a
//     generic loading-spinner GIF, same as the sibling carimagery.com endpoint), so it's ignored
//     entirely rather than surfaced as a car photo.
//
// CheckGermany is deliberately NOT wired through here as a plate lookup: its only input is a
// KBANumber (the HSN/TSN vehicle-type key number printed on the Fahrzeugschein), not a
// registration plate. Germany has no plate-to-vehicle API at all — plates are protected data
// there. lookupVehicleGermanyByKba is provided for a future "enter your HSN/TSN" flow, distinct
// from the plate search box.

import { normalizePlate, type VehicleLookupResult } from "./rdw";

export type { VehicleLookupResult };

const ENDPOINT = "https://www.regcheck.org.uk/api/reg.asmx";
const NAMESPACE = "http://regcheck.org.uk";

export function isRegcheckConfigured(): boolean {
  return !!process.env.REGCHECK_USERNAME;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Scoped tag extraction — RegCheck's response nests the same tag names (CurrentValue,
// CurrentTextValue) under many different parents, so this always operates on an already-narrowed
// slice of XML rather than the whole document.
function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

function textOf(xml: string, tag: string): string | null {
  const inner = extractTag(xml, tag);
  if (!inner) return null;
  const trimmed = unescapeXml(inner).trim();
  return trimmed || null;
}

// Most vehicleJson fields are either a plain string/number or a { CurrentValue, CurrentTextValue }
// wrapper (verified against real responses) -- this reads either shape.
function textValue(field: unknown): string | null {
  if (field == null) return null;
  if (typeof field === "object") {
    const v = (field as { CurrentTextValue?: unknown }).CurrentTextValue;
    if (v == null || v === "") return null;
    return String(v);
  }
  const s = String(field).trim();
  return s || null;
}

async function callRegcheck(method: string, params: Record<string, string>): Promise<string> {
  const username = process.env.REGCHECK_USERNAME;
  if (!username) throw new Error("REGCHECK_USERNAME not configured");

  const paramXml = Object.entries({ ...params, username })
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join("");
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><${method} xmlns="${NAMESPACE}">${paramXml}</${method}></soap:Body></soap:Envelope>`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${NAMESPACE}/${method}"`,
    },
    body: envelope,
    next: { revalidate: 0 },
  });
  const text = await res.text();

  const fault = textOf(text, "faultstring");
  if (fault) throw new Error(fault);
  return text;
}

// FuelType.CurrentTextValue language depends on the country queried -- verified real French
// responses use French words ("ESSENCE", not "Petrol"), so this matches French and Dutch terms
// (Belgium can return either depending on region) alongside the plain English ones.
function mapFuelType(text: string | null): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("hybrid")) return "hybrid";
  if (lower.includes("electri") || lower.includes("élec")) return "electric";
  if (lower.includes("hydrog") || lower.includes("waterstof")) return "hydrogen";
  if (lower.includes("diesel") || lower.includes("gazole") || lower.includes("gasolie")) return "diesel";
  if (lower.includes("petrol") || lower.includes("gasoline") || lower.includes("essence") || lower.includes("benzine")) return "petrol";
  if (lower.includes("cng") || lower.includes("natural gas")) return "cng";
  if (lower.includes("lpg") || lower.includes("gpl") || lower.includes("gas")) return "lpg";
  return null;
}

function parseVehicleResponse(xml: string, plate: string): VehicleLookupResult | null {
  const jsonRaw = extractTag(xml, "vehicleJson");
  if (!jsonRaw) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(unescapeXml(jsonRaw));
  } catch {
    return null;
  }

  const make = textValue(data.MakeDescription) ?? textValue(data.CarMake);
  const model = textValue(data.ModelDescription) ?? textValue(data.CarModel) ?? textValue(data.Description);
  if (!make && !model) return null;

  const fuelText = textValue(data.FuelType);
  const doorsText = textValue(data.NumberOfDoors);
  const seatsText = textValue(data.NumberOfSeats);
  const doors = doorsText ? Number(doorsText) : NaN;
  const seats = seatsText ? Number(seatsText) : NaN;

  // Real displacement, when RegCheck has it -- distinct from EngineSize, which is fiscal
  // horsepower, not cc (confirmed against real French responses).
  const extendedData = data.ExtendedData as Record<string, unknown> | undefined;
  const engineCcText = extendedData?.EngineCC;
  const engineCc = typeof engineCcText === "string" && engineCcText ? Number(engineCcText) : NaN;
  const cylindersText = extendedData?.Cylinders;
  const cylinders = typeof cylindersText === "string" && cylindersText ? Number(cylindersText) : NaN;
  const co2Text = extendedData?.Co2;
  const co2 = typeof co2Text === "string" && co2Text ? Number(co2Text) : NaN;
  const transmission = typeof extendedData?.boiteDeVitesse === "string" ? extendedData.boiteDeVitesse : "";
  const trim = typeof extendedData?.libVersion === "string" ? extendedData.libVersion : "";

  const registrationDate = typeof data.RegistrationDate === "string" ? data.RegistrationDate : null;

  return {
    plate,
    make: make ?? "",
    model: model ?? "",
    trim: trim || null,
    vehicleType: textValue(data.BodyStyle) ?? "",
    color: "",
    fuelType: fuelText,
    fuelTypeStableKey: mapFuelType(fuelText),
    doors: Number.isFinite(doors) ? doors : null,
    seats: Number.isFinite(seats) ? seats : null,
    cylinders: Number.isFinite(cylinders) && cylinders > 0 ? cylinders : null,
    engineDisplacementCc: Number.isFinite(engineCc) && engineCc > 0 ? engineCc : null,
    // No verified real-power field from this provider -- EngineSize is fiscal horsepower, not
    // this. Left null rather than mislabeling fiscal HP as real power.
    powerHp: null,
    transmission: transmission || null,
    // Falls back to a bare registration year (still just displayed as text by the UI) when the
    // full date isn't present -- both were seen across real responses.
    firstRegisteredAt: registrationDate ?? textValue(data.RegistrationYear),
    motExpiresAt: null,
    // Not verified for any RegCheck-sourced country yet -- ExtendedData carries a Co2 key but it
    // was empty in every real response seen so far, so this stays opportunistic, not relied on.
    fuelConsumptionL100km: null,
    co2GramsPerKm: Number.isFinite(co2) && co2 > 0 ? co2 : null,
    energyLabel: null,
    emissionStandard: null,
  };
}

async function lookupByPlate(method: string, rawPlate: string): Promise<VehicleLookupResult | null> {
  const plate = normalizePlate(rawPlate);
  if (!plate) return null;
  const xml = await callRegcheck(method, { RegistrationNumber: plate });
  return parseVehicleResponse(xml, plate);
}

// Generic entry point for every plate-based country (see vehicle-registries.ts's `regcheckMethod`
// per country, e.g. "CheckFrance", "CheckPoland", "CheckSpain") -- they all share this exact
// RegistrationNumber + username shape and Vehicle response schema, confirmed via two real,
// successful CheckFrance calls. Each individual country's real data hasn't been spot-checked (that
// would cost a credit per country against a 10-credit trial) -- this relies on the shared
// mechanism being verified once, not per country, the same way a REST client isn't re-verified
// per resource ID after its request/response shape is confirmed.
//
// No CheckBelgium here: confirmed live (2026-09-02) that it's dead on the provider's side -- every
// call faults with "Belgium is no longer supported, and will be removed", regardless of plate or
// credit balance. Not a data-availability gap, a discontinued endpoint.
export function lookupVehicleByPlateRegcheck(regcheckMethod: string, plate: string): Promise<VehicleLookupResult | null> {
  return lookupByPlate(regcheckMethod, plate);
}

// Germany has no plate-based lookup anywhere — this is the HSN/TSN key-number flow, for a future
// "enter your vehicle document number" UI distinct from the plate search box.
export async function lookupVehicleGermanyByKba(kbaNumber: string): Promise<VehicleLookupResult | null> {
  const cleaned = kbaNumber.trim();
  if (!cleaned) return null;
  const xml = await callRegcheck("CheckGermany", { KBANumber: cleaned });
  return parseVehicleResponse(xml, cleaned);
}
