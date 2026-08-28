"use server";

import { createClient } from "@/lib/supabase/server";

export type CategoryMatch = { id: string; name: string; parentLabel: string | null };

// Keyword substring match against category names (e.g. "shirt" in a title matches "T-shirts") —
// not true semantic matching (that's the AI-assisted listing flow in agents.md §10 Phase 2), but
// a real, working approximation rather than nothing.
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

  const { data: parentNames } = parentIds.length
    ? await supabase.from("category_translations").select("category_id, name").eq("language_code", "en").in("category_id", parentIds)
    : { data: [] };
  const parentNameById = new Map((parentNames ?? []).map((p) => [p.category_id, p.name]));

  return matches.map((m) => {
    const cat = Array.isArray(m.categories) ? m.categories[0] : m.categories;
    return { id: m.category_id, name: m.name, parentLabel: cat?.parent_id ? (parentNameById.get(cat.parent_id) ?? null) : null };
  });
}
