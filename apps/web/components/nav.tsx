import Link from "next/link";
import { cookies } from "next/headers";
import { Home, PlusCircle, User, MessageCircle, Bell, Megaphone } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getUnreadMessageCount } from "@/lib/messages";
import { getDisabledLocales } from "@/lib/language-settings";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { NavIconLink } from "@/components/nav-icon-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";

export async function Nav() {
  const { user, profile } = await getCurrentUserAndProfile();
  const unreadCount = profile ? await getUnreadMessageCount(profile.id) : 0;
  const [t, locale, cookieStore, disabledLocales] = await Promise.all([getTranslations("Nav"), getLocale(), cookies(), getDisabledLocales()]);
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;

  return (
    <>
      {/* sticky lives on <header> itself, not the desktop bar div below -- position:sticky can
          only "stick" within room its own parent box provides, and <header>'s in-flow desktop
          content is exactly that one div's height (the mobile bar is `fixed`, out of flow; the
          spacer is mobile-only), so putting sticky on the child left it with zero room to hold as
          the page scrolled -- confirmed live: its getBoundingClientRect().top tracked the scroll
          offset 1:1 instead of clamping to 0. <header>'s real parent is <body>, plenty taller. */}
      <header className="sticky top-0 z-30 print:hidden">
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
          <MobileNavMenu
            languageSwitcher={<LanguageSwitcher locale={locale} disabledLocales={[...disabledLocales]} />}
            currencySwitcher={<CurrencySwitcher currency={displayCurrency} />}
            signedIn={!!user}
            accountName={profile?.username || t("myAccount")}
            unreadCount={unreadCount}
          />
          <Link href="/" aria-label="AfroDeals home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* logo-compact.png: the same source artwork cropped tight to just the cart+map+
                wordmark (no swoosh underline) so it reads at full size in this shorter mobile
                bar instead of looking squeezed -- full original resolution, just trimmed. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-compact.png" alt="AfroDeals" className="h-11 w-auto" />
          </Link>
          <div className="flex items-center">
            <NavIconLink href="/messages" className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <MessageCircle className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavIconLink>
            <NavIconLink href="/notifications" className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="size-5" />
            </NavIconLink>
          </div>
        </div>
        <div className="h-20 sm:hidden" aria-hidden="true" />

        {/* Mobile quick-access bar — fixed directly under the header (not part of the page's
            scroll flow), so Messages/Notifications/Account/Post an ad stay one tap away exactly
            like the desktop header keeps them, instead of requiring a trip back to the top or into
            the hamburger menu. `top-20` sits it flush against the header's own real height (the
            h-20 spacer above); its own height is reserved below by the h-14 spacer, the same
            two-spacer pairing the header itself already relies on.

            The inner row scrolls horizontally (own scrollbar hidden) rather than wrapping or
            shrinking its labels -- four full-width labels don't reliably fit a phone's width once
            translated (French/Arabic run longer than English), and clipping the last item off the
            edge silently, which a plain `flex` row would do here, is worse than an occasional
            one-finger swipe. Account is a plain link, not the dropdown <AccountMenu> desktop uses:
            that menu's panel is `absolute`, and this row's own `overflow-x-auto` would clip it
            vertically the moment the row scrolls, since setting overflow on one axis resolves the
            other to `auto` too. */}
        <div className="fixed inset-x-0 top-20 z-20 border-b bg-background/95 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-md sm:hidden">
          {/* Right-edge fade instead of a hard cut -- signals "more to scroll" the way a native
              carousel does, rather than reading as content silently clipped by the viewport. */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [scrollbar-width:none] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/messages"
              className="relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted active:text-foreground"
            >
              <MessageCircle className="size-4" />
              {t("messages")}
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/notifications"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted active:text-foreground"
            >
              <Bell className="size-4" />
              {t("notifications")}
            </Link>
            <Link
              href={user ? "/my-account/profile" : "/login"}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted active:text-foreground"
            >
              <User className="size-4" />
              <span className="max-w-20 truncate">{user ? profile?.username || t("myAccount") : t("signIn")}</span>
            </Link>
            <Link
              href="/listings/new"
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[#008200] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95 active:bg-[#006800]"
            >
              <Megaphone className="size-3.5" />
              {t("postAd")}
            </Link>
          </div>
        </div>
        <div className="h-14 sm:hidden" aria-hidden="true" />

        {/* Desktop header — sticky (not just the mobile bar) so it stays visible while scrolling
            any page, not only /welcome's own in-page sticky section nav. The sticky/border/bg
            layer is this full-width outer div, with the max-w-[1600px] content constraint as an
            inner child -- a position:sticky element still occupies its original space in normal
            flow, so putting the width cap directly on the sticky element would leave the excess
            viewport width beside it (on any screen wider than 1600px) uncovered by any
            background, letting scrolled-past page content show through there while stuck. */}
        <div className="hidden border-b bg-background sm:block">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
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
              {/* Hidden below md, not just sm: the utility row on the right (language, currency,
                  messages, notifications, account, Post an ad) already shows icon labels from
                  sm upward, so this tier is its most crowded -- giving this link its own, later
                  breakpoint keeps it from fighting that row for space on a tablet-width screen. */}
              <Link href="/welcome" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-block">
                {t("howItWorks")}
              </Link>
            </div>
            <nav className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher locale={locale} disabledLocales={[...disabledLocales]} />
              <CurrencySwitcher currency={displayCurrency} />
              <NavIconLink
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
              </NavIconLink>
              <NavIconLink
                href="/notifications"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground sm:px-2"
              >
                <Bell className="size-5" />
                <span className="hidden sm:inline">{t("notifications")}</span>
              </NavIconLink>
              {user ? (
              <AccountMenu name={profile?.username || t("myAccount")} />
            ) : (
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {t("signIn")}
              </Link>
            )}
            {/* The single most important button on the page -- posting an ad is where every seller's
                journey (and every future transaction) begins, so it gets real visual weight instead
                of blending in with the utility icons next to it. */}
            <Link
              href="/listings/new"
              className={buttonVariants({
                className: "ml-1 h-11 gap-2 rounded-full px-5 text-sm font-semibold shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md",
              })}
            >
              <Megaphone className="size-4.5" />
              {t("postAd")}
            </Link>
            </nav>
          </div>
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
