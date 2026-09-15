import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { getDisabledLocales } from "@/lib/language-settings";

export const SUPPORTED_LOCALES = ["en", "fr", "ar", "zh", "nl"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "afrodeals_locale";

// Countries where a supported non-English language is the practical majority/official language --
// used as a fallback signal only when the browser's own Accept-Language header doesn't clearly
// name one of our supported locales (see detectLocale below). Deliberately short and conservative:
// this only needs to catch the common, unambiguous cases, not attempt a full country->language map.
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  FR: "fr",
  BE: "fr",
  NL: "nl",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  MO: "zh",
  SG: "zh",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  MA: "ar",
  DZ: "ar",
  TN: "ar",
  IQ: "ar",
  JO: "ar",
  KW: "ar",
  QA: "ar",
  BH: "ar",
  OM: "ar",
  LB: "ar",
  LY: "ar",
  SD: "ar",
  YE: "ar",
  SY: "ar",
  PS: "ar",
};

// Parses an Accept-Language header ("fr-FR,fr;q=0.9,en;q=0.8") in the browser's own stated
// preference order and returns the first tag whose base language (before any "-REGION" suffix)
// matches one of our supported locales.
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      return { base: tag.trim().toLowerCase().split("-")[0], q: qPart ? parseFloat(qPart) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { base } of tags) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return null;
}

// First-visit-only (no cookie yet) language detection: the browser's own language setting is the
// most direct signal of what someone actually wants to read, so it's tried first; the visitor's
// country (from Vercel's edge geo header, no external lookup needed) is a fallback for the case
// where Accept-Language is missing or names an unsupported language. Once a visitor has an actual
// preference — either detected here or picked from the language switcher — subsequent requests
// just read the cookie (see below) and never re-run this.
async function detectLocale(): Promise<Locale> {
  const headersList = await headers();
  const fromDevice = localeFromAcceptLanguage(headersList.get("accept-language"));
  if (fromDevice) return fromDevice;
  const country = headersList.get("x-vercel-ip-country");
  const fromLocation = country ? COUNTRY_TO_LOCALE[country.toUpperCase()] : undefined;
  return fromLocation ?? DEFAULT_LOCALE;
}
// Matches the languages table's own direction column (see supabase/migrations/20260101000000_core.sql)
// -- kept here rather than queried per-request since SUPPORTED_LOCALES itself is already a fixed,
// compile-time list for this cookie-based (non-URL-prefixed) locale system.
const RTL_LOCALES: ReadonlySet<string> = new Set(["ar"]);
export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

// Cookie-based locale, deliberately not URL-prefixed (no [locale] segment) — this app already has
// ~100 real routes under app/, and moving every one of them under app/[locale]/ would be a huge,
// risky restructuring for what a cookie handles just as well. See agents.md notes on this tradeoff.
export default getRequestConfig(async () => {
  const [cookieStore, disabledLocales] = await Promise.all([cookies(), getDisabledLocales()]);
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale) && !disabledLocales.has(cookieLocale)) {
    locale = cookieLocale as Locale;
  } else {
    // No saved preference yet (first visit, or the language switcher was never used) -- detect
    // from the browser/location instead of silently defaulting to English.
    const detected = await detectLocale();
    // A locale an admin has since disabled (see language_settings) falls back the same way an
    // unsupported one always has -- a visitor who picked/was detected into it before it was
    // turned off shouldn't get stuck seeing it; they just silently see English again, no error.
    locale = disabledLocales.has(detected) ? DEFAULT_LOCALE : detected;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
