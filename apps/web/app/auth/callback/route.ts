import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// Supabase redirects here after email confirmation / magic-link / OAuth / password-reset clicks,
// with a `code` param to exchange for a session. `next` overrides where a successful exchange
// lands — password reset uses it to land on /reset-password instead of home.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // NOT `new URL(request.url).origin` — behind Plesk's reverse proxy that resolves to the
  // Node process's own internal bind address (confirmed live: redirected to https://0.0.0.0:3000,
  // unreachable from any real browser). This is the same class of bug documented for
  // signup/forgot-password/Google sign-in — see docs/email-auth-troubleshooting.md.
  const origin = await getSiteOrigin();
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Only a same-site relative path is honored — see the identical check in login/page.tsx.
  // `next` here can come from Google's OAuth redirect as well as email links, so treating it as
  // a trusted redirect target without this check would be an open-redirect hole.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // Logged, not discarded -- this route previously gave no way to tell "expired code" apart
    // from "PKCE code_verifier cookie missing" apart from "wrong project config" apart from
    // anything else; a user-reported "password reset doesn't work" was otherwise undiagnosable
    // without this. Same reasoning as the Stripe Connect error logging earlier in this project.
    console.error(`exchangeCodeForSession failed (next=${next}):`, error.message, error.status);
  } else {
    console.error(`auth/callback called with no code param (next=${next}), full url:`, request.url);
  }

  // Missing/expired/already-used code, or the exchange itself failed — surface that on /login
  // instead of silently bouncing there indistinguishably from a cold visit to the page.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
