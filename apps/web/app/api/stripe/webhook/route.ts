import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, AI_TOPUP_USES } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Direct Buy order payment -- distinguished by metadata.type rather than by mode alone,
      // since it shares mode: "payment" with the AI top-up below. Escrows the funds (status
      // 'funds_escrowed', matching the lifecycle in supabase/migrations/20260101001400_
      // fulfillment_escrow.sql) rather than marking the order complete outright -- release happens
      // on delivery confirmation, not on payment.
      if (session.metadata?.type === "order_payment" && session.metadata?.order_id) {
        const orderId = session.metadata.order_id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await supabase.from("orders").update({ status: "funds_escrowed" }).eq("id", orderId);
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

      const profileId = session.metadata?.profile_id;
      if (!profileId) break;

      if (session.mode === "payment") {
        // One-time top-up -- add AI_TOPUP_USES to the existing balance, not a flat set, in case
        // someone buys more than one top-up over time.
        const { data: profile } = await supabase.from("profiles").select("ai_bonus_uses").eq("id", profileId).single();
        await supabase
          .from("profiles")
          .update({ ai_bonus_uses: (profile?.ai_bonus_uses ?? 0) + AI_TOPUP_USES })
          .eq("id", profileId);
      } else if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
        await supabase
          .from("profiles")
          .update({
            ai_subscription_status: subscription.status,
            ai_subscription_current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
          })
          .eq("id", profileId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Renewals, cancellations, and payment failures all land here as a status change on the
      // same subscription object -- one handler covers all of them rather than three.
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
      await supabase
        .from("profiles")
        .update({
          ai_subscription_status: status,
          ai_subscription_current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        })
        .eq("stripe_customer_id", customerId);
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

  return NextResponse.json({ received: true });
}
