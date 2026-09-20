"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = "both" | "pickup" | "delivery";

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "both", label: "Pickup or shipping" },
  { value: "pickup", label: "Pickup only" },
  { value: "delivery", label: "Shipping only" },
];

// Renders as one 3-way choice (matching the reference) but submits the same two booleans the
// rest of the app already reads (listings.pickup_available / delivery_available) — no new schema
// needed for this restyle.
//
// Deliberately no carrier selector (Budbee/PostNL/DHL, matching the reference this was requested
// from) -- named carrier integration needs a real signed account with that carrier first, already
// documented as out of scope (agents.md Phase 3). Just a plain shipping cost the seller sets
// themselves, same as the reference's own "Verzendkosten" amount field.
export function DeliveryOptions({ currencyCode, defaultShippingCost }: { currencyCode: string; defaultShippingCost?: string }) {
  const [choice, setChoice] = useState<Choice>("both");
  const shipsFromHere = choice === "both" || choice === "delivery";

  return (
    <div>
      <div className="flex flex-col gap-2 rounded-lg border p-1">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
              choice === opt.value && "bg-accent",
            )}
          >
            <input type="radio" name="delivery_choice" checked={choice === opt.value} onChange={() => setChoice(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
      <input type="hidden" name="pickup_available" value={choice === "both" || choice === "pickup" ? "on" : ""} />
      <input type="hidden" name="delivery_available" value={shipsFromHere ? "on" : ""} />
      {shipsFromHere && (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="shipping_cost">Shipping cost ({currencyCode})</Label>
          <Input
            id="shipping_cost"
            name="shipping_cost"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={defaultShippingCost}
            className="sm:w-40"
          />
          <p className="text-xs text-muted-foreground">Leave blank or 0 for free shipping.</p>
        </div>
      )}
    </div>
  );
}
