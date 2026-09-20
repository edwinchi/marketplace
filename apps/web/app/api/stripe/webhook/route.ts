import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, AI_TOPUP_USES, SELLER_PRO_PRICE_ID, BUSINESS_PRICE_ID } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Two independent subscription products share this one webhook endpoint -- disambiguated by the
// subscription's own price id (checkout.session.completed's metadata.profile_id tells us WHO, not
// WHICH plan; customer.subscription.updated/deleted carry no metadata at all). Returns null for a
// subscription on neither known price (shouldn't happen outside test-mode noise) rather than
// guessing. A discriminated result (not a computed column-name pair) so each call site builds a
// properly-typed update object instead of an untyped `{ [key]: value }`.
function subscriptionPlanFor(subscription: Stripe.Subscription): "business" | "seller_pro" | null {
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId && priceId === BUSINESS_PRICE_ID) return "business";
  if (priceId && priceId === SELLER_PRO_PRICE_ID) return "seller_pro";
  return null;
}

function subscriptionUpdateFor(plan: "business" | "seller_pro", status: string, periodEnd: string | null) {
  return plan === "business"
    ? { business_subscription_status: status, business_subscription_current_period_end: periodEnd }
    : { ai_subscription_status: status, ai_subscription_current_period_end: periodEnd };
}

