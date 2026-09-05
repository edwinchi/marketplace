"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { setRequireLoginSetting, setListenFreeAccessSetting } from "@/lib/app-settings";
import { setLocaleEnabled } from "@/lib/language-settings";
import { setNumericSetting } from "@/lib/numeric-settings";

export async function updateRequireLoginSetting(value: boolean) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  await setRequireLoginSetting(value);
  revalidatePath("/admin");
}

export async function updateListenFreeAccessSetting(value: boolean) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  await setListenFreeAccessSetting(value);
  // getCanListen() reads this fresh on every request (no caching layer of its own), so it takes
  // effect for the very next page load site-wide -- /admin is the only route rendering the value.
  revalidatePath("/admin");
}

export async function updateLocaleEnabled(locale: string, enabled: boolean) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  await setLocaleEnabled(locale, enabled);
  // Every page reads the language switcher's options via Nav (and the active-locale fallback via
  // i18n/request.ts) on every request already, so nothing else needs revalidating for this to
  // take effect immediately for the next request.
  revalidatePath("/admin");
}

// count is server-validated too, not just clamped client-side in the input -- a directly-called
// Server Action bypasses whatever a browser's <input min max> would otherwise enforce.
export async function updateCategoryGroupCollapsedLimit(count: number) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("Enter a whole number between 1 and 50.");

  await setNumericSetting("category_group_collapsed_limit", count);
  // Every category page reads this straight from numeric_settings on each request (not through
  // any cached category-data path), so it takes effect for the very next page load site-wide --
  // /admin is the only route actually rendering this value itself.
  revalidatePath("/admin");
}

// All three re-validated server-side, not just clamped by the inputs' own min/step -- a directly-
// called Server Action bypasses those. min <= max is the one cross-field rule worth enforcing here
// (a max below min would silently mean "always charge the max", clamped wrong).
export async function updateBuyerFeeSettings(percentX100: number, minCents: number, maxCents: number) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");
  if (!Number.isInteger(percentX100) || percentX100 < 0 || percentX100 > 10000) throw new Error("Percent must be between 0 and 100.");
  if (!Number.isInteger(minCents) || minCents < 0) throw new Error("Minimum must be a positive amount.");
  if (!Number.isInteger(maxCents) || maxCents < minCents) throw new Error("Maximum must be at least the minimum.");

  await Promise.all([
    setNumericSetting("buyer_fee_percent_x100", percentX100),
    setNumericSetting("buyer_fee_min_cents", minCents),
    setNumericSetting("buyer_fee_max_cents", maxCents),
  ]);
  // Every Direct Buy button computes its fee fresh via calculateBuyerFeeMinor on each listing page
  // load, so this takes effect immediately site-wide -- /admin is the only route rendering the
  // value itself.
  revalidatePath("/admin");
}
