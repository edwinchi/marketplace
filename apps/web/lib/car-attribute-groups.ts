export type AttributeGroup = { label: string; stableKeys: string[] };

// Groups the Cars category's ~26 attributes into tabs for the step-2 form, so they read as four
// short screens instead of one long scroll -- mirrors the read-only plate-lookup display's own
// Basics/Technical/Environment split (components/plate-lookup.tsx), extended with an Options tab
// and the fields a seller fills in by hand (mileage, condition, options, ...) that a registry
// lookup never touches. Cars-specific and hand-maintained on purpose: most other categories have
// too few attributes to need tabs at all, so this isn't a generic per-category mechanism.
export const CAR_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    label: "Basics",
    stableKeys: [
      "brand",
      "vehicle_make",
      "vehicle_model",
      "condition",
      "colour",
      "production_year",
      "mileage",
      "body_type",
      "doors",
      "seats",
      "mot_expiry",
    ],
  },
  {
    label: "Technical",
    stableKeys: [
      "fuel_type",
      "transmission",
      "power",
      "cylinder_count",
      "engine_displacement",
      "curb_weight",
      "towing_capacity_braked",
      "towing_capacity_unbraked",
      "interior_type",
      "upholstery",
    ],
  },
  {
    label: "Environment",
    stableKeys: ["emission_class", "fuel_consumption", "co2_emissions", "energy_label"],
  },
  {
    label: "Options",
    stableKeys: ["dealer_maintained", "maintenance_booklet", "vat_deductible", "vehicle_options"],
  },
];
