"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateAdBumpPrice } from "@/app/admin/settings-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Same explicit-Save pattern as BuyerFeeSettings -- a single price field, entered in euros and
// converted to/from the stored cents integer here.
export function AdBumpPriceSetting({ initial }: { initial: { priceCents: number } }) {
  const [price, setPrice] = useState(String(initial.priceCents / 100));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateAdBumpPrice(Math.round(Number(price) * 100));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Listing bump price</p>
      <p className="mt-1 text-xs text-muted-foreground">
        What a seller pays to move their own active listing back to the top of recency-sorted feeds. Once every 24h per listing.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Price</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">€</span>
            <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24" />
          </div>
        </div>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-[#046637]">
            <Check className="size-3.5" /> Saved
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
