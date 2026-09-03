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
//   - AT: same shape of problem as Germany below -- CheckAustria takes a NatCode (int), not a
//     plate or a document number a typical seller would have to hand. No UI built for it yet.
//   - GB: this provider only offers CheckMotorBikeUK (motorcycles) -- no general car method at
//     all, from this vendor.
//   - BG, LU: no method offered by this provider for either country.
//
// DE is available, but NOT plate-based: German plate data is legally protected, so there is no
// plate-to-vehicle API from any provider. `kbaBased: true` marks this -- the UI (plate-lookup.tsx)
// swaps the plate input for an HSN/TSN (vehicle-type key number, printed on the Fahrzeugschein)
// input for any country with this flag, and the server action (plate-lookup-action.ts) routes it
// to lib/regcheck.ts's lookupVehicleGermanyByKba instead of the generic plate dispatcher. Not yet
// verified against a real live KBA number (no German test data available) -- same "mechanism
// verified generically, this specific country not individually spot-checked" position as most of
// the plate-based countries above.
export type VehicleRegistryCountry = {
  code: string;
  name: string;
  available: boolean;
  // SOAP operation name in lib/regcheck.ts's provider, e.g. "CheckFrance" -- present only for
  // countries routed through the generic RegCheck lookup (not NL, which uses RDW directly).
  regcheckMethod?: string;
  // True for a country with no plate-based lookup at all -- routes through a document-number
  // input instead. See the DE comment above.
  kbaBased?: boolean;
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
  { code: "DE", name: "Germany", available: true, kbaBased: true },
  { code: "AT", name: "Austria", available: false },
  { code: "BE", name: "Belgium", available: false },
  { code: "GB", name: "United Kingdom", available: false },
  { code: "BG", name: "Bulgaria", available: false },
  { code: "LU", name: "Luxembourg", available: false },
];

export const DEFAULT_REGISTRY_COUNTRY = "NL";
