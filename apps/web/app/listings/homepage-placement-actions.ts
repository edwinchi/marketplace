"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe, EUR_CHECKOUT_PAYMENT_METHOD_TYPES } from "@/lib/stripe";
import { getNumericSetting } from "@/lib/numeric-settings";
import { slugPath } from "@/lib/slug";

export const HOMEPAGE_PLACEMENT_DAYS = 3;

// Platform-charged fee, not a Direct Buy-style transfer -- same shape as bumpListingCheckout (no
// transfer_data/application_fee, doesn't depend on Connect onboarding). The actual state change
// (homepage_featured_until, see supabase/migrations/20260101008300_homepage_placement.sql) only
// happens in the webhook after payment succeeds, via the service-role-only extend_homepage_placement
// RPC -- this action just validates eligibility up front.
export async function homepagePlacementCheckout(listingId: string) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect(`/listings/x-${listingId}?error=payments_not_configured`);

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, seller_id, status")
    .eq("id", listingId)
    .single();
  if (!listing) redirect(`/listings/x-${listingId}`);
  if (listing.seller_id !== profile.id) redirect(`/listings/x-${listingId}`);
  if (listing.status !== "active") redirect(`/listings/x-${listingId}?error=listing_unavailable`);

  const listingPath = `/listings/${slugPath(listing.title, listing.id)}`;
  const priceCents = await getNumericSetting("homepage_placement_price_cents");

  const { data: buyerRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = buyerRow?.stripe_customer_id ?? undefined;
  // Same test/live-mode mismatch guard as the other checkout actions.
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
    payment_method_types: EUR_CHECKOUT_PAYMENT_METHOD_TYPES,
    line_items: [
      {
        price_data: {
          // Flat platform fee, always EUR -- same reasoning as ad_bump_price_cents.
          currency: "eur",
          unit_amount: priceCents,
          product_data: { name: `Homepage placement (${HOMEPAGE_PLACEMENT_DAYS} days): ${listing.title}` },
        },
        quantity: 1,
      },
    ],
    ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
    success_url: `${origin}${listingPath}?homepage_placement=success`,
    cancel_url: `${origin}${listingPath}?homepage_placement=canceled`,
    metadata: { type: "homepage_placement", listing_id: listing.id },
  });

  if (!session.url) redirect(`${listingPath}?error=checkout_failed`);
  redirect(session.url);
}
