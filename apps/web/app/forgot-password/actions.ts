"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIpFromHeaders, emailBucket } from "@/lib/rate-limit";
import { getSiteOrigin } from "@/lib/site-url";

export type ForgotPasswordState = { sent: boolean; error: string | null };

export async function requestPasswordReset(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");
  const origin = await getSiteOrigin();

  // Every request sends an email, and the project has one shared email quota: unlimited requests
  // could spam a victim's inbox and use up the quota, so real verification and reset emails stop
  // (risk R9). Per IP: 5 / hour; per address: 3 / hour. The message doesn't depend on whether the
  // address has an account.
  const ip = clientIpFromHeaders(await headers());
  const emailKey = email.trim() ? emailBucket(email) : "";
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`reset-ip:${ip}`, 5, 3600),
    emailKey ? checkRateLimit(`reset-email:${emailKey}`, 3, 3600) : Promise.resolve(true),
  ]);
  if (!ipOk || !emailOk) return { sent: false, error: "Too many reset requests. Try again in an hour." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success regardless of whether the email exists — don't let this endpoint be
  // used to check which addresses have accounts.
  if (error) console.error("resetPasswordForEmail failed:", error.message);
  return { sent: true, error: null };
}
