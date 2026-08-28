"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { sent: boolean; error: string | null };

export async function requestPasswordReset(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "");
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success regardless of whether the email exists — don't let this endpoint be
  // used to check which addresses have accounts.
  if (error) console.error("resetPasswordForEmail failed:", error.message);
  return { sent: true, error: null };
}
