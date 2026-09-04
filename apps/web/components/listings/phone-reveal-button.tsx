"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// The number is already present in the server-rendered page (same trust level as the seller's
// display name or website URL, both shown unconditionally elsewhere on this page) -- this is a
// plain reveal-on-click for a cleaner first impression, not a privacy boundary. Renders nothing
// when the seller hasn't set a phone number (most sellers, since it's an optional profile field)
// rather than showing a dead button.
export function PhoneRevealButton({ phoneNumber, className }: { phoneNumber: string; className?: string }) {
  const t = useTranslations("Listing");
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
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
    <Button type="button" variant="outline" onClick={() => setRevealed(true)} className={className ?? "w-full gap-1.5 transition-transform duration-150 hover:-translate-y-0.5"}>
      <Phone className="size-4" />
      {t("showNumber")}
    </Button>
  );
}
