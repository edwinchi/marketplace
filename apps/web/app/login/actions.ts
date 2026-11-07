"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIpFromHeaders, emailBucket } from "@/lib/rate-limit";
import { safeRelativePath } from "@/lib/safe-path";

export type AuthFormState = { error: string | null };

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Login runs on our servers, so Supabase's own per-IP limit sees Vercel's address, not the
  // visitor's: without these, password guessing and credential stuffing were unlimited (risk R9).
  // Per IP: 20 tries / 15 min (a shared office or mobile network has room). Per account: 10 / 15 min,
  // the brute-force cap for one email from many IPs. The same message for both, and for any email,
  // so it reveals nothing about which accounts exist.
  const ip = clientIpFromHeaders(await headers());
  const emailKey = email.trim() ? emailBucket(email) : "";
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`login-ip:${ip}`, 20, 900),
    emailKey ? checkRateLimit(`login-email:${emailKey}`, 10, 900) : Promise.resolve(true),
  ]);
  if (!ipOk || !emailOk) return { error: "Too many sign-in attempts. Wait 15 minutes and try again, or reset your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const next = String(formData.get("next") || "/");
  redirect(safeRelativePath(next));
}
