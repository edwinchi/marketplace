"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isPasswordValid } from "@/lib/password-rules";
import { getSiteOrigin } from "@/lib/site-url";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export type SignupFormState = { error: string | null; checkEmail: boolean };

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
  return base || "user";
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

export async function signup(_prevState: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) return { error: "Please enter your name.", checkEmail: false };
  if (!isPasswordValid(password)) return { error: "Password doesn't meet the requirements below.", checkEmail: false };
  if (password !== passwordConfirm) return { error: "Passwords don't match.", checkEmail: false };

  const ip = clientIpFromHeaders(await headers());
  const allowed = await checkRateLimit(`signup:${ip}`, 5, 3600);
  if (!allowed) return { error: "Too many signup attempts from this connection — try again in a bit.", checkEmail: false };

  const supabase = await createClient();
  const baseUsername = slugify(displayName);
  const origin = await getSiteOrigin();

  // Auto-derived from the name (the form only asks for one, matching the reference design) — on
  // a collision, the handle_new_user() trigger's unique-username constraint aborts the whole
  // auth.users insert (surfaced as a generic error), so retry with a random suffix appended.
  for (let attempt = 0; attempt < 3; attempt++) {
    const username = attempt === 0 ? baseUsername : `${baseUsername}${randomSuffix()}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName }, emailRedirectTo: `${origin}/auth/callback` },
    });

    if (!error) {
      if (data.session) {
        const next = String(formData.get("next") || "/");
        redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
      }
      return { error: null, checkEmail: true };
    }
    if (!error.message.includes("Database error saving new user")) {
      return { error: error.message, checkEmail: false };
    }
    // else: likely a username collision — loop and retry with a suffix.
  }

  return { error: "Could not create your account. Please try again.", checkEmail: false };
}
