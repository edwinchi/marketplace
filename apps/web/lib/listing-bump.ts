// Shared between app/listings/bump-actions.ts (server-side, authoritative -- also enforced
// independently in bump_listing's own check, supabase/migrations/20260101007500_listing_bump.sql)
// and components/listing-row-actions.tsx (client-side, for the "time left" display only). Keep
// this in sync with that migration's `interval '24 hours'` if it ever changes.
export const BUMP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
