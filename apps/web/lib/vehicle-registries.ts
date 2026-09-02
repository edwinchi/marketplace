// Which country registries the plate lookup actually supports right now, vs. ones with no path to
// support. Kept as one small list so the UI (country selector) and the server action (routing +
// honest "not available yet" messaging) can't drift out of sync with each other.
//
// NL routes through lib/rdw.ts -- free, official, verified against the live API. Every other
// `available: true` entry routes through lib/regcheck.ts's generic lookupVehicleByPlateRegcheck
// via its `regcheckMethod` (regcheck.org.uk, one shared REGCHECK_USERNAME). That mechanism --
// envelope, auth, vehicleJson parsing -- is verified against two real, successful CheckFrance
// calls (real French plates, correctly decoded make/model/year/fuel). The other countries below
// share that exact same request/response shape (confirmed from the live WSDL for all of them) but
// haven't each been individually spot-checked with a real plate -- doing that for all ~26 would
// cost a credit per country against a 10-credit trial account. Every call already fails honest
// (try/catch -> "couldn't reach the registry", empty result -> "no vehicle found") rather than
// fabricating data, so a per-country data-quality surprise shows up as an honest error, not a
// wrong listing. Flag any bad-looking real result and it gets fixed for that specific country.
//
// Not available, and why (none of these are "needs a credential", they're structural):
//   - BE: RegCheck's CheckBelgium is confirmed dead on the provider's side (2026-09-02) --
//     "Belgium is no longer supported, and will be removed". Needs a different provider entirely.
//   - DE: no plate-based lookup exists from ANY provider -- German plate data is legally
//     protected. The only lookup is by HSN/TSN (vehicle-type key number on the Fahrzeugschein),
//     via lib/regcheck.ts's lookupVehicleByPlateRegcheck("CheckGermany", kbaNumber) -- needs its
//     own "enter your document number" UI, not this plate search box.
//   - AT: same shape of problem as Germany -- CheckAustria takes a NatCode (int), not a plate.
//   - GB: this provider only offers CheckMotorBikeUK (motorcycles) -- no general car method at
//     all, from this vendor.
//   - BG, LU: no method offered by this provider for either country.
export type VehicleRegistryCountry = {
  code: string;
  name: string;
  available: boolean;
  // SOAP operation name in lib/regcheck.ts's provider, e.g. "CheckFrance" -- present only for
  // countries routed through the generic RegCheck lookup (not NL, which uses RDW directly).
  regcheckMethod?: string;
};

export const VEHICLE_REGISTRY_COUNTRIES: VehicleRegistryCountry[] = [
  { code: "NL", name: "Netherlands", available: true },
  { code: "FR", name: "France", available: true, regcheckMethod: "CheckFrance" },
  { code: "IE", name: "Ireland", available: true, regcheckMethod: "CheckIreland" },
  { code: "ES", name: "Spain", available: true, regcheckMethod: "CheckSpain" },
  { code: "IT", name: "Italy", available: true, regcheckMethod: "CheckItaly" },
  { code: "PT", name: "Portugal", available: true, regcheckMethod: "CheckPortugal" },
  { code: "DK", name: "Denmark", available: true, regcheckMethod: "CheckDenmark" },
  { code: "SE", name: "Sweden", available: true, regcheckMethod: "CheckSweden" },
  { code: "FI", name: "Finland", available: true, regcheckMethod: "CheckFinland" },
  { code: "NO", name: "Norway", available: true, regcheckMethod: "CheckNorway" },
  { code: "IS", name: "Iceland", available: true, regcheckMethod: "CheckIceland" },
  { code: "PL", name: "Poland", available: true, regcheckMethod: "CheckPoland" },
  { code: "CZ", name: "Czech Republic", available: true, regcheckMethod: "CheckCzechRepublic" },
  { code: "SK", name: "Slovakia", available: true, regcheckMethod: "CheckSlovakia" },
  { code: "HU", name: "Hungary", available: true, regcheckMethod: "CheckHungary" },
  { code: "RO", name: "Romania", available: true, regcheckMethod: "CheckRomania" },
  { code: "HR", name: "Croatia", available: true, regcheckMethod: "CheckCroatia" },
  { code: "SI", name: "Slovenia", available: true, regcheckMethod: "CheckSlovenia" },
  { code: "GR", name: "Greece", available: true, regcheckMethod: "CheckGreece" },
  { code: "CY", name: "Cyprus", available: true, regcheckMethod: "CheckCyprus" },
  { code: "MT", name: "Malta", available: true, regcheckMethod: "CheckMalta" },
  { code: "LT", name: "Lithuania", available: true, regcheckMethod: "CheckLithuania" },
  { code: "LV", name: "Latvia", available: true, regcheckMethod: "CheckLatvia" },
  { code: "EE", name: "Estonia", available: true, regcheckMethod: "CheckEstonia" },
  { code: "CH", name: "Switzerland", available: true, regcheckMethod: "CheckSwitzerland" },
  { code: "AL", name: "Albania", available: true, regcheckMethod: "CheckAlbania" },
  { code: "UA", name: "Ukraine", available: true, regcheckMethod: "CheckUkraine" },
  { code: "DE", name: "Germany", available: false },
  { code: "AT", name: "Austria", available: false },
  { code: "BE", name: "Belgium", available: false },
  { code: "GB", name: "United Kingdom", available: false },
  { code: "BG", name: "Bulgaria", available: false },
  { code: "LU", name: "Luxembourg", available: false },
];

export const DEFAULT_REGISTRY_COUNTRY = "NL";
