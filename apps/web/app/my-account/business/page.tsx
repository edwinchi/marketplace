import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Check, ShieldCheck } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { startBusinessCheckout } from "@/app/my-account/business/checkout-action";
import { openBillingPortal } from "@/app/my-account/ai-features/checkout-action";
import { getStripe, BUSINESS_PRICE_ID, getPriceDisplay } from "@/lib/stripe";
import { buttonVariants, Button } from "@/components/ui/button";

// v1 scope, deliberately: a paid, visible "Business" badge for professional sellers (wholesalers,
// dealerships) layered on the free, self-declared account_type='business' flag that already exists
// -- not bulk/ERP listing-feed ingestion or businesses-table management (real columns, zero app
// code reads/writes them yet), both separate, larger pieces of work.
const BUSINESS_INCLUDES = [
  "A visible \"Business\" badge on every one of your listings and your seller profile",
  "Signals a professional, established seller to buyers -- distinct from the free account type alone",
  "Cancel anytime -- no minimum commitment",
];

const paymentsConfigured = !!BUSINESS_PRICE_ID;

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const { checkout, error } = await searchParams;

  const supabase = await createClient();
  const stripe = getStripe();
  const [{ data: row }, businessPrice] = await Promise.all([
    supabase.from("profiles").select("account_type, business_subscription_status").eq("id", profile.id).single(),
    stripe && BUSINESS_PRICE_ID ? getPriceDisplay(stripe, BUSINESS_PRICE_ID) : Promise.resolve(null),
  ]);
  const isBusinessAccount = row?.account_type === "business";
  const isSubscribed = row?.business_subscription_status === "active";

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-6 py-10 text-white sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#e89818]/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-[#008848]/25 blur-3xl" />
        <div className="relative flex flex-col gap-3">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase backdrop-blur-sm">
            <Building2 className="size-3.5" /> MarketitNow Zakelijk
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Sell as a recognized business.</h1>
          <p className="max-w-lg text-sm text-white/70">
            A visible Business badge for wholesalers, dealerships, and professional sellers — a clear
            trust signal on every listing you post.
          </p>
        </div>
      </div>

      {checkout === "success" && (
        <p className="rounded-lg border border-[#008848]/30 bg-[#008848]/5 px-4 py-2.5 text-sm font-medium text-[#046637]">
          Thanks — your Business subscription is active.
        </p>
      )}
      {checkout === "canceled" && (
        <p className="rounded-lg border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">Checkout was canceled — nothing was charged.</p>
      )}
      {error === "not_configured" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          Payments aren&apos;t fully set up yet — try again shortly.
        </p>
      )}
      {error === "checkout_failed" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          Something went wrong starting checkout — try again.
        </p>
      )}

      {!isBusinessAccount && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed p-6">
          <div>
            <p className="font-medium text-[#082040]">Switch to a business account first</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The Business badge is for accounts marked as a business — free to switch, no commitment.
            </p>
          </div>
          <Link href="/my-account/profile/edit" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Edit account type
          </Link>
        </div>
      )}

      {isBusinessAccount && paymentsConfigured && (
        isSubscribed ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#008848]/30 bg-[#008848]/5 p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#008848] text-white">
                <Check className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-[#082040]">Business</p>
                <p className="text-sm text-muted-foreground">Your badge is live on every active listing.</p>
              </div>
            </div>
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline" size="sm">Manage subscription</Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border-2 border-[#008848] bg-[linear-gradient(180deg,#008848_0%,#046637_100%)] p-6 text-white shadow-lg shadow-[#008848]/20 sm:max-w-sm">
            <div>
              <p className="flex items-center gap-1.5 text-lg font-bold">
                <ShieldCheck className="size-5" /> Business
              </p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">{businessPrice ?? "—"}</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-white/90">
              {BUSINESS_INCLUDES.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#e89818]" />
                  {line}
                </li>
              ))}
            </ul>
            <form action={startBusinessCheckout} className="mt-auto pt-2">
              <Button type="submit" className="w-full bg-white text-[#046637] shadow-sm hover:bg-white/90">
                Subscribe
              </Button>
            </form>
          </div>
        )
      )}

      {isBusinessAccount && !paymentsConfigured && (
        <p className="text-sm text-muted-foreground">The Business subscription is coming soon — check back here.</p>
      )}

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back to profile
      </Link>
    </div>
  );
}
