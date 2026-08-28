"use server";

import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/request";

export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
