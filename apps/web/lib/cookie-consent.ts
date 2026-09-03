// Client-side cookie consent state -- localStorage only, no cookie of its own, no server round
// trip needed for a preference this simple. Supabase's own auth cookies are essential (the site
// can't function without a session) and were never conditional on this; what this actually gates
// is optional analytics (PostHog, once NEXT_PUBLIC_POSTHOG_KEY exists -- see
// components/analytics-loader.tsx) and nothing else exists to gate yet.
const STORAGE_KEY = "afrodeals-cookie-consent";

export type CookieConsent = "accepted" | "rejected";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(value: CookieConsent): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
  } catch {
    // Private browsing / storage blocked -- consent just won't persist across reloads, not fatal.
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "accepted";
}
