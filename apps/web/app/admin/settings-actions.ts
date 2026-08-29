"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { setRequireLoginSetting } from "@/lib/app-settings";

export async function updateRequireLoginSetting(value: boolean) {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  await setRequireLoginSetting(value);
  revalidatePath("/admin");
}
