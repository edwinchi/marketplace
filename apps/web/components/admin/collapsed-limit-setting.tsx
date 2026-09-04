"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateCategoryGroupCollapsedLimit } from "@/app/admin/settings-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Unlike the boolean toggles elsewhere on this page (which save instantly on click), this is a
// text field someone is actively typing into -- an explicit Save avoids writing to the database on
// every keystroke, and lets a bad in-progress value (empty, out of range) get corrected before
// anything is persisted. Applies site-wide the moment it's saved: every category page reads this
// value fresh from numeric_settings on each request (see components/category-group-card.tsx).
export function CollapsedLimitSetting({ initial }: { initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const count = Number(value);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateCategoryGroupCollapsedLimit(count);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Subcategories shown before "Show more"</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Applies to every subcategory group card, site-wide (e.g. the group cards on a category page like Services &amp; Tradespeople).
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={50}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24"
        />
        <Button type="button" size="sm" onClick={save} disabled={pending || !value.trim()}>
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
