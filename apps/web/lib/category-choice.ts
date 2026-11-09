// Pure helpers for the AI category pick (lib/ai-category-pick.ts): the prompts and the parsing of
// the model's replies. Kept free of server imports so tests can load them directly.

// Merges several ranked id lists into one, keeping first-seen order and dropping repeats.
export function mergeShortlists(lists: string[][], max: number): string[] {
  const out: string[] = [];
  for (const list of lists) for (const id of list) if (!out.includes(id) && out.length < max) out.push(id);
  return out;
}

// Words of a typed title worth a keyword search: lower-case letters and digits (accents kept),
// 3+ characters, no repeats.
export function titleKeywords(title: string): string[] {
  const words = title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
  return Array.from(new Set(words)).slice(0, 8);
}

// True when one of the category name's words starts with the keyword ("shirt" -> "T-shirts"), so a
// keyword hidden inside another word ("het" in "Sachets") doesn't count.
export function keywordMatchesName(keyword: string, categoryName: string): boolean {
  return categoryName
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .some((w) => w.startsWith(keyword));
}

// Asks for the kind of item behind a typed title ("Roman van Herman Koch" -> "novel"). Category
// search on that short English phrase finds the right branch far more often than on the title,
// whose brand, place and film names pull it towards categories that share the name.
export function buildItemPrompt(title: string): string {
  return `A seller on a classifieds site typed this listing title (any language): "${title.slice(0, 120)}"
What kind of item is it? Respond with ONLY JSON: {"item": "1-4 word generic English name, e.g. \\"paperback novel\\", \\"smartphone\\", \\"winter tyres\\""}`;
}

export function parseItemReply(text: string | null): string | null {
  if (!text) return null;
  // Regex rather than JSON.parse: some models wrap the JSON in reasoning text or code fences.
  const item = /"item"\s*:\s*"([^"]{1,60})"/.exec(text)?.[1]?.trim();
  return item ? item : null;
}

export function buildCategoryPickPrompt(listing: { title: string; description?: string; item?: string | null }, candidatePaths: string[]): string {
  const lines = candidatePaths.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `Pick the best category for this classifieds listing.
${listing.item ? `Item: ${listing.item}\n` : ""}Title: ${listing.title.slice(0, 120)}
${listing.description ? `Description: ${listing.description.slice(0, 400)}\n` : ""}
Categories:
${lines}

Choose the most specific category describing WHAT THE ITEM IS (a book goes under Books even if it mentions a place, film or brand). Respond with ONLY JSON: {"choice": <number>}`;
}

// The model's pick as a 0-based index into the candidate list, or null when the reply has no valid
// number -- the caller then keeps the plain similarity order, so a bad reply can never produce a
// category that wasn't on the list.
export function parseCategoryChoice(text: string | null, candidateCount: number): number | null {
  if (!text) return null;
  const match = /"choice"\s*:\s*"?(\d+)/.exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 1 && n <= candidateCount ? n - 1 : null;
}
