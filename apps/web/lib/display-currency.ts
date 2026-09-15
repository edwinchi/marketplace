import { cookies, headers } from "next/headers";
import { DISPLAY_CURRENCY_COOKIE, SUPPORTED_CURRENCIES, type CurrencyCode } from "./money";
import { getCurrencyForCountry } from "./countries";

// Split out from lib/countries.ts (which is imported by client components too, e.g.
// new-listing-step2-form.tsx) -- next/headers can only be imported by Server Components, so
// pulling it into countries.ts broke the build for every client component that imports anything
// from that file. This module is server-only and must never be imported from a "use client" file.
//
// The visitor's explicit choice (the display-currency switcher in the header, persisted as
// DISPLAY_CURRENCY_COOKIE) always wins once it's been set. Before that, rather than showing every
// listing in whatever currency its own seller happened to list it in, default to the currency of
// the visitor's own country -- detected from Vercel's edge geo header, the same signal
// i18n/request.ts's detectLocale() uses for language, no extra lookup needed. Returns null only
// when there's truly no signal to go on (no cookie, no geo header, e.g. local dev), in which case
// every caller's existing "null means show native price, no conversion" fallback still applies.
export async function getDisplayCurrency(): Promise<CurrencyCode | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value;
  if (cookieValue && (SUPPORTED_CURRENCIES as readonly string[]).includes(cookieValue)) return cookieValue as CurrencyCode;

  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country");
  return country ? getCurrencyForCountry(country.toUpperCase()) : null;
}
