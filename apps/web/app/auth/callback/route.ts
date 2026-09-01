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
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
