export const ANCHOR_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "CM", name: "Cameroon" },
];

export function getCountryName(code: string): string {
  return ANCHOR_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
