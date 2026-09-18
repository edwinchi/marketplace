"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getStripe, BUSINESS_PRICE_ID } from "@/lib/stripe";

// Same customer-reuse + test/live-mode guard as startSellerProCheckout/startTopUpCheckout
// (app/my-account/ai-features/checkout-action.ts) -- duplicated rather than shared because it's
// three lines of setup around one different price ID and success/cancel URL, not worth a shared
// helper for. Managing/canceling this subscription reuses that file's openBillingPortal directly
// (Stripe's customer portal already lists every subscription on the account together, Business and
// Seller Pro alike -- no reason for a second portal entry point).
export async function startBusinessCheckout() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const stripe = getStripe();
  if (!stripe || !BUSINESS_PRICE_ID) redirect("/my-account/business?error=not_configured");

  const supabase = await createClient();
  const { data: stripeRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  let customerId = stripeRow?.stripe_customer_id ?? undefined;
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
    mode: "subscription",
    line_items: [{ price: BUSINESS_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/my-account/business?checkout=success`,
    cancel_url: `${origin}/my-account/business?checkout=canceled`,
    metadata: { profile_id: profile.id },
  });

  if (!session.url) redirect("/my-account/business?error=checkout_failed");
  redirect(session.url);
}
