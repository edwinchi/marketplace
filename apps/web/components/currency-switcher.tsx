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
      <SelectTrigger size="sm" className="gap-1 border-none shadow-none">
        <Coins className="size-4 text-muted-foreground" />
        <SelectValue>{(v: string | null) => (v === "native" ? "Listed price" : v)}</SelectValue>
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
