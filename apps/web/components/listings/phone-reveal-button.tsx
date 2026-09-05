"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Reveal-on-click for a cleaner first impression, gated behind an account -- the caller (see
// app/listings/[...slug]/page.tsx) only passes the real phoneNumber prop when signed in, so an
// anonymous visitor's page never even receives the number to reveal.
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
