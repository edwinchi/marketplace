"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe";
import { calculateBuyerFeeMinor } from "@/lib/payments";
import { slugPath } from "@/lib/slug";

// Direct Buy -- a protected, in-platform payment (the buyer-fee-funded escrow model from
// supabase/migrations/20260101005100_stripe_connect.sql), not a generic wallet transfer between
// any two users. Amounts are computed here from the listing's own stored price, never trusted from
// the client -- a form field carrying a price would let a buyer pay whatever they typed.
//
// Uses the service-role client, not the request-scoped one: there's no RLS insert policy for
// orders/payments (by design -- the amounts have to come from server-side computation, not a
// client-writable row), so this is the one place allowed to create them, after checking the
// request is a genuinely signed-in buyer itself.
export async function startOrderPayment(listingId: string) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe) redirect(`/listings/x-${listingId}?error=payments_not_configured`);

  const supabase = createServiceClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, price_minor, currency_code, seller_id, status")
    .eq("id", listingId)
    .single();
  if (!listing || listing.status !== "active") redirect(`/listings/x-${listingId}?error=listing_unavailable`);
  if (listing.seller_id === profile.id) redirect(`/listings/x-${listingId}`);

  const { data: seller } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", listing.seller_id)
    .single();
  if (!seller?.stripe_connect_account_id || !seller.stripe_connect_charges_enabled) {
    redirect(`/listings/x-${listingId}?error=seller_not_ready`);
  }

  const itemPriceMinor = listing.price_minor ?? 0;
  const feeMinor = await calculateBuyerFeeMinor(itemPriceMinor);
  const totalMinor = itemPriceMinor + feeMinor;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      listing_id: listing.id,
      buyer_id: profile.id,
      seller_id: listing.seller_id,
      subtotal_minor: itemPriceMinor,
      shipping_minor: 0,
      platform_fee_minor: feeMinor,
      total_minor: totalMinor,
      currency_code: listing.currency_code,
      status: "pending_payment",
    })
    .select("id")
    .single();
  if (orderError || !order) redirect(`/listings/x-${listingId}?error=order_failed`);

  const { data: buyerRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = buyerRow?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { profile_id: profile.id } });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }

  const origin = await getSiteOrigin();
  const listingPath = `/listings/${slugPath(listing.title, listing.id)}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: listing.currency_code.toLowerCase(),
          unit_amount: totalMinor,
          product_data: { name: listing.title },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeMinor,
      transfer_data: { destination: seller.stripe_connect_account_id },
    },
    success_url: `${origin}${listingPath}?order=success`,
    cancel_url: `${origin}${listingPath}?order=canceled`,
    metadata: { type: "order_payment", order_id: order.id },
  });

  if (!session.url) redirect(`${listingPath}?error=checkout_failed`);
  redirect(session.url);
}
