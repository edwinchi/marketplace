// Same-site path check for every "?next=" / returnTo / notification link that we redirect to or
// render as a link. A plain startsWith("/") && !startsWith("//") check (what the app used before
// 2026-11-07) lets through paths that browsers turn into ANOTHER site: "/\evil.com" (backslash
// is read as a slash, so it becomes //evil.com) and "/<tab>/evil.com" (tabs and newlines are
// stripped from URLs). That's an open redirect (OWASP: unvalidated redirects), usable to bounce
// someone from a real marketitnow.net login link to a phishing page.
export function safeRelativePath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (!raw.startsWith("/")) return fallback;
  // Second character "/" or "\" makes it protocol-relative; control characters (tab, CR, LF and
  // the rest) are stripped by browsers, so "/\t/x" collapses to "//x".
  if (raw[1] === "/" || raw[1] === "\\") return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
