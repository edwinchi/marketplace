import Link from "next/link";
import { cookies } from "next/headers";
import { Home, PlusCircle, User, MessageCircle, Bell } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getUnreadMessageCount } from "@/lib/messages";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";

export async function Nav() {
  const { user, profile } = await getCurrentUserAndProfile();
  const unreadCount = profile ? await getUnreadMessageCount(profile.id) : 0;
  const [t, locale, cookieStore] = await Promise.all([getTranslations("Nav"), getLocale(), cookies()]);
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;

  return (
    <>
      <header className="border-b print:hidden">
        {/* Mobile header — a separate, purpose-built layout rather than squeezing the desktop
            row down: hamburger (secondary controls: language/currency/help links) | centered
            logo | messages+notifications (primary, stay one tap away). A 3-equal-column grid is
            what actually centers the logo regardless of the two side groups' different widths —
            flex justify-between only centers when both sides are the same width.

            fixed, not sticky: this bar's own containing block (this <header>) is only as tall as
            the bar itself on mobile (the desktop row right below is `hidden`), and `sticky` can
            only stay pinned within its containing block's height — with nothing extra to stick
            within, it just scrolls away with the page. `fixed` pins it to the viewport instead,
            with a same-height spacer directly below (`h-20`, matching py-3 + h-11 here) so it
            doesn't overlap the content that follows.

            Logo is absolutely centered on the bar rather than the middle cell of an equal
            3-column grid: the hamburger and the messages+notifications group are different
            widths, and a `minmax(0,1fr)` grid track shrinks to fit whichever is narrower —
            that was silently squashing the logo's rendered width below its natural aspect
            ratio (visually distorting it) to stay inside the tighter of the two side widths.
            Absolute positioning frees the logo from that track entirely so it renders at its
            true size, while `left-1/2 -translate-x-1/2` still centers it on the full bar
            width regardless of the side groups' differing widths. */}
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:hidden">
          <MobileNavMenu languageSwitcher={<LanguageSwitcher locale={locale} />} currencySwitcher={<CurrencySwitcher currency={displayCurrency} />} />
          <Link href="/" aria-label="AfroDeals home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* logo-compact.png: the same source artwork cropped tight to just the cart+map+
                wordmark (no swoosh underline) so it reads at full size in this shorter mobile
                bar instead of looking squeezed -- full original resolution, just trimmed. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-compact.png" alt="AfroDeals" className="h-11 w-auto" />
          </Link>
          <div className="flex items-center">
            <Link href="/messages" className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <MessageCircle className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/notifications" className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="size-5" />
            </Link>
          </div>
        </div>
        <div className="h-20 sm:hidden" aria-hidden="true" />

        {/* Desktop header — unchanged */}
        <div className="mx-auto hidden max-w-[1760px] items-center justify-between gap-4 px-4 py-3 sm:flex sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="AfroDeals home">
              {/* Plain <img>, not next/image — this is a small, rarely-changing static brand
                  asset, and Next's dynamic image-optimizer route (/_next/image) has shown
                  ETag/conditional-request staleness in dev that a source-file replacement didn't
                  bust (confirmed: the raw /logo.png and a fresh-width optimizer request both
                  returned the new file, but the browser's actual rendered request kept getting a
                  304 against old cached bytes). Serving it as-is sidesteps that whole class of bug
                  — no runtime resizing needed for a logo this size anyway. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="AfroDeals" className="h-16 w-auto" />
            </Link>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher locale={locale} />
            <CurrencySwitcher currency={displayCurrency} />
            <Link
              href="/messages"
              className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground sm:px-2"
            >
              <MessageCircle className="size-5" />
              <span className="hidden sm:inline">{t("messages")}</span>
              {unreadCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground sm:px-2"
            >
              <Bell className="size-5" />
              <span className="hidden sm:inline">{t("notifications")}</span>
            </Link>
            {user ? (
              <AccountMenu name={profile?.username || t("myAccount")} />
            ) : (
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t("signIn")}
              </Link>
            )}
            <Link href="/listings/new" className={buttonVariants({ size: "sm" })}>
              {t("postAd")}
            </Link>
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background md:hidden print:hidden">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors active:bg-muted active:text-primary">
          <Home className="size-5" />
          {t("browse")}
        </Link>
        <Link href="/listings/new" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors active:bg-muted active:text-primary">
          <PlusCircle className="size-5" />
          {t("postAdShort")}
        </Link>
        <Link
          href={user ? "/my-account" : "/login"}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors active:bg-muted active:text-primary"
        >
          <User className="size-5" />
          {user ? t("account") : t("signIn")}
        </Link>
      </nav>
    </>
  );
}
