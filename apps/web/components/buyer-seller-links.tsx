import Link from "next/link";
import { Baby, Wrench, Sparkles, Handshake, Wallet, Truck } from "lucide-react";

type LinkItem = { href: string; icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string };

// Marktplaats-style "For the buyer / For the seller" promo links, adapted to features MarketitNow
// actually has rather than a literal copy of Marktplaats' own paid products (their "Marktplaats
// Pro"/"Pakketten" are Marktplaats-branded tools with no real equivalent here). Every href below
// points at a real page or category, not a placeholder.
export function BuyerSellerLinks({ servicesHref, toysHref }: { servicesHref: string | null; toysHref: string | null }) {
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

  function renderGroup(title: string, links: LinkItem[]) {
    if (links.length === 0) return null;
    return (
      <div>
        <h2 className="mb-2 px-2 text-sm font-semibold">{title}</h2>
        <ul className="flex flex-col gap-0.5">
          {links.map((link, i) => (
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

  return (
    <div className="mt-6 flex flex-col gap-6 border-t pt-4">
      {renderGroup("For the buyer", buyerLinks)}
      {renderGroup("For the seller", sellerLinks)}
    </div>
  );
}
