"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { getCookieConsent, setCookieConsent, subscribeCookieConsent } from "@/lib/cookie-consent";
import { Button } from "@/components/ui/button";

export function CookieConsentBanner() {
  // "unknown" on the server and during hydration (avoids a flash of the banner on first paint
  // before localStorage is read), then "decided" (hide) or "unset" (show).
  const status = useSyncExternalStore(
    subscribeCookieConsent,
    () => (getCookieConsent() ? "decided" : "unset"),
    () => "unknown",
  );
  // Also hides on click even if storage is blocked (private browsing) and the choice can't persist.
  const [dismissed, setDismissed] = useState(false);

  if (status !== "unset" || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] print:hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cookie className="size-4 shrink-0 text-[#e89818]" />
          We use essential cookies to keep you signed in, and would like your OK for optional
          analytics cookies that help us improve MarketitNow.{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Learn more</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCookieConsent("rejected");
              setDismissed(true);
            }}
          >
            Essential only
          </Button>
          <Button
            type="button"
            onClick={() => {
              setCookieConsent("accepted");
              setDismissed(true);
            }}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
