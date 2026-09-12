// "Today"/"Yesterday"/"N days ago" then a plain date -- the same posted-time convention real
// classifieds sites (Marktplaats: "Vandaag"/"Gisteren") use on every listing card, which MarketitNow'
// own card was missing entirely despite already querying published_at for sort order.
export function formatListingAge(publishedAt: string): string {
  const posted = new Date(publishedAt);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(posted).setHours(0, 0, 0, 0)) / dayMs);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return posted.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
