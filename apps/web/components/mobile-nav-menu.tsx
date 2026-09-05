"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, MessageCircle, Bell, User, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

// Hamburger for the mobile header's secondary controls. Messages/Notifications/Account/Post an ad
// also live one tap away in their own fixed bar just under the header (see nav.tsx) -- they're
// repeated here too as a deliberate second path to the same destinations, since a hamburger menu
// is the more familiar place to look for them and this list costs nothing extra to include. Same
// anchored-panel pattern as AccountMenu, for visual consistency, rather than a full off-canvas
// drawer (more moving parts than this content warrants).
export function MobileNavMenu({
  languageSwitcher,
  currencySwitcher,
  signedIn,
  accountName,
  unreadCount,
}: {
  languageSwitcher: React.ReactNode;
  currencySwitcher: React.ReactNode;
  signedIn: boolean;
  accountName: string;
  unreadCount: number;
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
        <div className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border bg-background p-3 shadow-lg">
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Quick access</p>
          <ul className="mb-3 flex flex-col gap-0.5">
            <li>
              <Link href="/messages" onClick={() => setOpen(false)} className="relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                <MessageCircle className="size-4 text-muted-foreground" />
                {t("messages")}
                {unreadCount > 0 && (
                  <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                <Bell className="size-4 text-muted-foreground" />
                {t("notifications")}
              </Link>
            </li>
            <li>
              <Link href={signedIn ? "/my-account/profile" : "/login"} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                <User className="size-4 text-muted-foreground" />
                {signedIn ? accountName : t("signIn")}
              </Link>
            </li>
            <li>
              <Link href="/listings/new" onClick={() => setOpen(false)} className="mt-1.5 flex items-center justify-center gap-2 rounded-lg bg-[#008200] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006800]">
                <Megaphone className="size-4" />
                {t("postAd")}
              </Link>
            </li>
          </ul>
          <div className="mb-2 border-t" />
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Preferences</p>
          <div className="mb-3 flex flex-col gap-2">
            {languageSwitcher}
            {currencySwitcher}
          </div>
          <div className="my-2 border-t" />
          <ul className="flex flex-col gap-0.5 pt-1">
            <li>
              <Link href="/welcome" onClick={() => setOpen(false)} className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]">
                {t("howItWorks")}
              </Link>
            </li>
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
