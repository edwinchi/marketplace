"use client";

import { useTransition } from "react";
import { Coins } from "lucide-react";
import { setDisplayCurrency } from "@/app/actions/set-currency";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CurrencySwitcher({ currency }: { currency: string | null }) {
  const [pending, startTransition] = useTransition();
  const value = currency ?? "native";

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        if (!next) return;
        startTransition(async () => {
          await setDisplayCurrency(next);
          window.location.reload();
        });
      }}
    >
      {/* bg-transparent: opts this compact nav control out of SelectTrigger's default light-green
          "form field" background -- it's meant to blend into the header, not read as a form field. */}
      <SelectTrigger size="sm" className="gap-1 border-none bg-transparent shadow-none">
        <Coins className="size-4 text-muted-foreground" />
        {/* "Listed price" is long enough on its own to push the mobile header into horizontal
            overflow (the same class of bug nav.tsx's Post-ad button had) — hide the label below
            sm, matching the Messages/Notifications links' icon-only mobile treatment. */}
        <SelectValue>
          {(v: string | null) => <span className="hidden sm:inline">{v === "native" ? "Listed price" : v}</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="native">Listed price</SelectItem>
        {SUPPORTED_CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
