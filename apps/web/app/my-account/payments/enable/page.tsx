import { redirect } from "next/navigation";
import Link from "next/link";
import { Landmark, CheckCircle2, ExternalLink } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { startConnectOnboarding, openConnectDashboard } from "@/app/my-account/payments/actions";
import { buttonVariants, Button } from "@/components/ui/button";

// Real onboarding via Stripe Connect Express, not a bank-details form of our own -- AfroDeals
// never collects or stores raw account numbers; Stripe's own hosted flow does, and just hands back
// an account id (see app/my-account/payments/actions.ts). The button only renders once a real
// Stripe account exists (getStripe() returns non-null) -- same "no button that doesn't work" rule
// as /my-account/ai-features.
export default async function EnablePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; onboarding?: string }>;
}) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled")
    .eq("id", profile.id)
    .single();

  const stripeConfigured = !!getStripe();
  const connected = !!row?.stripe_connect_charges_enabled;
  const started = !!row?.stripe_connect_account_id && !connected;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Enable payments</h1>

      {!stripeConfigured ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
          <Landmark className="size-10 text-muted-foreground" />
          <p className="font-medium">Not available yet.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            AfroDeals doesn&apos;t collect payout bank details yet — we&apos;d rather wait for a
            secure, licensed way to do it than store sensitive account details ourselves. You&apos;ll
            be able to add a payout method here once that&apos;s built.
          </p>
        </div>
      ) : connected ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
          <CheckCircle2 className="size-10 text-[#008848]" />
          <p className="font-medium">Payments enabled</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Buyers can pay you directly through AfroDeals — funds go straight to your own bank
            account via Stripe.
          </p>
          <form action={openConnectDashboard}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              Manage on Stripe <ExternalLink className="size-3.5" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
          <Landmark className="size-10 text-muted-foreground" />
          <p className="font-medium">{started ? "Finish setting up your payout account" : "Get paid directly to your bank"}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Stripe handles your ID and bank details securely — AfroDeals never sees or stores them.
            Takes a few minutes.
          </p>
          {error === "not_configured" && (
            <p className="text-sm text-destructive">Payments aren&apos;t fully set up on this server yet — try again later.</p>
          )}
          {error === "connect_not_ready" && (
            <p className="text-sm text-destructive">Payments aren&apos;t fully turned on yet — try again shortly.</p>
          )}
          <form action={startConnectOnboarding}>
            <Button type="submit" className="gap-1.5">
              {started ? "Continue setup" : "Connect your bank account"}
            </Button>
          </form>
        </div>
      )}

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
