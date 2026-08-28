"use client";

// Shows the intended pricing structure, but only "Free" actually works — Plus/Premium need
// Stripe wired up plus a real pricing decision (agents.md §10 Phase 4). Disabling them rather
// than omitting the cards entirely is deliberate: it's honest about what's not live yet instead
// of hiding the roadmap, and nothing here charges anyone without payment infrastructure to back it.
const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0.00",
    blurb: "Standard visibility",
    features: ["Listed for 4 weeks"],
    available: true,
  },
  {
    id: "plus",
    name: "Plus",
    price: "$0.99",
    blurb: "Higher visibility",
    features: ["Listed for 4 weeks", "Shown more often"],
    available: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$3.99",
    blurb: "Maximum visibility",
    features: ["Listed for 4 weeks", "Shown most often", "Boosted for 7 days"],
    available: false,
  },
];

export function AdvertiseTierSelector() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <label
            key={tier.id}
            className={
              tier.available
                ? "flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm has-checked:border-primary has-checked:ring-1 has-checked:ring-primary"
                : "relative flex flex-col gap-1 rounded-lg border p-4 text-sm opacity-60"
            }
          >
            {!tier.available && (
              <span className="absolute top-2 right-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming soon
              </span>
            )}
            <input
              type="radio"
              name="advertise_tier"
              value={tier.id}
              defaultChecked={tier.id === "free"}
              disabled={!tier.available}
              className="sr-only"
            />
            <span className="font-semibold">
              {tier.name} · {tier.price}
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
        <span className="text-lg font-semibold">Total: $0.00</span>
      </div>
    </div>
  );
}