// Service-role client, not the cookie-based one -- there's no logged-in request here, Stripe is
// calling this server-to-server, authenticated only by the webhook signature below.
export async function POST(request: Request) {
  const stripe = getStripe();
  // Two separate Stripe webhook endpoints point at this same URL, each with its own signing
  // secret: a regular one for platform-account events (checkout/subscriptions) and a Connect one
  // (created with `connect: true`) for connected-account events (account.updated, fired when a
  // seller's own Express account status changes) -- Stripe doesn't let one endpoint subscribe to
  // both categories with a single secret. Try the platform secret first since it's the common case.
  const webhookSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((s): s is string => !!s);
  if (!stripe || webhookSecrets.length === 0) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Signature verification needs the exact raw body bytes -- request.text() here, never
  // request.json(), which would re-serialize and invalidate the signature.
  const rawBody = await request.text();
  let event: Stripe.Event | null = null;
  let lastError: unknown;
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!event) {
    return NextResponse.json({ error: `Invalid signature: ${lastError instanceof Error ? lastError.message : "unknown"}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency guard: Stripe retries webhook delivery on timeouts/network errors, so the same
  // event.id can arrive more than once. Recording it here first and bailing on a conflict is
  // Stripe's own recommended pattern -- without it, a redelivered checkout.session.completed
  // would double-credit ai_bonus_uses on every retry.
  const { error: dedupeError } = await supabase.from("stripe_webhook_events").insert({ id: event.id });
  if (dedupeError) {
    // 23505 = unique_violation -- already processed, nothing to do. Any other error means the
    // dedupe check itself failed (e.g. DB unreachable) -- still return 200 so Stripe doesn't spin
    // retrying forever on an infrastructure problem this event's contents can't fix.
    return NextResponse.json({ received: true, duplicate: dedupeError.code === "23505" });
  }

  try {
    await handleEvent(event, stripe, supabase);
  } catch (err) {
    // Roll back the dedupe row we just committed above -- without this, a transient failure part-way
    // through processing (a Supabase call erroring, an unexpected Stripe object shape) would throw
    // here, Stripe would retry delivery, and the retry's dedupe check would find event.id already
    // present and silently no-op forever, permanently dropping a real credit/status update with no
    // error visible anywhere.
    await supabase.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error(`Webhook processing failed for event ${event.id} (${event.type}):`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event, stripe: Stripe, supabase: ReturnType<typeof createServiceClient>) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Direct Buy order payment -- distinguished by metadata.type rather than by mode alone,
      // since it shares mode: "payment" with the AI top-up below. Stripe Connect already paid the
      // seller directly as part of this same charge (transfer_data.destination in
      // app/listings/payment-actions.ts) -- no fund hold exists (Terms of Service §6, and see
      // supabase/migrations/20260101006900's own comment). This just marks the order paid.
      if (session.metadata?.type === "order_payment" && session.metadata?.order_id) {
        const orderId = session.metadata.order_id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
        await supabase.from("payments").insert({
          order_id: orderId,
          provider: "stripe",
          provider_payment_id: paymentIntentId ?? session.id,
          amount_minor: session.amount_total ?? 0,
          currency_code: (session.currency ?? "eur").toUpperCase(),
          status: "succeeded",
          payment_method: "card",
          paid_at: new Date().toISOString(),
        });
        break;
      }

      // Listing bump -- platform revenue, no orders/payments row (there's no counterparty, this
      // isn't a trade). The RPC (service-role-only, see 20260101007500_listing_bump.sql)
      // re-validates status/cooldown itself rather than trusting this webhook alone, so a race
      // between two near-simultaneous checkout sessions for the same listing can't double-apply.
      if (session.metadata?.type === "listing_bump" && session.metadata?.listing_id) {
        const { error: bumpError } = await supabase.rpc("bump_listing", { p_listing_id: session.metadata.listing_id });
        // Already validated once before checkout was created (bump-actions.ts) -- a failure here
        // means state changed in between (e.g. the seller removed the listing mid-payment), not a
        // bug. Logging beats throwing: Stripe retries a non-200 response, and retrying can't fix a
        // listing that's gone.
        if (bumpError) console.error(`bump_listing failed for listing ${session.metadata.listing_id}:`, bumpError);
        break;
      }

      // Plus/Premium listing tier (app/listings/actions.ts's createListing) -- platform revenue,
      // same non-Connect shape as the bump above. Direct service-role update, not an RPC: unlike
      // bump_listing there's no cooldown/re-validation needed, this only ever runs once per
      // listing right after creation.
      if (session.metadata?.type === "listing_tier_upgrade" && session.metadata?.listing_id && session.metadata?.tier) {
        const boostRank = session.metadata.tier === "premium" ? 2 : 1;
        const { error: tierError } = await supabase.from("listings").update({ boost_rank: boostRank }).eq("id", session.metadata.listing_id);
        if (tierError) console.error(`Failed to apply boost_rank for listing ${session.metadata.listing_id}:`, tierError);
        break;
      }

      // Homepage placement add-on (app/listings/homepage-placement-actions.ts) -- platform revenue,
      // same non-Connect shape as the bump above. RPC, not a direct update, since it needs to extend
      // from any still-active placement rather than blindly overwrite it (see
      // 20260101008300_homepage_placement.sql).
      if (session.metadata?.type === "homepage_placement" && session.metadata?.listing_id) {
        const { error: placementError } = await supabase.rpc("extend_homepage_placement", { p_listing_id: session.metadata.listing_id });
        if (placementError) console.error(`extend_homepage_placement failed for listing ${session.metadata.listing_id}:`, placementError);
        break;
      }

      const profileId = session.metadata?.profile_id;
      if (!profileId) break;

      if (session.mode === "payment") {
        // One-time top-up -- atomic DB-side increment (see
        // supabase/migrations/20260101005400_atomic_ai_bonus_uses_increment.sql) rather than
        // reading ai_bonus_uses into JS and writing back count + AI_TOPUP_USES -- two genuine
        // top-up purchases in quick succession are two distinct events (the dedupe table above
        // doesn't catch that), and a read-then-write here would let both read the same starting
        // count and credit only one top-up's worth of uses while the customer paid for both.
        const { error: incrementError } = await supabase.rpc("increment_ai_bonus_uses", { p_profile_id: profileId, p_amount: AI_TOPUP_USES });
        if (incrementError) throw incrementError;
      } else if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
        const periodEnd = subscription.items.data[0]?.current_period_end;
        const plan = subscriptionPlanFor(subscription);
        if (plan) {
          await supabase
            .from("profiles")
            .update(subscriptionUpdateFor(plan, subscription.status, periodEnd ? new Date(periodEnd * 1000).toISOString() : null))
            .eq("id", profileId);
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Renewals, cancellations, and payment failures all land here as a status change on the
      // same subscription object -- one handler covers all of them rather than three. These events
      // carry no checkout metadata (unlike checkout.session.completed above), so which profile
      // column pair to update is determined by the subscription's own price id instead.
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      const plan = subscriptionPlanFor(subscription);
      if (plan) {
        await supabase
          .from("profiles")
          .update(subscriptionUpdateFor(plan, status, periodEnd ? new Date(periodEnd * 1000).toISOString() : null))
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    // Fires whenever a connected Express account's status changes -- most importantly, right
    // after a seller finishes Stripe's own onboarding form, which is the only way charges_enabled
    // actually flips to true (there's no "onboarding complete" event of its own to listen for).
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await supabase
        .from("profiles")
        .update({
          stripe_connect_charges_enabled: !!account.charges_enabled,
          stripe_connect_payouts_enabled: !!account.payouts_enabled,
        })
        .eq("stripe_connect_account_id", account.id);
      break;
    }
  }
}
