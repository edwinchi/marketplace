import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickClientMessages, type ROUTE_CLIENT_NAMESPACES } from "@/lib/client-messages";

type RouteNamespace = (typeof ROUTE_CLIENT_NAMESPACES)[keyof typeof ROUTE_CLIENT_NAMESPACES][number];

// Wraps client components that need a route-only translation namespace (lib/client-messages.ts),
// so that text is sent only on the page that uses it. Carries the global client namespaces too,
// so nothing depends on whether nested providers merge.
export async function RouteMessages({ namespaces, children }: { namespaces: readonly RouteNamespace[]; children: ReactNode }) {
  const messages = pickClientMessages(await getMessages(), namespaces);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
