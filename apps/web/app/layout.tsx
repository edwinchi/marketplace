import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Roboto } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/request";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { VisitTracker } from "@/components/visit-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Body text stack, wired into --font-sans in globals.css. Confirmed by pulling Marktplaats' own
// Fonts.css directly (not guessed from screenshots) -- they load Roboto for body/UI text and Bree
// Serif for their branded headings. Adopting Roboto here for the same reason they use it: it's
// extremely well-hinted at small sizes (this project's dense listing-card grid leans on that),
// freely licensed, and a proven choice at marketplace scale -- a strictly better pick than Calibri,
// which also required a Carlito substitute since real Calibri can't be legally webfont-embedded.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Headings only — a warm, confident serif with real presence (variable weight/optical size),
// paired against Geist Sans body text rather than using one neutral face for everything.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://marketitnow.net"),
  title: { default: "MarketitNow", template: "%s | MarketitNow" },
  description: "Buy and sell from anywhere in the world.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={isRtlLocale(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning on both html and body — browser extensions (Grammarly, QuillBot,
          and similar) inject attributes like data-gr-ext-installed before React hydrates, which
          otherwise logs a hydration-mismatch warning and, worse, can make React discard and
          remount the tree — losing in-flight state like a pending form submission. This only
          silences the mismatch warning for these two elements' own attributes; it doesn't hide
          real hydration bugs elsewhere in the tree. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider>
          <Nav />
          {/* pb-20 keeps content clear of the fixed cookie banner (~72px tall) while it's showing;
              harmless empty space once it's dismissed. */}
          <main className="flex flex-1 flex-col pb-20">{children}</main>
          <Footer />
          <CookieConsentBanner />
          <VisitTracker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
