"use client";

import { useState } from "react";

// Plus/Premium are real now -- platform-charged (no Stripe Connect transfer, same non-transfer
// pattern as the ad-bump/Business-subscription fees), applied via a Stripe Checkout redirect after
// the listing itself is created (see createListing's tail in app/listings/actions.ts) rather than
// blocking listing creation on payment. "Shown more/most often" is a real, structural effect, not
// just copy: every buyer-facing browse/search query orders by listings.boost_rank first
// (0=free/1=plus/2=premium), then recency -- see categories/[...slug]/page.tsx, cities/[city]/
// page.tsx, lib/cars-landing.ts.
function formatCents(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function AdvertiseTierSelector({
  plusPriceCents,
  premiumPriceCents,
  initialTier = "free",
}: {
  plusPriceCents: number;
  premiumPriceCents: number;
  // Lets the edit form pre-select whatever tier the listing is already on (derived from
  // boost_rank), instead of every re-edit visually resetting to Free even though the seller
  // already paid for Plus/Premium.
  initialTier?: "free" | "plus" | "premium";
}) {
  const [selected, setSelected] = useState<"free" | "plus" | "premium">(initialTier);

  const TIERS = [
    { id: "free" as const, name: "Free", priceCents: 0, blurb: "Standard visibility", features: ["Listed for 4 weeks"] },
    { id: "plus" as const, name: "Plus", priceCents: plusPriceCents, blurb: "Higher visibility", features: ["Listed for 4 weeks", "Shown more often"] },
    {
      id: "premium" as const,
      name: "Premium",
      priceCents: premiumPriceCents,
      blurb: "Maximum visibility",
      features: ["Listed for 4 weeks", "Shown most often"],
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <label
            key={tier.id}
            className="flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm transition-colors has-checked:border-primary has-checked:ring-1 has-checked:ring-primary hover:border-primary/50"
          >
            <input
              type="radio"
              name="advertise_tier"
              value={tier.id}
              checked={selected === tier.id}
              onChange={() => setSelected(tier.id)}
              className="sr-only"
            />
            <span className="font-semibold">
              {tier.name} · {formatCents(tier.priceCents)}
            </span>
            <span className="text-muted-foreground">{tier.blurb}</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-lg font-semibold">Total: {formatCents(TIERS.find((t) => t.id === selected)?.priceCents ?? 0)}</span>
      </div>
    </div>
  );
}
