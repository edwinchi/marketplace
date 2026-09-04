"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const SECTION_IDS = ["welcome", "tips", "buy-sell", "pay-ship", "safety"] as const;
const NAV_KEYS: Record<(typeof SECTION_IDS)[number], string> = {
  welcome: "navWelcome",
  tips: "navTips",
  "buy-sell": "navBuySell",
  "pay-ship": "navPayDelivery",
  safety: "navSafety",
};

// position: sticky (not fixed) so it locks to the top edge once scrolled past, but still sits
// naturally in flow above the hero rather than overlapping it. IntersectionObserver drives the
// active pill as the user scrolls; a click also sets it immediately (rather than waiting for the
// scroll to land and the observer to catch up) so the "you are here" state never lags a click.
export function StickyAnchorNav() {
  const t = useTranslations("Welcome");
  const [active, setActive] = useState<string>("welcome");
  const observed = useRef(false);

  useEffect(() => {
    if (observed.current) return;
    observed.current = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-[1600px] gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
        {SECTION_IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActive(id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active === id ? "bg-[#c8f0c8] text-[#046637]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t(NAV_KEYS[id])}
          </a>
        ))}
      </div>
    </nav>
  );
}
