import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, AI_TOPUP_USES, SELLER_PRO_PRICE_ID, BUSINESS_PRICE_ID } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { fromStripeAmount } from "@/lib/money";

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
    // 23505 = unique_violation -- already processed, nothing to do.
    if (dedupeError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    // Any other error means the dedupe check itself failed (e.g. DB unreachable). Returning 200
    // here used to drop the event for good -- a paid order/top-up/subscription never applied.
    // Stripe retries a non-2xx with backoff for ~3 days (not forever), which is exactly what a
    // transient infrastructure failure needs.
    console.error(`Webhook dedupe insert failed for event ${event.id} (${event.type}):`, dedupeError);
    return NextResponse.json({ error: "Temporarily unavailable" }, { status: 500 });
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
    // A delayed-notification method (Multibanco, in EUR_CHECKOUT_PAYMENT_METHOD_TYPES) fires
    // checkout.session.completed with payment_status "unpaid" the moment the customer is handed a
    // voucher -- before any money has moved. Fulfilling on that would mark an order paid (so the
    // seller ships), or apply a bump/placement/tier/top-up, for a payment that may never arrive.
    // Those sessions are fulfilled on checkout.session.async_payment_succeeded instead, which
    // fires once the funds actually land. ("no_payment_required", e.g. a 100%-off subscription, is
    // fine to fulfil immediately.) Requires that event to be enabled on the platform webhook
    // endpoint in the Stripe Dashboard.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "unpaid") break;

      // Direct Buy order payment -- distinguished by metadata.type rather than by mode alone,
      // since it shares mode: "payment" with the AI top-up below. Stripe Connect already paid the
      // seller directly as part of this same charge (transfer_data.destination in
      // app/listings/payment-actions.ts) -- no fund hold exists (Terms of Service §6, and see
      // supabase/migrations/20260101006900's own comment). This just marks the order paid.
      if (session.metadata?.type === "order_payment" && session.metadata?.order_id) {
        const orderId = session.metadata.order_id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        // Errors thrown, not ignored -- the outer handler rolls back the dedupe row and returns
        // 500 so Stripe redelivers, instead of silently leaving a paid order at pending_payment.
        const { data: paidOrder, error: orderError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId)
          .select("listing_id, buyer_id")
          .single();
        if (orderError) throw orderError;

        const providerPaymentId = paymentIntentId ?? session.id;
        // Upsert, not insert: provider_payment_id is UNIQUE, so if anything after this point throws
        // and Stripe redelivers, a plain insert would fail on the retry and wedge the event forever.
        const { error: paymentError } = await supabase.from("payments").upsert(
          {
            order_id: orderId,
            provider: "stripe",
            provider_payment_id: providerPaymentId,
            // Back into this app's own ×100 minor units (zero-/three-decimal currencies differ).
            amount_minor: fromStripeAmount(session.amount_total ?? 0, session.currency ?? "eur"),
            currency_code: (session.currency ?? "eur").toUpperCase(),
            status: "succeeded",
            payment_method: paymentIntentId ? await paymentMethodType(stripe, paymentIntentId) : null,
            paid_at: new Date().toISOString(),
          },
          { onConflict: "provider_payment_id", ignoreDuplicates: true },
        );
        if (paymentError) throw paymentError;

        // Take the (single-quantity) item off the market so startOrderPayment's status check turns
        // away the next buyer. 'expired' counts as still available -- the 60-day sweep can flip a
        // listing mid-checkout without the item having gone anywhere.
        if (paidOrder?.listing_id) {
          const { data: soldRows, error: soldError } = await supabase
            .from("listings")
            .update({ status: "sold" })
            .eq("id", paidOrder.listing_id)
            .in("status", ["active", "expired"])
            .select("id");
          if (soldError) {
            console.error(`Failed to mark listing ${paidOrder.listing_id} sold after order ${orderId} was paid:`, soldError);
          } else if (!soldRows?.length && paymentIntentId) {
            // Already sold (another buyer's payment landed first -- two checkouts can be open on
            // the same item at once), or the seller removed it mid-checkout. The buyer paid for
            // something they can't get, so refund them in full instead of leaving the seller to
            // sort it out.
            await refundUnavailableOrder(stripe, supabase, { orderId, paymentIntentId, providerPaymentId, buyerId: paidOrder.buyer_id, listingId: paidOrder.listing_id });
          }
        }
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
          const { error: subscriptionError } = await supabase
            .from("profiles")
            .update(subscriptionUpdateFor(plan, subscription.status, periodEnd ? new Date(periodEnd * 1000).toISOString() : null))
            .eq("id", profileId);
          if (subscriptionError) throw subscriptionError;
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
        const { error: subscriptionError } = await supabase
          .from("profiles")
          .update(subscriptionUpdateFor(plan, status, periodEnd ? new Date(periodEnd * 1000).toISOString() : null))
          .eq("stripe_customer_id", customerId);
        if (subscriptionError) throw subscriptionError;
      }
      break;
    }

    // Fires whenever a connected Express account's status changes -- most importantly, right
    // after a seller finishes Stripe's own onboarding form, which is the only way charges_enabled
    // actually flips to true (there's no "onboarding complete" event of its own to listen for).
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const { error: accountError } = await supabase
        .from("profiles")
        .update({
          stripe_connect_charges_enabled: !!account.charges_enabled,
          stripe_connect_payouts_enabled: !!account.payouts_enabled,
        })
        .eq("stripe_connect_account_id", account.id);
      if (accountError) throw accountError;
      break;
    }
  }
}

