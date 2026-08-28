"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Choice = "both" | "pickup" | "delivery";

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "both", label: "Pickup or shipping" },
  { value: "pickup", label: "Pickup only" },
  { value: "delivery", label: "Shipping only" },
];

// Renders as one 3-way choice (matching the reference) but submits the same two booleans the
// rest of the app already reads (listings.pickup_available / delivery_available) — no new schema
// needed for this restyle.
export function DeliveryOptions() {
  const [choice, setChoice] = useState<Choice>("both");

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
      <input type="hidden" name="delivery_available" value={choice === "both" || choice === "delivery" ? "on" : ""} />
    </div>
  );
}
