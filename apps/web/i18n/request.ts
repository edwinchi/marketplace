import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const SUPPORTED_LOCALES = ["en", "fr", "pt", "ar", "sw"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "afrodeals_locale";

// Cookie-based locale, deliberately not URL-prefixed (no [locale] segment) — this app already has
// ~100 real routes under app/, and moving every one of them under app/[locale]/ would be a huge,
// risky restructuring for what a cookie handles just as well. See agents.md notes on this tradeoff.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = SUPPORTED_LOCALES.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
