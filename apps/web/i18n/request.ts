import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getDisabledLocales } from "@/lib/language-settings";

export const SUPPORTED_LOCALES = ["en", "fr", "ar", "zh"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "afrodeals_locale";

// Cookie-based locale, deliberately not URL-prefixed (no [locale] segment) — this app already has
// ~100 real routes under app/, and moving every one of them under app/[locale]/ would be a huge,
// risky restructuring for what a cookie handles just as well. See agents.md notes on this tradeoff.
export default getRequestConfig(async () => {
  const [cookieStore, disabledLocales] = await Promise.all([cookies(), getDisabledLocales()]);
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  // A locale an admin has since disabled (see language_settings) falls back the same way an
  // unsupported one always has -- a visitor who picked it before it was turned off shouldn't get
  // stuck seeing it; they just silently see English again, no error.
  const locale: Locale =
    SUPPORTED_LOCALES.includes(cookieLocale as Locale) && !disabledLocales.has(cookieLocale as string) ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
