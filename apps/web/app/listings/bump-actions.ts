"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe, EUR_CHECKOUT_PAYMENT_METHOD_TYPES } from "@/lib/stripe";
import { getNumericSetting } from "@/lib/numeric-settings";
import { slugPath } from "@/lib/slug";
import { BUMP_COOLDOWN_MS } from "@/lib/listing-bump";

// Platform-charged fee, not a Direct Buy-style transfer -- no transfer_data/application_fee here,
// so this doesn't depend on the seller having completed Stripe Connect onboarding the way Direct
// Buy does. The actual state change (published_at = now(), see supabase/migrations/20260101007500_
// listing_bump.sql) only happens in the webhook after payment succeeds, via the service-role-only
// bump_listing RPC -- this action just validates eligibility up front so a seller isn't charged for
// a bump that's obviously going to be rejected (still-cooling-down, not active, not theirs).
export async function bumpListingCheckout(listingId: string) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect(`/listings/x-${listingId}?error=payments_not_configured`);

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, seller_id, status, published_at, currency_code")
    .eq("id", listingId)
    .single();
  if (!listing) redirect(`/listings/x-${listingId}`);
  if (listing.seller_id !== profile.id) redirect(`/listings/x-${listingId}`);
  if (listing.status !== "active") redirect(`/listings/x-${listingId}?error=listing_unavailable`);

  const listingPath = `/listings/${slugPath(listing.title, listing.id)}`;
  if (listing.published_at && Date.now() - new Date(listing.published_at).getTime() < BUMP_COOLDOWN_MS) {
    redirect(`${listingPath}?error=bump_cooldown`);
  }

  const priceCents = await getNumericSetting("ad_bump_price_cents");

  const { data: buyerRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = buyerRow?.stripe_customer_id ?? undefined;
  // Same test/live-mode mismatch guard as startOrderPayment/startCheckout.
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

  const origin = await getSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    // See lib/stripe.ts's EUR_CHECKOUT_PAYMENT_METHOD_TYPES -- required for iDEAL and several
    // other EU methods to actually show on a small flat fee like this one; Stripe's default
    // dynamic mode was silently excluding them.
    payment_method_types: EUR_CHECKOUT_PAYMENT_METHOD_TYPES,
    line_items: [
      {
        price_data: {
          // Flat platform fee, not proportional to the listing's own price -- always charged in
          // EUR regardless of what currency the seller priced the item in. Charging it in
          // listing.currency_code instead was a real bug: ad_bump_price_cents is EUR cents, but
          // e.g. NGN's minor unit (kobo) made the same integer convert to a fraction of a euro
          // cent, tripping Stripe's 50-cent-equivalent minimum-charge check.
          currency: "eur",
          unit_amount: priceCents,
          product_data: { name: `Bump listing: ${listing.title}` },
        },
        quantity: 1,
      },
    ],
    // See payment-actions.ts's identical line for why -- confirmed live, not a guess.
    ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
    success_url: `${origin}${listingPath}?bump=success`,
    cancel_url: `${origin}${listingPath}?bump=canceled`,
    metadata: { type: "listing_bump", listing_id: listing.id },
  });

  if (!session.url) redirect(`${listingPath}?error=checkout_failed`);
  redirect(session.url);
}
