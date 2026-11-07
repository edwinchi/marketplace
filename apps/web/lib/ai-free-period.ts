// Free AI period (owner decision, 2026-11-07): for six months every signed-in account gets every
// AI feature free and unlimited -- photo autofill, description polish, price suggestion, listing
// translation, seller insights and Listen. When the period ends, the paid tiers (Seller Pro, top-ups,
// 5 free photo autofills) apply again automatically: every check below compares against the clock,
// so nothing needs to be switched off by hand.
//
// What it does NOT include: Seller Pro's "every new listing notifies every registered user" perk.
// That's a broadcast to all users, not AI, and stays on its own admin toggle.
//
// To end it early or extend it, set AI_FREE_PERIOD_ENDS_AT (an ISO date-time) in Vercel; an unset
// or unparseable value falls back to the date below.
export const AI_FREE_PERIOD_STARTED_AT = "2026-11-07T00:00:00+01:00";
const AI_FREE_PERIOD_DEFAULT_END = "2027-05-07T00:00:00+02:00"; // midnight Amsterdam time (CEST)

export function getAiFreePeriodEnd(): Date {
  const fallback = new Date(AI_FREE_PERIOD_DEFAULT_END);
  const raw = process.env.AI_FREE_PERIOD_ENDS_AT?.trim();
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function isAiFreePeriodActive(now: Date = new Date()): boolean {
  return now.getTime() < getAiFreePeriodEnd().getTime();
}

// Per-account fair-use ceiling on photo autofill while it's free: unlimited for real sellers
// (nobody lists 40 items a day by hand) while capping what one scripted account can cost once the
// free model pool is exhausted and calls fall through to the paid fallback (lib/ai-providers.ts).
// The text features already have their own 20/hour limits.
export const AI_FREE_PERIOD_PHOTO_DAILY_LIMIT = 40;
