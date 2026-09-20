// Shared between app/listings/homepage-placement-actions.ts (server-side, authoritative -- also the
// default baked into extend_homepage_placement's own signature, supabase/migrations/
// 20260101008300_homepage_placement.sql) and components/listing-row-actions.tsx (client-side, for
// the "days left" display only). Keep this in sync with that migration's default if it ever changes.
export const HOMEPAGE_PLACEMENT_DAYS = 3;
