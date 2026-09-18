import type { VehicleLookupResult } from "@/lib/rdw";
import { translateDutchColor } from "@/lib/rdw";
import type { AttributeDef } from "@/lib/categories";

// RDW/RegCheck return names in shouting caps ("FORD", "FOCUS") -- a light per-word title-case
// reads far better as a pre-filled draft value than raw caps, and it's just a draft (the seller
// reviews and can still edit it before publishing), so an imperfect result for acronym brands
// ("Bmw", not "BMW") is an acceptable trade-off, not worth a brand-name exceptions list.
export function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// The make+model line used as a draft ad title wherever a plate lookup succeeds (step 1's "Sell
// your car" modal and step 2's own inline plate search) -- one place so both stay in sync.
export function vehicleLookupTitle(data: VehicleLookupResult): string {
  return `${data.make ? toTitleCase(data.make) : ""} ${data.model ? toTitleCase(data.model) : ""}`.trim();
}

// data.vehicleType is already the translated English body-style label (lib/rdw.ts's own
// BODY_STYLE_MAP, or a RegCheck BodyStyle string -- usually empty per lib/regcheck.ts's own
// comments) -- this just derives the matching body_type attribute_option's stable_key (see
// supabase/migrations/20260101007900) from that label, rather than a second Dutch-keyed map
// duplicating BODY_STYLE_MAP's own translation work.
const BODY_TYPE_LABEL_TO_STABLE_KEY: Record<string, string> = {
  sedan: "sedan",
  hatchback: "hatchback",
  estate: "estate",
  coupe: "coupe",
  convertible: "convertible",
  mpv: "mpv",
  suv: "suv",
  van: "van",
  pickup: "pickup",
};

// data.emissionStandard carries RDW's raw uitlaatemissieniveau text -- confirmed live against a
// real response: "EURO 5 J", not a bare "5" or "EURO5". Extracts the Euro-standard digit and maps
// it to the emission_class attribute's seeded stable_keys (euro6/euro5/euro4/euro3_or_older).
function emissionClassStableKey(emissionStandard: string | null): string | null {
  if (!emissionStandard) return null;
  const digit = emissionStandard.match(/(\d)/)?.[1];
  if (!digit) return null;
  const n = Number(digit);
  if (n >= 6) return "euro6";
  if (n === 5) return "euro5";
  if (n === 4) return "euro4";
  return "euro3_or_older";
}

// Maps a real vehicle-registry lookup onto this app's Cars attribute defaults -- shared by the
// step-1 "Sell your car" plate modal and step 2's own "Have the plate number?" section so both
// apply exactly the same fields, not two independently-maintained subsets. Only ever sets a field
// when the source data and a matching attribute/option both genuinely exist -- no guessing, same
// discipline as lib/rdw.ts and lib/regcheck.ts themselves.
export function mapVehicleLookupToAttributeDefaults(data: VehicleLookupResult, attributes: AttributeDef[]): Record<string, string> {
  const defaults: Record<string, string> = {};

  const optionId = (attrStableKey: string, optionStableKey: string | null) => {
    if (!optionStableKey) return undefined;
    return attributes.find((a) => a.stableKey === attrStableKey)?.options.find((o) => o.stableKey === optionStableKey)?.id;
  };

  // brand/vehicle_make/vehicle_model have zero seeded attribute_options (thousands of open-ended
  // values, never a fixed list) -- components/listing-attribute-field.tsx falls those back to
  // plain text fields, so a raw string is the correct default here, not an option id.
  if (data.make) {
    const make = toTitleCase(data.make);
    defaults.brand = make;
    defaults.vehicle_make = make;
  }
  if (data.model) defaults.vehicle_model = toTitleCase(data.model);

  if (data.color) {
    const id = optionId("colour", translateDutchColor(data.color).toLowerCase().replace(/\s+/g, "_"));
    if (id) defaults.colour = id;
  }
  if (data.fuelTypeStableKey) {
    const id = optionId("fuel_type", data.fuelTypeStableKey);
    if (id) defaults.fuel_type = id;
  }
  if (data.vehicleType) {
    const id = optionId("body_type", BODY_TYPE_LABEL_TO_STABLE_KEY[data.vehicleType.toLowerCase()] ?? null);
    if (id) defaults.body_type = id;
  }
  const emissionKey = emissionClassStableKey(data.emissionStandard);
  if (emissionKey) {
    const id = optionId("emission_class", emissionKey);
    if (id) defaults.emission_class = id;
  }

  // production_year has no dedicated field on VehicleLookupResult -- derived from the same
  // firstRegisteredAt date string the read-only lookup display already shows.
  const year = data.firstRegisteredAt?.match(/^(\d{4})/)?.[1];
  if (year) defaults.production_year = year;

  // power's unit is kW (see the attribute's unit_code); powerHp is already converted from RDW's
  // raw kW figure using this same 1.35962 factor (lib/rdw.ts), so this just converts it back
  // rather than threading a second raw-kW field through both providers for one round-trip.
  if (data.powerHp != null) defaults.power = String(Math.round(data.powerHp / 1.35962));
  if (data.curbWeightKg != null) defaults.curb_weight = String(data.curbWeightKg);
  if (data.cylinders != null) defaults.cylinder_count = String(data.cylinders);
  if (data.engineDisplacementCc != null) defaults.engine_displacement = String(data.engineDisplacementCc);
  if (data.towingCapacityBrakedKg != null) defaults.towing_capacity_braked = String(data.towingCapacityBrakedKg);
  if (data.towingCapacityUnbrakedKg != null) defaults.towing_capacity_unbraked = String(data.towingCapacityUnbrakedKg);

  return defaults;
}
