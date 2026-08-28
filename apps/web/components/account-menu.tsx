"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, User, List, Heart, Handshake, Search, UserCheck, Eye, Star, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/signout/actions";
import { Button, buttonVariants } from "@/components/ui/button";

const MENU_ITEMS = [
  { href: "/my-account/profile", key: "profile" as const, icon: User },
  { href: "/my-account/my-listings", key: "myListings" as const, icon: List },
  { href: "/my-account/favorites", key: "favorites" as const, icon: Heart },
  { href: "/my-account/bids", key: "bids" as const, icon: Handshake },
  { href: "/my-account/saved-searches", key: "savedSearches" as const, icon: Search },
  { href: "/my-account/favorite-sellers", key: "preferredSellers" as const, icon: UserCheck },
  { href: "/my-account/recently-viewed", key: "recentlyViewed" as const, icon: Eye },
  { href: "/experiences/my-reviews", key: "myExperiences" as const, icon: Star },
];

export function AccountMenu({ name }: { name: string }) {
  const t = useTranslations("AccountMenu");
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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5 px-1.5 transition-all duration-150 hover:-translate-y-0.5 sm:px-2" })}
      >
        <User className="size-4" />
        <span className="max-w-20 truncate sm:max-w-none">{name}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-56 rounded-xl border bg-background p-1.5 shadow-lg">
          <ul className="flex flex-col">
            {MENU_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-[#008848]/10 hover:text-[#008848]"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-1.5 border-t" />

          <form action={signOut}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="w-full justify-start gap-2.5 px-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
