"use server";

import { cookies } from "next/headers";
import { SUPPORTED_CURRENCIES, DISPLAY_CURRENCY_COOKIE } from "@/lib/money";

export async function setDisplayCurrency(currency: string) {
  const cookieStore = await cookies();
  if (currency === "native") {
    cookieStore.delete(DISPLAY_CURRENCY_COOKIE);
    return;
  }
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) return;
  cookieStore.set(DISPLAY_CURRENCY_COOKIE, currency, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
