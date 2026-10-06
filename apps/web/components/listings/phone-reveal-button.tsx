"use client";

import { useState, useTransition } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { revealSellerPhone } from "@/app/listings/phone-actions";

// Reveal-on-click, gated behind an account. The number is never part of the page payload: the
// caller (app/listings/[...slug]/page.tsx) only knows whether the seller HAS one, and the click
// fetches it through revealSellerPhone (signed-in, rate-limited, one listing's seller at a time).
export function PhoneRevealButton({ listingId, className }: { listingId: string; className?: string }) {
  const t = useTranslations("Listing");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (phoneNumber) {
    return (
      <a
        href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`}
        className={className ?? "flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"}
      >
        <Phone className="size-4" />
        {phoneNumber}
      </a>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revealSellerPhone(listingId);
            if (result.phone) setPhoneNumber(result.phone);
            else setError(result.error);
          })
        }
        className={className ?? "w-full gap-1.5 transition-transform duration-150 hover:-translate-y-0.5"}
      >
        <Phone className="size-4" />
        {t("showNumber")}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
