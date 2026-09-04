"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getCookieConsent } from "@/lib/cookie-consent";

// Fixed to the bottom of the viewport for the whole page -- this page's one persistent conversion
// driver, visible at every scroll depth. Offsets itself above the cookie-consent banner (also
// fixed-bottom, z-50) while that's still showing, using the same localStorage read + change event
// cookie-consent-banner.tsx already dispatches, rather than duplicating consent state.
export function FloatingCtaBar() {
  const [bannerShowing, setBannerShowing] = useState(false);

  useEffect(() => {
    setBannerShowing(!getCookieConsent());
    const onChange = () => setBannerShowing(false);
    window.addEventListener("cookie-consent-change", onChange);
    return () => window.removeEventListener("cookie-consent-change", onChange);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 z-40 border-t bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-[bottom] duration-200 print:hidden ${
        bannerShowing ? "bottom-[72px]" : "bottom-0"
      }`}
    >
      <div className="mx-auto flex max-w-md justify-center">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#046637] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#03502c]"
        >
          <Search className="size-4" />
          Start searching AfroDeals
        </Link>
      </div>
    </div>
  );
}
