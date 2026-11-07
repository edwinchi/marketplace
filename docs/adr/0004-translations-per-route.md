# ADR-0004: Send translations per route, not the whole file

**Status:** Accepted (2026-11-06)

**Context:** Every page shipped the whole translation file (all namespaces) to the browser.

**Decision:** The root layout passes only `CLIENT_NAMESPACES` (`lib/client-messages.ts`).
Namespaces used by a single route are added on that route with `components/route-messages.tsx`.
Server components read any namespace with `getTranslations` and pass strings down as props.
`tests/client-messages.test.ts` fails if a client component uses a namespace that isn't sent.

**Consequences:** Compressed transfer fell 12-23% on the main pages. A new client component that
calls `useTranslations("X")` needs X added to one of the two lists, or the test fails.
