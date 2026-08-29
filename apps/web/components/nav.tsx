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
import { cn } from "@/lib/utils";

export async function Nav() {
  const { user, profile } = await getCurrentUserAndProfile();
  const unreadCount = profile ? await getUnreadMessageCount(profile.id) : 0;
  const [t, locale, cookieStore] = await Promise.all([getTranslations("Nav"), getLocale(), cookies()]);
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;

  return (
    <>
      <header className="border-b print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
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
            {/* Hidden on mobile — the fixed bottom nav already has a dedicated "Post ad" entry,
                and this button was the main cause of header overflow on narrow viewports.
                buttonVariants() called standalone (not through <Button>) never runs through cn()'s
                tailwind-merge dedup, so its own base `inline-flex` was silently beating this
                `hidden` in Tailwind's generated CSS order -- explicitly merging with cn() here
                fixes that instead of relying on cva's plain string concatenation. */}
            <Link href="/listings/new" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
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
