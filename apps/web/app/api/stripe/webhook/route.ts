import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, AI_TOPUP_USES } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Service-role client, not the cookie-based one -- there's no logged-in request here, Stripe is
// calling this server-to-server, authenticated only by the webhook signature below.
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Signature verification needs the exact raw body bytes -- request.text() here, never
  // request.json(), which would re-serialize and invalidate the signature.
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
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
  }

  return NextResponse.json({ received: true });
}
