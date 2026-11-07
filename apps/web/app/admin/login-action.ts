"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { checkRateLimit, clientIpFromHeaders, emailBucket } from "@/lib/rate-limit";
import { recordAdminAction } from "@/lib/audit";

export type AdminAuthFormState = { error: string | null };

// Single generic error for both "wrong password" and "correct password, not the admin
// account" -- a non-admin visitor shouldn't be able to tell which case they hit.
const GENERIC_ERROR = "Invalid email or password.";

export async function adminLogin(
  _prevState: AdminAuthFormState,
  formData: FormData
): Promise<AdminAuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Same buckets as the normal login (app/login/actions.ts): one combined allowance per IP and
  // per account, so switching between the two forms doesn't double an attacker's attempts.
  const ip = clientIpFromHeaders(await headers());
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`login-ip:${ip}`, 20, 900),
    email.trim() ? checkRateLimit(`login-email:${emailBucket(email)}`, 10, 900) : Promise.resolve(true),
  ]);
  if (!ipOk || !emailOk) return { error: "Too many sign-in attempts. Wait 15 minutes and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: GENERIC_ERROR };

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  const { data: adminProfile } = await supabase.from("profiles").select("id").eq("auth_user_id", data.user!.id).maybeSingle();
  await recordAdminAction({ actorProfileId: adminProfile?.id ?? null, action: "admin.sign_in", entityType: "session" });
  redirect("/admin");
}