// The method the buyer actually used (ideal, klarna, multibanco, card, ...), read off the charge --
// this used to be hard-coded "card" whatever was used. Best-effort: null if it can't be read, never
// a reason to fail the webhook.
async function paymentMethodType(stripe: Stripe, paymentIntentId: string): Promise<string | null> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    return typeof charge === "object" && charge ? (charge.payment_method_details?.type ?? null) : null;
  } catch (err) {
    console.error(`Couldn't read payment method for ${paymentIntentId}:`, err);
    return null;
  }
}

// Full refund for a Direct Buy whose item was no longer available when the payment landed:
// reverse_transfer pulls the seller's share back from their Connect account and
// refund_application_fee returns the buyer fee, so everyone ends where they started. The
// idempotency key makes a redelivered event safe. If Stripe refuses (some voucher methods can't
// be refunded automatically), the order is parked at needs_refund for a manual refund instead of
// throwing -- a retry can't change Stripe's answer, it would just loop for three days.
async function refundUnavailableOrder(
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceClient>,
  o: { orderId: string; paymentIntentId: string; providerPaymentId: string; buyerId: string; listingId: string },
) {
  try {
    await stripe.refunds.create(
      { payment_intent: o.paymentIntentId, reverse_transfer: true, refund_application_fee: true },
      { idempotencyKey: `refund-unavailable-${o.orderId}` },
    );
  } catch (err) {
    console.error(`Automatic refund failed for order ${o.orderId} (item unavailable) -- needs a manual refund:`, err);
    await supabase.from("orders").update({ status: "needs_refund" }).eq("id", o.orderId);
    return;
  }

  const now = new Date().toISOString();
  await supabase.from("orders").update({ status: "refunded" }).eq("id", o.orderId);
  await supabase.from("payments").update({ status: "refunded", refunded_at: now }).eq("provider_payment_id", o.providerPaymentId);
  await supabase.from("notifications").insert({
    profile_id: o.buyerId,
    notification_type: "order_refunded",
    title: "Your order was refunded",
    body: "The item sold to someone else just before your payment completed, so your payment has been refunded in full.",
    payload: { order_id: o.orderId, listing_id: o.listingId },
  });
}
