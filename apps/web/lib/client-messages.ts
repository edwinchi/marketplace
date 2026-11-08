// The translation namespaces client components read with useTranslations(). Only these are
// serialized into every page for the browser; the rest (Home, Terms, Safety, Help, Footer, Profile,
// Bids) are only read on the server via getTranslations and were being shipped to every visitor
// for nothing. tests/client-messages.test.ts fails if a "use client" file uses a namespace missing
// here, so a new client component can't silently show raw keys.
export const CLIENT_NAMESPACES = [
  "AccountMenu",
  "AccountSidebar",
  "Auth",
  "Categories",
  "Common",
  "CookieConsent",
  "Feedback",
  "IntroVideo",
  "Listen",
  "Listing",
  "Nav",
] as const;

// Namespaces whose client components live on ONE route only: sent just there, via a nested
// NextIntlClientProvider in that page (global + these). The test checks the components using
// them are imported only from that route's folder.
export const ROUTE_CLIENT_NAMESPACES = {
  welcome: ["Welcome"], // app/welcome: floating-cta-bar, sticky-anchor-nav (6.2 KB in English)
  app: ["GetApp"], // app/app: pwa/install-app (1.8 KB)
} as const;

type Messages = Record<string, unknown>;

export function pickClientMessages(messages: Messages, routeNamespaces: readonly string[] = []): Messages {
  const out: Messages = {};
  for (const ns of [...CLIENT_NAMESPACES, ...routeNamespaces]) if (ns in messages) out[ns] = messages[ns];
  return out;
}
