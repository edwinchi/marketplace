import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// The device-independent companion to /auth/callback's `?code=` PKCE exchange. PKCE requires the
// SAME browser that started the flow (resetPasswordForEmail, signUp, etc.) to also complete it --
// exchangeCodeForSession needs a code_verifier the initiating browser stored in its own cookie jar.
// That's fine for something like OAuth, which is one continuous flow in one browser, but password
// recovery is routinely cross-device in real life: request the reset on a laptop, open the email
// and tap the link on a phone. Confirmed live: a real reset link, clicked in a fresh browser
// context from the one that requested it, landed on /login?error=auth_callback_failed every time;
// the identical link clicked in the SAME context that requested it worked. verifyOtp with a
// token_hash validates directly against Supabase's server -- no locally-stored secret needed on
// either end, so it works regardless of which browser or device opens the link.
//
// This route only starts receiving real traffic once the Supabase "Reset Password" email template
// is updated to link here with `token_hash`/`type` instead of the default `{{ .ConfirmationURL }}`
// -- see the instructions handed to the project owner alongside this change.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = await getSiteOrigin();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error(`verifyOtp failed (type=${type}, next=${next}):`, error.message, error.status);
  } else {
    console.error(`auth/confirm called without token_hash/type (next=${next}), full url:`, request.url);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
