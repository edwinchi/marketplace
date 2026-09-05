"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateBuyerFeeSettings } from "@/app/admin/settings-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Same explicit-Save pattern as CollapsedLimitSetting -- three text fields someone is actively
// typing into, not a toggle. percent is entered as a plain number (e.g. "5" for 5%) and converted
// to/from the stored x100 integer here, so the admin never has to think in the storage format.
export function BuyerFeeSettings({ initial }: { initial: { percentX100: number; minCents: number; maxCents: number } }) {
  const [percent, setPercent] = useState(String(initial.percentX100 / 100));
  const [min, setMin] = useState(String(initial.minCents / 100));
  const [max, setMax] = useState(String(initial.maxCents / 100));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateBuyerFeeSettings(Math.round(Number(percent) * 100), Math.round(Number(min) * 100), Math.round(Number(max) * 100));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Direct Buy protection fee</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Paid by the buyer on top of the item price — the seller always receives the full price. Mirrors Marktplaats&apos; Kopersbescherming model.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Percent</Label>
          <div className="flex items-center gap-1">
            <Input type="number" min={0} step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} className="w-20" />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Minimum</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">€</span>
            <Input type="number" min={0} step="0.01" value={min} onChange={(e) => setMin(e.target.value)} className="w-24" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Maximum</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">€</span>
            <Input type="number" min={0} step="0.01" value={max} onChange={(e) => setMax(e.target.value)} className="w-24" />
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
