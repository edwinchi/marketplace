"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "welcome", label: "Welcome" },
  { id: "tips", label: "Tips" },
  { id: "buy-sell", label: "Buy & Sell" },
  { id: "pay-ship", label: "Pay & Delivery" },
  { id: "safety", label: "Safety" },
];

// position: sticky (not fixed) so it locks to the top edge once scrolled past, but still sits
// naturally in flow above the hero rather than overlapping it. IntersectionObserver drives the
// active pill as the user scrolls, rather than only reacting to clicks.
export function StickyAnchorNav() {
  const [active, setActive] = useState("welcome");
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
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-[1600px] gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active === s.id ? "bg-[#008200] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
