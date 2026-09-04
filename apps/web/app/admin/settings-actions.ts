"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { setRequireLoginSetting } from "@/lib/app-settings";
import { setLocaleEnabled } from "@/lib/language-settings";
import { setNumericSetting } from "@/lib/numeric-settings";

export async function updateRequireLoginSetting(value: boolean) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  await setRequireLoginSetting(value);
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
