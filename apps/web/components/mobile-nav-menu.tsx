"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Hamburger for the mobile header's secondary/infrequent controls (language, currency, help
// links) -- the primary actions (messages, notifications, account) stay directly visible in the
// bar itself rather than being buried a tap deeper. Same anchored-panel pattern as AccountMenu,
// for visual consistency, rather than a full off-canvas drawer (more moving parts than this
// content warrants).
export function MobileNavMenu({
  languageSwitcher,
  currencySwitcher,
  listenButton,
}: {
  languageSwitcher: React.ReactNode;
  currencySwitcher: React.ReactNode;
  listenButton?: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-60 rounded-xl border bg-background p-3 shadow-lg">
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Preferences</p>
          <div className="mb-3 flex flex-col gap-2">
            {languageSwitcher}
            {currencySwitcher}
            {listenButton}
          </div>
          <div className="my-2 border-t" />
          <ul className="flex flex-col gap-0.5 pt-1">
            <li>
              <Link href="/help" onClick={() => setOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                {t("helpInfo")}
              </Link>
            </li>
            <li>
              <Link href="/terms" onClick={() => setOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/safety" onClick={() => setOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                {t("safetyCenter")}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
