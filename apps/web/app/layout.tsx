import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Carlito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Body text stack, wired into --font-sans in globals.css. Real Calibri isn't a licensable webfont
// (it's bundled with Windows/Office, not something a site can legally embed), so instead of faking
// it with @font-face this loads Carlito -- Google's own metric-compatible, freely-licensed
// substitute for Calibri, purpose-built so text sets identically line-for-line. Anyone who already
// has real Calibri installed (most Windows/Office users) sees actual Calibri per the font-family
// order in globals.css; everyone else gets Carlito, which reads the same.
const carlito = Carlito({
  variable: "--font-carlito",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Headings only — a warm, confident serif with real presence (variable weight/optical size),
// paired against Geist Sans body text rather than using one neutral face for everything.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "AfroDeals",
  description: "Buy and sell across African markets.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${carlito.variable} h-full antialiased`}
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
