import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, PenLine, TrendingUp, Languages, BarChart3, Check } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getAiUsageStatus } from "@/app/listings/new/analyze-photo-action";
import { startSellerProCheckout, startTopUpCheckout, openBillingPortal } from "@/app/my-account/ai-features/checkout-action";
import { SELLER_PRO_PRICE_ID, AI_TOPUP_PRICE_ID, AI_TOPUP_USES } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";

const PLANNED_FEATURES = [
  {
    icon: PenLine,
    title: "AI description polish",
    body: "Turn a rough draft into a clean, well-structured listing description.",
  },
  {
    icon: TrendingUp,
    title: "AI price suggestion",
    body: "A competitive price range based on similar active listings nearby.",
  },
  {
    icon: Languages,
    title: "Listing translation",
    body: "Auto-translate your listing between English and French for a wider audience.",
  },
  {
    icon: BarChart3,
    title: "Seller performance insights",
    body: "Real tips from your own listing data — what gets more views, what sells faster.",
  },
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
  const [usage, { data: subRow }] = await Promise.all([
    getAiUsageStatus(),
    supabase.from("profiles").select("ai_subscription_status").eq("id", profile.id).single(),
  ]);
  const isSubscribed = subRow?.ai_subscription_status === "active";
  const limitReached = !usage.unlimited && usage.usesLeft === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-[#008848]" />
        <h1 className="text-2xl font-bold tracking-tight">AI features</h1>
      </div>

      {checkout === "success" && (
        <p className="rounded-md border border-[#008848]/30 bg-[#008848]/5 px-3 py-2 text-sm text-[#008848]">
          Thanks — your purchase is confirmed.
        </p>
      )}
      {checkout === "canceled" && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Checkout was canceled — nothing was charged.</p>
      )}
      {error === "not_configured" && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Payments aren&apos;t fully set up yet — try again shortly.
        </p>
      )}

      <Card className={limitReached ? "border-muted-foreground/20" : "border-[#008848]/30 bg-[#008848]/5"}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Photo autofill</CardTitle>
            {usage.unlimited ? (
              <Badge className="bg-[#008848]">Unlimited{isSubscribed ? " — Seller Pro" : ""}</Badge>
            ) : limitReached ? (
              <Badge variant="outline">Free uses spent</Badge>
            ) : (
              <Badge className="bg-[#008848]">{usage.usesLeft} use{usage.usesLeft === 1 ? "" : "s"} left</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Upload a photo when posting an ad and AI fills in a title, description, and category
            for you — review and edit before you publish, nothing posts automatically. Every
            registered account gets {usage.freeLimit} free uses.
          </p>
          {limitReached ? (
            <p className="text-sm text-muted-foreground">You&apos;ve used every AI analysis on your account — see the options below.</p>
          ) : (
            <Link href="/listings/new" className={buttonVariants({ size: "sm", className: "mt-1 w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              Post an ad
            </Link>
          )}
        </CardContent>
      </Card>

      {paymentsConfigured ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {isSubscribed ? "Your plan" : "Get more"}
          </h2>
          {isSubscribed ? (
            <Card className="border-[#008848]/30 bg-[#008848]/5">
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Check className="size-4 text-[#008848]" /> Seller Pro — unlimited AI features
                </div>
                <form action={openBillingPortal}>
                  <Button type="submit" variant="outline" size="sm">Manage subscription</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="border-[#008848]/30">
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-1 text-base">
                    Seller Pro <span className="text-xs font-normal text-muted-foreground">$7.99/mo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">Unlimited photo autofill, plus every AI feature below as it ships.</p>
                  <form action={startSellerProCheckout}>
                    <Button type="submit" size="sm" className="w-fit">Subscribe</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-1 text-base">
                    Top-up <span className="text-xs font-normal text-muted-foreground">$1.99</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">+{AI_TOPUP_USES} more uses, no subscription — for occasional sellers.</p>
                  <form action={startTopUpCheckout}>
                    <Button type="submit" variant="outline" size="sm" className="w-fit">Buy top-up</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        limitReached && (
          <p className="text-sm text-muted-foreground">Paid plans are coming soon — check back here.</p>
        )
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Planned</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLANNED_FEATURES.map((f) => (
            <Card key={f.title} className="opacity-75 transition-all duration-200 hover:opacity-100 hover:shadow-sm">
              <CardContent className="flex gap-3 pt-6">
                <f.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        These aren&apos;t built yet — we&apos;d rather say so than show a card that doesn&apos;t
        actually do anything. They&apos;ll appear here for real once they exist.
      </p>

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back to profile
      </Link>
    </div>
  );
}
