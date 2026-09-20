// Shared between app/listings/new/analyze-photo-action.ts (server-side, authoritative -- images
// beyond this count are simply dropped there) and components/listings/new-listing-step1.tsx
// (client-side, to stop offering the "Add more" photo tile once the cap is reached). Matches the
// reference this feature was modeled on.
export const MAX_ANALYSIS_PHOTOS = 3;
