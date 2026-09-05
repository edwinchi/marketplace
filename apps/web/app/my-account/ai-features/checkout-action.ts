"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe, SELLER_PRO_PRICE_ID, AI_TOPUP_PRICE_ID } from "@/lib/stripe";

async function startCheckout(mode: "subscription" | "payment", priceId: string | undefined) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe || !priceId) redirect("/my-account/ai-features?error=not_configured");

  const supabase = await createClient();
  const origin = await getSiteOrigin();

  // Reuse the existing Stripe customer if this profile already has one (e.g. from an earlier
  // top-up before ever subscribing) -- avoids creating duplicate customers per profile.
  // getCurrentUserAndProfile()'s select doesn't include this column (it's used broadly and stays
  // narrow on purpose), so it's fetched separately here rather than widened everywhere.
  const { data: stripeRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = stripeRow?.stripe_customer_id ?? undefined;
  // A stored id only actually resolves under the same mode (test/live) it was created in -- a
  // customer created while testing with a test key 404s here the first time this runs for real
  // against a live key (confirmed live: "a similar object exists in test mode, but a live mode
  // key was used"), and that was an uncaught crash before this check existed. Treat that exactly
  // like "no customer yet" rather than failing the whole checkout.
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = undefined;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { profile_id: profile.id } });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/my-account/ai-features?checkout=success`,
    cancel_url: `${origin}/my-account/ai-features?checkout=canceled`,
    metadata: { profile_id: profile.id },
  });

  if (!session.url) redirect("/my-account/ai-features?error=checkout_failed");
  redirect(session.url);
}

export async function startSellerProCheckout() {
  await startCheckout("subscription", SELLER_PRO_PRICE_ID);
}

export async function startTopUpCheckout() {
  await startCheckout("payment", AI_TOPUP_PRICE_ID);
}

// Stripe's own hosted page for managing/canceling a subscription and updating payment method --
// no custom UI needed for any of that.
export async function openBillingPortal() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect("/my-account/ai-features?error=not_configured");

  const supabase = await createClient();
  const { data: stripeRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  if (!stripeRow?.stripe_customer_id) redirect("/my-account/ai-features");

  const origin = await getSiteOrigin();
  let portalUrl: string;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeRow.stripe_customer_id,
      return_url: `${origin}/my-account/ai-features`,
    });
    portalUrl = session.url;
  } catch {
    // Same test/live-mode mismatch this file's other function guards against, but there's no
    // sensible "create a fresh customer" fallback for managing a subscription that, under this
    // mode, doesn't exist -- an honest bounce beats a crash.
    redirect("/my-account/ai-features?error=not_configured");
  }
  redirect(portalUrl);
}
