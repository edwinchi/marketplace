import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, PenLine, TrendingUp, Languages, BarChart3, Check, Camera, Zap, ArrowRight } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { startSellerProCheckout, startTopUpCheckout, openBillingPortal } from "@/app/my-account/ai-features/checkout-action";
import { getStripe, SELLER_PRO_PRICE_ID, AI_TOPUP_PRICE_ID, AI_TOPUP_USES, getPriceDisplay } from "@/lib/stripe";
import { buttonVariants, Button } from "@/components/ui/button";
import { PlanInfoDialog } from "@/components/ai-features/plan-info-dialog";
import { cn } from "@/lib/utils";

// Live today, Seller Pro-exclusive (see lib/seller-pro.ts) -- shown as concrete included features,
// not a vague "more AI features" promise, so a subscriber knows exactly what their subscription
// bought them right now. All 4 originally-planned features now ship here; none left on the roadmap.
const SELLER_PRO_FEATURES = [
  {
    icon: PenLine,
    title: "AI description polish",
    body: "Turn a rough draft into a clean, well-structured listing description.",
  },
  {
    icon: TrendingUp,
    title: "AI price suggestion",
    body: "A competitive price range based on similar active listings nearby — real comparable listings, never a guessed figure.",
  },
  {
    icon: Languages,
    title: "Listing translation",
    body: "Auto-translate your listing into French with one click, so French-speaking buyers see it in their language automatically.",
  },
  {
    icon: BarChart3,
    title: "Seller performance insights",
    body: "Real tips from your own listing data — what gets more views, what sells faster.",
    href: "/my-account/seller-insights",
  },
];

const SELLER_PRO_INCLUDES = [
  "Unlimited AI photo autofill",
  "AI description polish — clean up any draft into a well-structured listing",
  "AI price suggestion — a real price range from comparable active listings",
  "Listing translation — auto-translate to French in one click",
  "Seller performance insights — real tips from your own listing data",
  "Every new AI feature lands here automatically, at no extra cost",
];

// Upgrade buttons only render once a real Stripe account exists and its price IDs are set in env
// (lib/stripe.ts) — same "honest, not fabricated" rule as before: no button that doesn't work.
const paymentsConfigured = !!SELLER_PRO_PRICE_ID && !!AI_TOPUP_PRICE_ID;

