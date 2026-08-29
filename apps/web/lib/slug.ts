const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIACRITIC_RE = /[̀-ͯ]/g;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(DIACRITIC_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Builds a decorative slug-id URL segment, e.g. "nusuk-asrar-air-freshener-spray-300ml-30306559-...".
// The id at the end is always what actually gets looked up -- the slug is cosmetic (SEO, readable
// shared links). A stale slug (title changed after the link was shared) or no slug at all (a bare
// id, e.g. an old bookmarked link) both still resolve correctly.
export function slugPath(name: string, id: string): string {
  const slug = slugify(name);
  return slug ? `${slug}-${id}` : id;
}

// Extracts the real id from a slug-id route param. Falls back to the raw param if it isn't
// slug-decorated (a bare id, or an id-shaped-enough string) so old links keep working.
export function idFromSlugParam(param: string): string {
  const match = param.match(UUID_RE);
  return match ? match[0] : param;
}

// Builds a full breadcrumb-mirroring path, e.g. for a listing under Home & Interior > Kitchen
// & Tableware: ["home-interior", "kitchen-tableware", "fruit-bowl-large-<id>"]. Only the final
// segment carries the real id -- every segment before it is purely decorative and ignored on
// lookup (see idFromSlugParam), so a stale ancestor name never breaks the link.
export function breadcrumbSlugSegments(ancestors: { name: string }[], finalName: string, finalId: string): string[] {
  return [...ancestors.map((a) => slugify(a.name)), slugPath(finalName, finalId)].filter(Boolean);
}

export function breadcrumbSlugPath(ancestors: { name: string }[], finalName: string, finalId: string): string {
  return breadcrumbSlugSegments(ancestors, finalName, finalId).join("/");
}

// Extracts the real id from a catch-all route's slug array ([...slug]) -- always the trailing
// segment, regardless of how many decorative ancestor segments precede it (or none at all).
export function idFromSlugSegments(segments: string[]): string {
  return idFromSlugParam(segments[segments.length - 1] ?? "");
}
