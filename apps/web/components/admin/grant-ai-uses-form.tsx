"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { grantAiBonusUses } from "@/app/admin/grant-ai-uses-action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Instant-feedback form, not an instant-save toggle -- two numeric fields with real validation
// (does this account exist, is amount a real number), so an explicit Grant action makes more sense
// than firing on every keystroke.
export function GrantAiUsesForm() {
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("50");
  const [result, setResult] = useState<{ error: string | null; newTotal: number | null; accountName: string | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function grant() {
    setResult(null);
    startTransition(async () => {
      const res = await grantAiBonusUses(Number(accountNumber), Number(amount));
      setResult(res);
    });
  }

  return (
    <div className="py-2">
      <p className="text-sm font-medium">Grant AI bonus uses</p>
      <p className="mt-1 text-xs text-muted-foreground">
        One-off exception for a specific account (e.g. a trial) — adds to their existing bonus uses, same as a
        real top-up. Doesn&apos;t touch their subscription status, so they fall back to normal billing on their
        own once these run out.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={1}
          placeholder="Account #"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-28"
        />
        <Input
          type="number"
          placeholder="Uses"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24"
        />
        <Button type="button" size="sm" onClick={grant} disabled={pending || !accountNumber.trim() || !amount.trim()}>
          {pending ? "Granting…" : "Grant"}
        </Button>
        {result?.newTotal != null && (
          <span className="flex items-center gap-1 text-xs font-medium text-[#046637]">
            <Check className="size-3.5" /> {result.accountName} now has {result.newTotal} bonus uses
          </span>
        )}
      </div>
      {result?.error && <p className="mt-1.5 text-xs text-destructive">{result.error}</p>}
    </div>
  );
}