export default async function AiFeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  const { checkout, error } = await searchParams;

  const supabase = await createClient();
  const stripe = getStripe();
  const [usage, { data: subRow }, sellerProPrice, topUpPrice] = await Promise.all([
    getAiUsageStatus(),
    supabase.from("profiles").select("ai_subscription_status").eq("id", profile.id).single(),
    // Read straight from Stripe rather than hardcoding a second copy of the price -- the whole
    // reason this needed fixing once already (the page showed "$7.99"/"$1.99" placeholders that
    // had drifted from the real €6.93/€3.99 configured in the Dashboard).
    stripe && SELLER_PRO_PRICE_ID ? getPriceDisplay(stripe, SELLER_PRO_PRICE_ID) : Promise.resolve(null),
    stripe && AI_TOPUP_PRICE_ID ? getPriceDisplay(stripe, AI_TOPUP_PRICE_ID) : Promise.resolve(null),
  ]);
  const isSubscribed = subRow?.ai_subscription_status === "active";
  const limitReached = !usage.unlimited && usage.usesLeft === 0;
  // Against effectiveLimit (free + any bonus uses), not the flat freeLimit constant -- a top-up
  // customer's usesLeft can exceed freeLimit, which made this go negative (invalid width) right
  // after every purchase.
  const usagePct = usage.effectiveLimit > 0 ? Math.max(0, Math.min(100, Math.round(((usage.effectiveLimit - usage.usesLeft) / usage.effectiveLimit) * 100))) : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero — same dark navy-to-green gradient language as the admin dashboard's own login
          screen, so this reads as a genuine premium-feature moment rather than a plain settings
          page wearing the same card styling as everything else in this account section. */}
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-6 py-10 text-white sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#e89818]/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-[#008848]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-size-[28px_28px]" />
        <div className="relative flex flex-col gap-3">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5" /> AI features
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">List faster. Sell smarter.</h1>
          <p className="max-w-lg text-sm text-white/70">
            AfroDeals uses AI to turn one photo into a ready-to-review listing — and every registered
            seller gets a real free tier, not just a teaser.
          </p>
        </div>
      </div>

      {checkout === "success" && (
        <p className="rounded-lg border border-[#008848]/30 bg-[#008848]/5 px-4 py-2.5 text-sm font-medium text-[#046637]">
          Thanks — your purchase is confirmed.
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

      {/* Photo autofill — a real usage meter (not just a badge) makes the free tier feel concrete
          and earned, not like a limitation being apologized for. */}
      <div className="overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex items-start gap-4 p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
            <Camera className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-[#082040]">Photo autofill</h2>
                <PlanInfoDialog
                  triggerLabel="What's included in the Free plan"
                  title="Free"
                  tagline="What every registered account gets, no payment needed."
                  features={[
                    `${usage.freeLimit} AI photo autofill uses — upload a photo, get a title, description, and category to review`,
                    "Full access to buy, sell, and message on AfroDeals",
                    "No credit card required",
                  ]}
                  note="Once your free uses run out, Seller Pro or a one-time top-up picks up from there — everything else on the site keeps working either way."
                />
              </span>
              {usage.unlimited ? (
                <span className="flex items-center gap-1 rounded-full bg-[#008848]/10 px-2.5 py-1 text-xs font-semibold text-[#046637]">
                  <Zap className="size-3" /> Unlimited{isSubscribed ? " — Seller Pro" : ""}
                </span>
              ) : (
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", limitReached ? "bg-muted text-muted-foreground" : "bg-[#008848]/10 text-[#046637]")}>
                  {limitReached ? "Free uses spent" : `${usage.usesLeft} use${usage.usesLeft === 1 ? "" : "s"} left`}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload a photo when posting an ad and AI fills in a title, description, and category for
              you — review and edit before you publish, nothing posts automatically.
            </p>
            {!usage.unlimited && (
              <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[linear-gradient(to_right,#082040,#008848)] transition-all duration-500"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            <div className="mt-4">
              {limitReached ? (
                <p className="text-sm text-muted-foreground">You&apos;ve used every free AI analysis on your account — see the options below.</p>
              ) : (
                <Link href="/listings/new" className={buttonVariants({ size: "sm", className: "gap-1.5 transition-transform duration-150 hover:-translate-y-0.5" })}>
                  Post an ad <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {paymentsConfigured ? (
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {isSubscribed ? "Your plan" : "Get more"}
          </h2>
          {isSubscribed ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#008848]/30 bg-[#008848]/5 p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#008848] text-white">
                  <Check className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-[#082040]">Seller Pro</p>
                  <p className="text-sm text-muted-foreground">Unlimited AI features, active on your account.</p>
                </div>
              </div>
              <form action={openBillingPortal}>
                <Button type="submit" variant="outline" size="sm">Manage subscription</Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Seller Pro is the recommended plan -- a slightly raised, ringed card (the same
                  visual weight a "most popular" plan gets on any real pricing page) instead of
                  looking identical to Top-up beside it. */}
              <div className="relative flex flex-col gap-4 rounded-2xl border-2 border-[#008848] bg-[linear-gradient(180deg,#008848_0%,#046637_100%)] p-6 text-white shadow-lg shadow-[#008848]/20 sm:-translate-y-1">
                <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-[#e89818] px-3 py-1 text-[11px] font-bold tracking-wide text-[#082040] uppercase shadow-sm">
                  Best value
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-bold">
                    Seller Pro
                    <PlanInfoDialog
                      triggerLabel="What's included in Seller Pro"
                      title="Seller Pro"
                      price={sellerProPrice ?? undefined}
                      tagline="A monthly subscription for sellers who post regularly."
                      features={SELLER_PRO_INCLUDES}
                      note="Billed monthly through Stripe. Cancel anytime from the Manage subscription button — no minimum commitment."
                    />
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">{sellerProPrice ?? "—"}</span>
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-white/90">
                  {SELLER_PRO_INCLUDES.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#e89818]" />
                      {line}
                    </li>
                  ))}
                </ul>
                <form action={startSellerProCheckout} className="mt-auto pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-white text-[#046637] shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-white/90"
                  >
                    Subscribe
                  </Button>
                </form>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-bold text-[#082040]">
                    Top-up
                    <PlanInfoDialog
                      triggerLabel="What's included in a Top-up"
                      title="Top-up"
                      price={topUpPrice ?? undefined}
                      tagline="A one-time purchase, no subscription — for occasional sellers."
                      features={[
                        `+${AI_TOPUP_USES} AI photo autofill uses, added to your account immediately`,
                        "Uses never expire",
                        "Buy again anytime you run low",
                      ]}
                      note="This is a single payment, not a recurring charge — you won't be billed again unless you buy another top-up."
                    />
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-[#082040]">{topUpPrice ?? "—"}</span>
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#008848]" />
                    +{AI_TOPUP_USES} more photo autofill uses
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#008848]" />
                    No subscription — pay once, use anytime
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#008848]" />
                    Best for occasional sellers
                  </li>
                </ul>
                <form action={startTopUpCheckout} className="mt-auto pt-2">
                  <Button type="submit" variant="outline" className="w-full transition-transform duration-150 hover:-translate-y-0.5">
                    Buy top-up
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        limitReached && (
          <p className="text-sm text-muted-foreground">Paid plans are coming soon — check back here.</p>
        )
      )}

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Included with Seller Pro
          <span className="rounded-full bg-[#008848]/10 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-[#046637] normal-case">Live now</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SELLER_PRO_FEATURES.map((f) => {
            const card = (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
                  <f.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#082040]">{f.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{f.body}</p>
                  {f.href && <p className="mt-1.5 text-xs font-medium text-[#008848]">View your insights →</p>}
                </div>
              </>
            );
            return f.href ? (
              <Link key={f.title} href={f.href} className="flex gap-3 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#008848]/30 hover:shadow-md">
                {card}
              </Link>
            ) : (
              <div key={f.title} className="flex gap-3 rounded-xl border p-5 shadow-sm">
                {card}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Each one works from your own listing's real title, photos, and comparable prices — never a
          fabricated figure or fact. The first three are available from any listing&apos;s edit page.
        </p>
      </div>

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back to profile
      </Link>
    </div>
  );
}
