// A curated shortlist, not an auto-generated list from whatever sellers happen to type into the
// free-text locations.city column -- real listing data already has exactly the problem you'd
// expect from that ("Yauonde" as a genuine typo for "Yaoundé", sitting alongside a separate
// "Douala" and "Bamenda"), so generating a page per distinct string would produce broken/duplicate
// pages rather than real SEO value. These five are the markets the launch campaign is actually
// targeting (see the "First Ad Free Campaign" plan) -- add to this list deliberately as real
// activity grows in a new city, not automatically.
export const TARGET_CITIES = [
  { slug: "douala", name: "Douala", countryCode: "CM" },
  { slug: "yaounde", name: "Yaoundé", countryCode: "CM" },
  { slug: "lagos", name: "Lagos", countryCode: "NG" },
  { slug: "amsterdam", name: "Amsterdam", countryCode: "NL" },
  { slug: "zwolle", name: "Zwolle", countryCode: "NL" },
] as const;

export function getTargetCity(slug: string) {
  return TARGET_CITIES.find((c) => c.slug === slug) ?? null;
}
