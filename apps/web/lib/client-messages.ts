// The translation namespaces client components read with useTranslations(). Only these are
// serialized into every page for the browser; the rest (Home, Terms, Safety, Help, Footer, Profile,
// Bids: ~12 KB of 26 KB in English) are only read on the server via getTranslations and were
// being shipped to every visitor for nothing. tests/client-messages.test.ts fails if a "use client"
// file uses a namespace missing here, so a new client component can't silently show raw keys.
export const CLIENT_NAMESPACES = [
  "AccountMenu",
  "AccountSidebar",
  "Auth",
  "Categories",
  "Common",
  "Feedback",
  "GetApp",
  "Listen",
  "Listing",
  "Nav",
  "Welcome",
] as const;

type Messages = Record<string, unknown>;

export function pickClientMessages(messages: Messages): Messages {
  const out: Messages = {};
  for (const ns of CLIENT_NAMESPACES) if (ns in messages) out[ns] = messages[ns];
  return out;
}
