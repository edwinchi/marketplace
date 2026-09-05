"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe";

// Express, not Standard or Custom -- Stripe's own quick hosted onboarding (ID, bank details)
// rather than a full Stripe dashboard, matching a casual buy/sell marketplace where most sellers
// aren't running a registered business. Neither AfroDeals nor its database ever sees the bank
// details themselves -- Stripe collects them directly and just hands back an account id.
export async function startConnectOnboarding() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect("/my-account/payments/enable?error=not_configured");

  const supabase = await createClient();
  const { data: row } = await supabase.from("profiles").select("stripe_connect_account_id").eq("id", profile.id).single();
  let accountId = row?.stripe_connect_account_id ?? undefined;

  // Both Stripe calls below throw if Connect hasn't been activated on this account yet (Settings
  // -> Connect in the Stripe Dashboard) -- a real, one-time setup step Stripe requires a human to
  // click through, not something the API can do on our behalf (confirmed live: accounts.create
  // fails with "You can only create new accounts if you've signed up for Connect" until then).
  // Left uncaught, that crashed to the generic error boundary instead of degrading honestly.
  let accountLinkUrl: string;
  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        metadata: { profile_id: profile.id },
      });
      accountId = account.id;
      await supabase.from("profiles").update({ stripe_connect_account_id: accountId }).eq("id", profile.id);
    }

    const origin = await getSiteOrigin();
    // refresh_url is hit if the onboarding link itself expires or the seller navigates back --
    // sending them right back through startConnectOnboarding generates a fresh link rather than
    // dead-ending on an expired one.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/my-account/payments/enable`,
      return_url: `${origin}/my-account/payments/enable?onboarding=return`,
      type: "account_onboarding",
    });
    accountLinkUrl = accountLink.url;
  } catch {
    redirect("/my-account/payments/enable?error=connect_not_ready");
  }

  redirect(accountLinkUrl);
}

// Stripe's own hosted dashboard for a connected Express account -- lets a seller see their payout
// history and update their bank details without AfroDeals building any of that itself.
export async function openConnectDashboard() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect("/my-account/payments/enable?error=not_configured");

  const supabase = await createClient();
  const { data: row } = await supabase.from("profiles").select("stripe_connect_account_id").eq("id", profile.id).single();
  if (!row?.stripe_connect_account_id) redirect("/my-account/payments/enable");

  let loginUrl: string;
  try {
    const loginLink = await stripe.accounts.createLoginLink(row.stripe_connect_account_id);
    loginUrl = loginLink.url;
  } catch {
    redirect("/my-account/payments/enable?error=connect_not_ready");
  }
  redirect(loginUrl);
}
