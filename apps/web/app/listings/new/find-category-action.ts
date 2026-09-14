"use server";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type CategoryMatch = { id: string; name: string; parentLabel: string | null };

// Keyword substring match against category names (e.g. "shirt" in a title matches "T-shirts") —
// not true semantic matching (that's the AI-assisted listing flow in agents.md §10 Phase 2), but
// a real, working approximation rather than nothing. Matching itself stays against the English
// names (that's what the substring search is actually built against, regardless of what language
// the visitor typed their title in) -- only the labels shown back to the visitor are resolved to
// their own locale, falling back to English wherever a translation doesn't exist yet.
export async function findCategoryMatches(title: string): Promise<CategoryMatch[]> {
  const words = Array.from(new Set(title.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter((w) => w.length >= 3)));
  if (!words.length) return [];

  const supabase = await createClient();
  const orFilter = words.map((w) => `name.ilike.%${w}%`).join(",");

  const { data: matches } = await supabase
    .from("category_translations")
    .select("category_id, name, categories!inner(parent_id, is_active, allows_listings)")
    .eq("language_code", "en")
    .eq("categories.is_active", true)
    .eq("categories.allows_listings", true)
    .or(orFilter)
    .limit(5);

  if (!matches?.length) return [];

  const parentIds = matches
    .map((m) => (Array.isArray(m.categories) ? m.categories[0]?.parent_id : m.categories?.parent_id))
    .filter((id): id is string => !!id);
  const matchIds = matches.map((m) => m.category_id);

  const { data: parentNames } = parentIds.length
    ? await supabase.from("category_translations").select("category_id, name").eq("language_code", "en").in("category_id", parentIds)
    : { data: [] };
  const parentNameById = new Map((parentNames ?? []).map((p) => [p.category_id, p.name]));

  const locale = await getLocale();
  const localizedNameById = new Map<string, string>();
  if (locale !== "en") {
    const allIds = Array.from(new Set([...matchIds, ...parentIds]));
    const { data: localized } = await supabase
      .from("category_translations")
      .select("category_id, name")
      .eq("language_code", locale)
      .in("category_id", allIds);
    for (const row of localized ?? []) localizedNameById.set(row.category_id, row.name);
  }

  return matches.map((m) => {
    const cat = Array.isArray(m.categories) ? m.categories[0] : m.categories;
    const parentId = cat?.parent_id ?? null;
    const parentEnName = parentId ? (parentNameById.get(parentId) ?? null) : null;
    return {
      id: m.category_id,
      name: localizedNameById.get(m.category_id) ?? m.name,
      parentLabel: parentId ? (localizedNameById.get(parentId) ?? parentEnName) : null,
    };
  });
}
