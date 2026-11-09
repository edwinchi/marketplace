"use server";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { describeItem, rankCategories } from "@/lib/ai-category-pick";
import { checkRateLimit } from "@/lib/rate-limit";
import { keywordMatchesName, titleKeywords } from "@/lib/category-choice";

export type CategoryMatch = { id: string; name: string; parentLabel: string | null };

const MAX_MATCHES = 5;
// Each search makes two small text-model calls plus two embeddings. Past this, a seller still gets
// suggestions, just from the embeddings alone.
const AI_SEARCHES_PER_HOUR = 40;

// Suggestions for the title a seller typed on step 1 of posting an ad.
//
// Was a substring match of every 3+ letter word against the English names only, so a Dutch title
// matched by accident ("het" is inside "Sachets": a novel was offered "Sugar Sachets") and almost
// never on purpose. Now: the same shortlist-and-pick as the AI photo analysis (lib/ai-category-pick.ts),
// on a short English "what is it" phrase for the title, which works for titles in any language.
// The keyword search is only the fallback for when embeddings are unavailable.
export async function findCategoryMatches(title: string): Promise<CategoryMatch[]> {
  const trimmed = title.trim().slice(0, 120);
  if (trimmed.length < 3) return [];
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return [];

  const useModel = await checkRateLimit(`category-search:${profile.id}`, AI_SEARCHES_PER_HOUR, 3600);
  const item = useModel ? await describeItem(trimmed) : null;
  let ids = (await rankCategories({ title: trimmed, item }, { useModel })).slice(0, MAX_MATCHES);
  if (!ids.length) ids = await keywordCategoryIds(trimmed);
  if (!ids.length) return [];

  return labelMatches(ids);
}

// Whole-word matches (a name word starting with a title word, so "shirt" still finds "T-shirts")
// in the visitor's own language and in English.
async function keywordCategoryIds(title: string): Promise<string[]> {
  const words = titleKeywords(title);
  if (!words.length) return [];
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase
    .from("category_translations")
    .select("category_id, name, categories!inner(is_active, allows_listings)")
    .in("language_code", locale === "en" ? ["en"] : ["en", locale])
    .eq("categories.is_active", true)
    .eq("categories.allows_listings", true)
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .limit(200);
  const ids: string[] = [];
  for (const row of data ?? []) {
    if (ids.length >= MAX_MATCHES) break;
    if (!ids.includes(row.category_id) && words.some((w) => keywordMatchesName(w, row.name))) ids.push(row.category_id);
  }
  return ids;
}

// Names (and parent names) in the visitor's language, falling back to English, in the given order.
async function labelMatches(ids: string[]): Promise<CategoryMatch[]> {
  const supabase = await createClient();
  const { data: cats } = await supabase.from("categories").select("id, parent_id").in("id", ids);
  const parentById = new Map((cats ?? []).map((c) => [c.id, c.parent_id as string | null]));
  const allIds = Array.from(new Set([...ids, ...[...parentById.values()].filter((p): p is string => !!p)]));
  const locale = await getLocale();
  const { data: names } = await supabase
    .from("category_translations")
    .select("category_id, name, language_code")
    .in("language_code", locale === "en" ? ["en"] : ["en", locale])
    .in("category_id", allIds);
  const nameOf = (id: string) => {
    const rows = (names ?? []).filter((n) => n.category_id === id);
    return rows.find((n) => n.language_code === locale)?.name ?? rows.find((n) => n.language_code === "en")?.name ?? null;
  };
  return ids
    .filter((id) => parentById.has(id))
    .map((id) => {
      const parentId = parentById.get(id) ?? null;
      return { id, name: nameOf(id) ?? id, parentLabel: parentId ? nameOf(parentId) : null };
    });
}
