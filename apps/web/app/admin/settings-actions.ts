"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { setRequireLoginSetting } from "@/lib/app-settings";
import { setLocaleEnabled } from "@/lib/language-settings";

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
