"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Heart, Handshake, List, LogOut, Search, UserCheck, Eye, Receipt } from "lucide-react";
import { signOut } from "@/app/auth/signout/actions";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    label: "Account",
    items: [{ href: "/my-account/profile", label: "Profile", icon: User }],
  },
  {
    label: "Selling",
    items: [{ href: "/my-account/my-listings", label: "My listings", icon: List }],
  },
  {
    label: "Buying",
    items: [
      { href: "/my-account/favorites", label: "Favorites", icon: Heart },
      { href: "/my-account/bids", label: "Bids", icon: Handshake },
      { href: "/my-account/saved-searches", label: "Saved searches", icon: Search },
      { href: "/my-account/favorite-sellers", label: "Preferred sellers", icon: UserCheck },
      { href: "/my-account/recently-viewed", label: "Recently viewed", icon: Eye },
      { href: "/my-account/transactions", label: "Transactions", icon: Receipt },
    ],
  },
] as const;

// Client Component specifically so usePathname() can drive the active-state highlight — the
// layout itself stays a Server Component for the auth check.
export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex flex-col gap-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-2 rounded-md py-1.5 pr-2 pl-3 text-sm transition-all duration-150 ease-out ${
                        active
                          ? "bg-[#008848]/10 font-medium text-[#008848]"
                          : "text-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#008848] transition-opacity duration-150 ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <item.icon
                        className={`size-4 shrink-0 transition-colors duration-150 ${
                          active ? "text-[#008848]" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="w-full justify-start gap-2 px-2 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </nav>
    </>
  );
}
