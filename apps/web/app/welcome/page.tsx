import type { Metadata } from "next";
import Link from "next/link";
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
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StickyAnchorNav } from "@/components/welcome/sticky-anchor-nav";
import { FloatingCtaBar } from "@/components/welcome/floating-cta-bar";

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

const SEARCH_TIPS = [
  { icon: Bookmark, title: "Save your searches", body: "Save a search from any results page and get a notification the moment something new matches." },
  { icon: SlidersHorizontal, title: "Use filters, with care", body: "Narrow things down by category, price, or condition — but mix specific and broad terms so you don't miss a loosely-worded listing." },
  { icon: Bell, title: "Turn on notifications", body: "Turn on notifications so you never miss a new listing, message, or offer the moment it happens." },
  { icon: ThumbsUp, title: "Favorite what you like", body: "Bookmark listings you're interested in and find them anytime from My Favorites." },
  { icon: Shuffle, title: "Try different keywords", body: "The same item is often listed under more than one name — cast a wide net if your first search comes up short." },
  { icon: Handshake, title: "Don't be afraid to negotiate", body: "Many sellers are open to offers. If a listing's been up a while, there's often room to move on price." },
];

const SELL_TIPS = [
  { icon: Camera, title: "Take clear, well-lit photos", body: "Bright, sharp photos from a few angles get more views — and more serious offers." },
  { icon: Sparkles, title: "Let AI suggest your category", body: "Upload a photo when you post an ad and AfroDeals can suggest the right category and a title to start from." },
  { icon: PenLine, title: "Write a clear title", body: "Include other common names for the item so more searches actually find your listing." },
  { icon: Tag, title: "Choose how you sell", body: "List at a fixed price, leave it open to offers, or both — you decide how buyers can reach you on price." },
  { icon: Truck, title: "Offer pickup or delivery", body: "Mark whether you offer pickup, delivery, or both, so buyers know before they even message you." },
  { icon: MessageCircle, title: "Reply quickly", body: "A fast reply to a message or an offer is often the difference between a sale and a missed one." },
];

const TRADE_WAYS = [
  { icon: Handshake, title: "Make an offer", body: "Many sellers welcome bids — propose a fair price and see where the conversation goes." },
  { icon: ShoppingBag, title: "Buy at the asking price", body: "Some listings are fixed-price — skip the back-and-forth and message the seller to arrange it." },
  { icon: SlidersHorizontal, title: "Sell it your way", body: "As a seller, choose whether to accept offers or hold firm on your asking price — it's up to you." },
];

const PAY_SHIP = [
  { icon: Handshake, title: "Agree on payment together", body: "AfroDeals connects buyers and sellers directly — agree on a payment method that works for you both, and keep the conversation on-platform until you do." },
  { icon: Truck, title: "Pickup or delivery, seller's choice", body: "Every listing shows whether the seller offers pickup, delivery, or both, so you know how a trade could work before you reach out." },
  { icon: MapPin, title: "Meet safely", body: "For local pickups, choose a public, well-lit spot — our Safety Center has more tips for trading with confidence." },
];

const SAFETY_TIPS = [
  { icon: Eye, title: "Inspect before you pay", body: "Check that the item matches the listing's photos and description before handing over any money." },
  { icon: MapPin, title: "Meet in a safe, public place", body: "For local pickups, a well-lit public location — ideally during daytime — is always the safer choice." },
  { icon: KeyRound, title: "Never share a one-time passcode", body: "No genuine buyer or seller will ever need an OTP or verification code sent to your phone. Treat any such request as a scam." },
];

export default function WelcomePage() {
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
          {/* Decorative icon cluster standing in for a commissioned illustration — see the build
              note below for why. */}
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
              Every trade on AfroDeals <span className="text-[#e89818]">moves our community forward.</span>
            </h1>
            <div className="flex flex-col gap-3 text-center text-white/70 md:text-left">
              <p>
                Buy and sell across African markets — arrange a pickup nearby and share a chat, or
                let a seller ship it to you wherever that works better.
              </p>
              <p>You&apos;re already part of it. Every trade, big or small, adds up.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value props strip */}
      <section className="border-b bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { icon: ThumbsUp, title: "Good for you", body: "Land a great deal, find exactly what you were after, or finally clear space for what's next." },
            { icon: Users, title: "Good for your community", body: "Support a local seller or find a new home for something a neighbor needs." },
            { icon: Leaf, title: "Good for the planet", body: "Give things a second, third, or fourth life, and help cut down on waste." },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <IconBadge icon={icon} />
              <p className="mt-1 font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Tips */}
      <section id="tips" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Search like a pro — <span className="text-[#e89818]">find it before anyone else does</span>
            </h2>
            <p className="mt-3 text-muted-foreground">A few habits that make the difference between scrolling and finding.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEARCH_TIPS.map((tip) => (
              <TipCard key={tip.title} {...tip} />
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-10 text-center text-white sm:px-6 lg:px-8">
        <p className="mx-auto max-w-lg text-sm text-white/70">
          And once you&apos;ve found something to sell yourself, here&apos;s how to make it shine.
        </p>
      </div>

      <section className="bg-background px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Selling made simple — <span className="text-[#e89818]">get it in front of the right buyer</span>
            </h2>
            <p className="mt-3 text-muted-foreground">A well-built listing sells faster. Here's what actually moves the needle.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SELL_TIPS.map((tip) => (
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
              Trade your way — <span className="text-[#e89818]">on your terms</span>
            </h2>
            <p className="mt-3 text-muted-foreground">There's more than one way to close a deal on AfroDeals.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TRADE_WAYS.map((c) => (
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
              Payments & delivery — <span className="text-[#e89818]">arranged directly between you</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              AfroDeals is where you connect — how you pay and how the item changes hands is
              something you work out together, safely.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PAY_SHIP.map((c) => (
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
              Trade with confidence — <span className="text-[#e89818]">we've got your back</span>
            </h2>
            <p className="mt-3 text-white/70">A few simple habits go a long way, whether you&apos;re buying or selling.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SAFETY_TIPS.map((c) => (
              <SafetyCard key={c.title} {...c} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/safety" className={buttonVariants({ variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>
              <ShieldCheck className="size-4" />
              Visit the Safety Center
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA — no app-store badges/QR here: there is no AfroDeals mobile app (see
          components/footer.tsx's own note on this exact point), so this closes on the real thing
          instead of a fictional download. */}
      <section className="bg-muted/30 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to find your next great deal?</h2>
          <p className="mt-3 text-muted-foreground">Search thousands of listings, or post your own in a couple of minutes.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className={buttonVariants({ size: "lg", className: "gap-2" })}>
              <Search className="size-4" />
              Start searching
            </Link>
            <Link href="/listings/new" className={buttonVariants({ variant: "outline", size: "lg", className: "gap-2" })}>
              Post an ad
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
