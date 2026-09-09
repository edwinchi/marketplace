import type { CurrencyCode } from "./money";

// Nigeria stays first -- both listing-creation forms default the country select to
// ANCHOR_COUNTRIES[0], and Nigeria was the platform's original anchor market. Everything else is
// plain alphabetical: every African country, then every European country (real ISO 3166-1
// sovereign states -- ANCHOR_COUNTRIES was previously just 7 African countries).
//
// `currency` is each country's real, official ISO 4217 currency -- added after a live production
// bug (confirmed by querying real listings: a Cameroon listing stored with NGN, a Nigeria listing
// stored with XAF) showed currency being picked as a totally independent, unlinked form field.
// getCurrencyForCountry() below is now the single source of truth both listing forms and the
// create/update server actions use to DERIVE currency from country -- there's no longer a manual
// currency picker to get out of sync. Note the CFA franc zones in particular: Cameroon/CAR/Chad/
// Congo/Equatorial Guinea/Gabon use XAF (Central African CFA franc); Benin/Burkina Faso/Côte
// d'Ivoire/Guinea-Bissau/Mali/Niger/Senegal/Togo use XOF (West African CFA franc) -- both are
// colloquially called "FCFA" by sellers, but they are different currencies with different
// ISO codes, which is exactly what the reported bug was about.
export const ANCHOR_COUNTRIES: { code: string; name: string; currency: CurrencyCode }[] = [
  { code: "NG", name: "Nigeria", currency: "NGN" },

  // Africa (53 more)
  { code: "DZ", name: "Algeria", currency: "DZD" },
  { code: "AO", name: "Angola", currency: "AOA" },
  { code: "BJ", name: "Benin", currency: "XOF" },
  { code: "BW", name: "Botswana", currency: "BWP" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
  { code: "BI", name: "Burundi", currency: "BIF" },
  { code: "CV", name: "Cabo Verde", currency: "CVE" },
  { code: "CM", name: "Cameroon", currency: "XAF" },
  { code: "CF", name: "Central African Republic", currency: "XAF" },
  { code: "TD", name: "Chad", currency: "XAF" },
  { code: "KM", name: "Comoros", currency: "KMF" },
  { code: "CG", name: "Congo", currency: "XAF" },
  { code: "CD", name: "Congo (DRC)", currency: "CDF" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
  { code: "DJ", name: "Djibouti", currency: "DJF" },
  { code: "EG", name: "Egypt", currency: "EGP" },
  { code: "GQ", name: "Equatorial Guinea", currency: "XAF" },
  { code: "ER", name: "Eritrea", currency: "ERN" },
  { code: "SZ", name: "Eswatini", currency: "SZL" },
  { code: "ET", name: "Ethiopia", currency: "ETB" },
  { code: "GA", name: "Gabon", currency: "XAF" },
  { code: "GM", name: "Gambia", currency: "GMD" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "GN", name: "Guinea", currency: "GNF" },
  { code: "GW", name: "Guinea-Bissau", currency: "XOF" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "LS", name: "Lesotho", currency: "LSL" },
  { code: "LR", name: "Liberia", currency: "LRD" },
  { code: "LY", name: "Libya", currency: "LYD" },
  { code: "MG", name: "Madagascar", currency: "MGA" },
  { code: "MW", name: "Malawi", currency: "MWK" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "MR", name: "Mauritania", currency: "MRU" },
  { code: "MU", name: "Mauritius", currency: "MUR" },
  { code: "MA", name: "Morocco", currency: "MAD" },
  { code: "MZ", name: "Mozambique", currency: "MZN" },
  { code: "NA", name: "Namibia", currency: "NAD" },
  { code: "NE", name: "Niger", currency: "XOF" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "ST", name: "Sao Tome and Principe", currency: "STN" },
  { code: "SN", name: "Senegal", currency: "XOF" },
  { code: "SC", name: "Seychelles", currency: "SCR" },
  { code: "SL", name: "Sierra Leone", currency: "SLE" },
  { code: "SO", name: "Somalia", currency: "SOS" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "SS", name: "South Sudan", currency: "SSP" },
  { code: "SD", name: "Sudan", currency: "SDG" },
  { code: "TZ", name: "Tanzania", currency: "TZS" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "TN", name: "Tunisia", currency: "TND" },
  { code: "UG", name: "Uganda", currency: "UGX" },
  { code: "ZM", name: "Zambia", currency: "ZMW" },
  { code: "ZW", name: "Zimbabwe", currency: "ZWG" },

  // Europe (45)
  { code: "AL", name: "Albania", currency: "ALL" },
  { code: "AD", name: "Andorra", currency: "EUR" },
  { code: "AT", name: "Austria", currency: "EUR" },
  { code: "BY", name: "Belarus", currency: "BYN" },
  { code: "BE", name: "Belgium", currency: "EUR" },
  { code: "BA", name: "Bosnia and Herzegovina", currency: "BAM" },
  { code: "BG", name: "Bulgaria", currency: "BGN" },
  { code: "HR", name: "Croatia", currency: "EUR" },
  { code: "CY", name: "Cyprus", currency: "EUR" },
  { code: "CZ", name: "Czechia", currency: "CZK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "EE", name: "Estonia", currency: "EUR" },
  { code: "FI", name: "Finland", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "GR", name: "Greece", currency: "EUR" },
  { code: "HU", name: "Hungary", currency: "HUF" },
  { code: "IS", name: "Iceland", currency: "ISK" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "XK", name: "Kosovo", currency: "EUR" },
  { code: "LV", name: "Latvia", currency: "EUR" },
  { code: "LI", name: "Liechtenstein", currency: "CHF" },
  { code: "LT", name: "Lithuania", currency: "EUR" },
  { code: "LU", name: "Luxembourg", currency: "EUR" },
  { code: "MT", name: "Malta", currency: "EUR" },
  { code: "MD", name: "Moldova", currency: "MDL" },
  { code: "MC", name: "Monaco", currency: "EUR" },
  { code: "ME", name: "Montenegro", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "MK", name: "North Macedonia", currency: "MKD" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "PT", name: "Portugal", currency: "EUR" },
  { code: "RO", name: "Romania", currency: "RON" },
  { code: "RU", name: "Russia", currency: "RUB" },
  { code: "SM", name: "San Marino", currency: "EUR" },
  { code: "RS", name: "Serbia", currency: "RSD" },
  { code: "SK", name: "Slovakia", currency: "EUR" },
  { code: "SI", name: "Slovenia", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "UA", name: "Ukraine", currency: "UAH" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
];

export function getCountryName(code: string): string {
  return ANCHOR_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

// The single source of truth for "what currency does this country's listings use" -- both listing
// forms and the create/update server actions call this rather than accepting currency as a
// separately submitted field. Falls back to EUR (rather than throwing) for a country code that
// somehow isn't in the list, matching formatPrice/convertMinorUnits' existing "degrade gracefully,
// never crash on a display-only concern" pattern elsewhere in lib/money.ts.
export function getCurrencyForCountry(code: string): CurrencyCode {
  return ANCHOR_COUNTRIES.find((c) => c.code === code)?.currency ?? "EUR";
}
