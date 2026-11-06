"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

// Nav itself is an async Server Component (fetches the user/profile/unread count), so the
// "which page am I on" check needed for active-state highlighting is pulled out into this small
// client component rather than converting the whole header to client. Light-green "you are here"
// treatment, distinct from the solid Heineken green used for action buttons -- same convention
// established on /welcome's sticky section nav.
export function NavIconLink({
  href,
  className,
  // "!" because callers pass their own text colour (text-muted-foreground) and the two classes tied:
  // the grey won, giving 4.4:1 on the green highlight (axe 2026-11-06). Dark green is 7:1.
  activeClassName = "bg-[#c8f0c8] !text-[#046637]",
  ...props
}: ComponentProps<typeof Link> & { activeClassName?: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className ?? ""} ${active ? activeClassName : ""}`}
      {...props}
    />
  );
}
