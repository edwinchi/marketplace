import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Search,
  SlidersHorizontal,
  Bell,
  Bookmark,
  Shuffle,
  Handshake,
  Camera,
  Sparkles,
  PenLine,
  Tag,
  Truck,
  MessageCircle,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  Eye,
  KeyRound,
  Users,
  Leaf,
  ThumbsUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StickyAnchorNav } from "@/components/welcome/sticky-anchor-nav";
import { FloatingCtaBar } from "@/components/welcome/floating-cta-bar";
import { ListenButton } from "@/components/listen-button";

export const metadata: Metadata = { title: "Welcome to AfroDeals" };

type IconType = typeof Search;

function IconBadge({ icon: Icon, tone = "light" }: { icon: IconType; tone?: "light" | "dark" }) {
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center rounded-full ${
        tone === "dark" ? "bg-white/10 text-[#e89818]" : "bg-[#e89818]/10 text-[#e89818]"
      }`}
    >
      <Icon className="size-5.5" />
    </span>
  );
}

function TipCard({ icon, title, body }: { icon: IconType; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#008200]/30 hover:shadow-md">
      <IconBadge icon={icon} />
      <div className="h-0.5 w-8 rounded-full bg-[#e89818]" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function TradeCard({ icon, title, body }: { icon: IconType; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#008200]/30 hover:shadow-md">
      <IconBadge icon={icon} />
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function SafetyCard({ icon, title, body }: { icon: IconType; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm">
      <IconBadge icon={icon} />
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function WelcomePage() {
  const t = await getTranslations("Welcome");

  const searchTips = [
    { icon: Bookmark, title: t("searchTip1Title"), body: t("searchTip1Body") },
    { icon: SlidersHorizontal, title: t("searchTip2Title"), body: t("searchTip2Body") },
    { icon: Bell, title: t("searchTip3Title"), body: t("searchTip3Body") },
    { icon: ThumbsUp, title: t("searchTip4Title"), body: t("searchTip4Body") },
    { icon: Shuffle, title: t("searchTip5Title"), body: t("searchTip5Body") },
    { icon: Handshake, title: t("searchTip6Title"), body: t("searchTip6Body") },
  ];
  const sellTips = [
    { icon: Camera, title: t("sellTip1Title"), body: t("sellTip1Body") },
    { icon: Sparkles, title: t("sellTip2Title"), body: t("sellTip2Body") },
    { icon: PenLine, title: t("sellTip3Title"), body: t("sellTip3Body") },
    { icon: Tag, title: t("sellTip4Title"), body: t("sellTip4Body") },
    { icon: Truck, title: t("sellTip5Title"), body: t("sellTip5Body") },
    { icon: MessageCircle, title: t("sellTip6Title"), body: t("sellTip6Body") },
  ];
  const tradeWays = [
    { icon: Handshake, title: t("trade1Title"), body: t("trade1Body") },
    { icon: ShoppingBag, title: t("trade2Title"), body: t("trade2Body") },
    { icon: SlidersHorizontal, title: t("trade3Title"), body: t("trade3Body") },
  ];
  const payShip = [
    { icon: Handshake, title: t("pay1Title"), body: t("pay1Body") },
    { icon: Truck, title: t("pay2Title"), body: t("pay2Body") },
    { icon: MapPin, title: t("pay3Title"), body: t("pay3Body") },
  ];
  const safetyTips = [
    { icon: Eye, title: t("safetyTip1Title"), body: t("safetyTip1Body") },
    { icon: MapPin, title: t("safetyTip2Title"), body: t("safetyTip2Body") },
    { icon: KeyRound, title: t("safetyTip3Title"), body: t("safetyTip3Body") },
  ];
  const aiBullets = [t("aiBullet1"), t("aiBullet2"), t("aiBullet3")];

  return (
    <div className="flex flex-1 flex-col">
      <StickyAnchorNav />

      {/* Section 1 — Hero */}
      <section
        id="welcome"
        className="relative overflow-hidden bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-[#e89818]/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-96 rounded-full bg-[#008200]/25 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-size-[28px_28px]"
        />

        <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-center gap-10">
          {/* Page kicker -- names the page itself ("How it works" / "Comment ça marche") above the
              headline, so the page reads clearly regardless of where someone lands on it. */}
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 uppercase backdrop-blur">
              {t("pageKicker")}
            </span>
            <ListenButton className="border-white/20 bg-white/10 text-white/90 backdrop-blur hover:border-white/40 hover:text-white" />
          </div>

          {/* Decorative icon cluster standing in for a commissioned illustration -- built from the
              same lucide-react icon set used everywhere else on the site rather than attempting
              AI-generated art "in the style of" another platform. */}
          <div className="flex items-center gap-4 sm:gap-6">
            {[Tag, ShoppingBag, Truck, MessageCircle, Handshake].map((Icon, i) => (
              <span
                key={i}
                className={`flex items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur ${
                  i === 2 ? "size-20 sm:size-24" : "size-12 sm:size-14"
                }`}
              >
                <Icon className={i === 2 ? "size-9 text-[#e89818] sm:size-10" : "size-5 text-white/70 sm:size-6"} />
              </span>
            ))}
          </div>

          <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
            <h1 className="text-center text-3xl leading-tight font-bold sm:text-4xl md:text-left">
              {t("heroHeadline1")} <span className="text-[#e89818]">{t("heroHeadline2")}</span>
            </h1>
            <div className="flex flex-col gap-3 text-center text-white/70 md:text-left">
              <p>{t("heroSub1")}</p>
              <p>{t("heroSub2")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value props strip */}
      <section className="border-b bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { icon: ThumbsUp, title: t("valueProp1Title"), body: t("valueProp1Body") },
            { icon: Users, title: t("valueProp2Title"), body: t("valueProp2Body") },
            { icon: Leaf, title: t("valueProp3Title"), body: t("valueProp3Body") },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <IconBadge icon={icon} />
              <p className="mt-1 font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI emphasis — the one real, shipped AI feature (photo autofill in app/listings/new/
          analyze-photo-action.ts), described accurately: everything else on /my-account/ai-features
          is explicitly listed there as PLANNED_FEATURES, not yet built, so it stays out of this
          promise. Deliberately its own full-width band, not just another tip card, per request. */}
      <section className="border-b bg-[linear-gradient(135deg,#046637_0%,#008200_100%)] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-10 md:grid-cols-[auto_1fr] md:items-center">
          <span className="mx-auto flex size-20 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur md:mx-0">
            <Sparkles className="size-9" />
          </span>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t("aiTitle")}</h2>
            <p className="mt-3 max-w-2xl text-white/85">{t("aiBody")}</p>
            <ul className="mt-5 flex flex-col gap-2">
              {aiBullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-white/90">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#d4f5d4]" />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/my-account/ai-features"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#046637] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              {t("aiCta")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Tips */}
      <section id="tips" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t("searchTipsHeading1")} <span className="text-[#e89818]">{t("searchTipsHeading2")}</span>
            </h2>
            <p className="mt-3 text-muted-foreground">{t("searchTipsIntro")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searchTips.map((tip) => (
              <TipCard key={tip.title} {...tip} />
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-10 text-center text-white sm:px-6 lg:px-8">
        <p className="mx-auto max-w-lg text-sm text-white/70">{t("dividerText")}</p>
      </div>

      <section className="bg-background px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t("sellTipsHeading1")} <span className="text-[#e89818]">{t("sellTipsHeading2")}</span>
            </h2>
            <p className="mt-3 text-muted-foreground">{t("sellTipsIntro")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sellTips.map((tip) => (
              <TipCard key={tip.title} {...tip} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Trade your way */}
      <section id="buy-sell" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t("buySellHeading1")} <span className="text-[#e89818]">{t("buySellHeading2")}</span>
            </h2>
            <p className="mt-3 text-muted-foreground">{t("buySellIntro")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tradeWays.map((c) => (
              <TradeCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Payments & delivery */}
      <section id="pay-ship" className="bg-background px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t("payShipHeading1")} <span className="text-[#e89818]">{t("payShipHeading2")}</span>
            </h2>
            <p className="mt-3 text-muted-foreground">{t("payShipIntro")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {payShip.map((c) => (
              <TradeCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Safety */}
      <section id="safety" className="bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t("safetyHeading1")} <span className="text-[#e89818]">{t("safetyHeading2")}</span>
            </h2>
            <p className="mt-3 text-white/70">{t("safetyIntro")}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {safetyTips.map((c) => (
              <SafetyCard key={c.title} {...c} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/safety" className={buttonVariants({ variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>
              <ShieldCheck className="size-4" />
              {t("visitSafetyCenter")}
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA — no app-store badges/QR here: there is no AfroDeals mobile app (see
          components/footer.tsx's own note on this exact point), so this closes on the real thing
          instead of a fictional download. */}
      <section className="bg-muted/30 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("closingTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("closingBody")}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className={buttonVariants({ size: "lg", className: "gap-2 text-base sm:text-sm" })}>
              <Search className="size-4" />
              {t("startSearching")}
            </Link>
            <Link href="/listings/new" className={buttonVariants({ variant: "outline", size: "lg", className: "gap-2 text-base sm:text-sm" })}>
              {t("postAd")}
            </Link>
          </div>
        </div>
      </section>

      {/* Clears the fixed FloatingCtaBar so it never covers the last real content above. */}
      <div className="h-20" aria-hidden />

      <FloatingCtaBar />
    </div>
  );
}
