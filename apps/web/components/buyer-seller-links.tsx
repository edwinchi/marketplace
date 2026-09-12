"use client";

import { useState } from "react";
import Link from "next/link";
import { Baby, Wrench, Sparkles, Handshake, Wallet, Truck } from "lucide-react";

type LinkItem = { href: string; icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string };

// Marktplaats-style "For the buyer / For the seller" promo links, adapted to features MarketitNow
// actually has rather than a literal copy of Marktplaats' own paid products (their "Marktplaats
// Pro"/"Pakketten" are Marktplaats-branded tools with no real equivalent here). Every href below
// points at a real page or category, not a placeholder. Tab-switched (not both lists stacked) per
// request -- a client component just for that toggle, everything else stays plain links.
export function BuyerSellerLinks({ servicesHref, toysHref }: { servicesHref: string | null; toysHref: string | null }) {
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");

  const buyerLinks: LinkItem[] = [
    ...(servicesHref ? [{ href: servicesHref, icon: Wrench, title: "Services & Trades", subtitle: "Find a tradesperson" }] : []),
    ...(toysHref ? [{ href: toysHref, icon: Baby, title: "Toys & Kids", subtitle: "Great gift ideas" }] : []),
  ];

  const sellerLinks: LinkItem[] = [
    { href: "/my-account/ai-features", icon: Sparkles, title: "Seller Pro", subtitle: "Sell like a professional" },
    ...(servicesHref ? [{ href: servicesHref, icon: Handshake, title: "Offer your services", subtitle: "List your trade or service" }] : []),
    { href: "/my-account/payments/enable", icon: Wallet, title: "Direct Buy", subtitle: "Get paid directly and safely" },
    { href: "/my-account/transactions", icon: Truck, title: "Shipping made easy", subtitle: "Keep buyers updated on their order" },
  ];

  const activeLinks = tab === "buyer" ? buyerLinks : sellerLinks;
  if (buyerLinks.length === 0 && sellerLinks.length === 0) return null;

  return (
    <div className="mt-6 border-t pt-4">
      <div className="mb-2 flex gap-1 rounded-md bg-muted/40 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab("buyer")}
          className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${tab === "buyer" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          For the buyer
        </button>
        <button
          type="button"
          onClick={() => setTab("seller")}
          className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${tab === "seller" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          For the seller
        </button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {activeLinks.map((link, i) => (
          <li key={i}>
            <Link
              href={link.href}
              className="flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-all duration-150 hover:translate-x-0.5 hover:bg-brand-green/10"
            >
              <link.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium text-primary">{link.title}</span>
                <span className="block text-xs text-muted-foreground">{link.subtitle}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
