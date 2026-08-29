// listing_media.storage_key holds either a real Supabase Storage object path (once photo upload
// exists) or, for now, a full external URL (demo/seed data — scripts/seed-demo-listings.mjs).
// This resolves either into a usable <Image> src without needing a schema change for the demo
// case. Remove the http passthrough once real uploads are the only source.
export function resolveMediaUrl(storageKey: string, supabaseUrl: string): string {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) return storageKey;
  return `${supabaseUrl}/storage/v1/object/public/listings/${storageKey}`;
}

// Category gallery photos always live in Supabase Storage (no demo/external-URL case, unlike
// listing photos) -- sourced and uploaded by scripts/source-category-photos, never user-supplied.
export function resolveCategoryPhotoUrl(storageKey: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/category-photos/${storageKey}`;
}
