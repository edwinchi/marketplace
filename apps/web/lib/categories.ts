import { getLocale } from "next-intl/server";
import { createClient } from "./supabase/server";

// PostgREST caps any single response at its configured max-rows (1000 here) -- categories and
// category_translations both crossed that after the Marktplaats taxonomy import (2666/2859 rows),
// so an unbounded .select() on either silently truncates instead of erroring. Every full-table read
// of either table goes through this helper instead, paging in batches of 1000 until a short page
// confirms the end.
async function fetchAllRows<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data } = await build(from, from + PAGE_SIZE - 1);
    const page = data ?? [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// French coverage of category/attribute names is partial (79/392 categories have a real
// translation as of writing) — falling back to English rather than showing a blank/stable_key
// name for the rest. Real per-row lookups either way, never a fabricated French string.
async function resolveLocale(explicit?: string) {
  return explicit ?? (await getLocale());
}

export type AttributeOption = { id: string; stableKey: string; label: string };
export type AttributeDef = {
  id: string;
  stableKey: string;
  dataType: string;
  unitCode: string | null;
  label: string;
  isRequired: boolean;
  options: AttributeOption[];
};
export type CategoryOption = { id: string; label: string; stableKey: string };

// Only these data types get a form field rendered — matches what the seeded attributes actually
// use (see data/06_attributes_mappings.sql). Extend when a category needs a new type; don't build
// UI for the full data_type enum speculatively (agents.md §7).
const SUPPORTED_DATA_TYPES = new Set(["single_select", "integer", "decimal", "date"]);

// Preloads the whole (small) taxonomy in a handful of flat queries rather than one fragile
// deeply-nested PostgREST embed — simpler to read and to keep correct as the seed data grows.
export async function getCategoriesAndAttributes(language?: string) {
  const lang = await resolveLocale(language);
  const supabase = await createClient();

  const [
    categories,
    categoryTranslations,
    categoryTranslationsEn,
    { data: categoryAttributes },
    { data: attributes },
    { data: attributeTranslations },
    { data: attributeTranslationsEn },
    { data: attributeOptions },
    { data: optionTranslations },
    { data: optionTranslationsEn },
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("categories").select("id, parent_id, stable_key, level, sort_order").eq("is_active", true).eq("allows_listings", true).range(from, to),
    ),
    fetchAllRows((from, to) => supabase.from("category_translations").select("category_id, name").eq("language_code", lang).range(from, to)),
    lang === "en" ? Promise.resolve([]) : fetchAllRows((from, to) => supabase.from("category_translations").select("category_id, name").eq("language_code", "en").range(from, to)),
    supabase.from("category_attributes").select("category_id, attribute_id, is_required, sort_order"),
    supabase.from("attributes").select("id, stable_key, data_type, unit_code").eq("is_active", true),
    supabase.from("attribute_translations").select("attribute_id, name").eq("language_code", lang),
    lang === "en" ? Promise.resolve({ data: null }) : supabase.from("attribute_translations").select("attribute_id, name").eq("language_code", "en"),
    supabase.from("attribute_options").select("id, attribute_id, stable_key, sort_order").eq("is_active", true),
    supabase.from("attribute_option_translations").select("option_id, label").eq("language_code", lang),
    lang === "en" ? Promise.resolve({ data: null }) : supabase.from("attribute_option_translations").select("option_id, label").eq("language_code", "en"),
  ]);

  const categoryNameByIdEn = new Map((categoryTranslationsEn ?? []).map((t) => [t.category_id, t.name]));
  const categoryNameById = new Map(
    (categories ?? []).map((c) => {
      const localized = categoryTranslations?.find((t) => t.category_id === c.id)?.name;
      return [c.id, localized ?? categoryNameByIdEn.get(c.id) ?? c.stable_key];
    }),
  );
  const attributeNameByIdEn = new Map((attributeTranslationsEn ?? []).map((t) => [t.attribute_id, t.name]));
  const attributeNameById = new Map(
    (attributes ?? []).map((a) => {
      const localized = attributeTranslations?.find((t) => t.attribute_id === a.id)?.name;
      return [a.id, localized ?? attributeNameByIdEn.get(a.id) ?? a.stable_key];
    }),
  );
  const optionLabelByIdEn = new Map((optionTranslationsEn ?? []).map((t) => [t.option_id, t.label]));
  const optionLabelById = new Map(
    (attributeOptions ?? []).map((o) => {
      const localized = optionTranslations?.find((t) => t.option_id === o.id)?.label;
      return [o.id, localized ?? optionLabelByIdEn.get(o.id) ?? o.stable_key];
    }),
  );

  const optionsByAttribute = new Map<string, AttributeOption[]>();
  for (const opt of attributeOptions ?? []) {
    const list = optionsByAttribute.get(opt.attribute_id) ?? [];
    list.push({ id: opt.id, stableKey: opt.stable_key, label: optionLabelById.get(opt.id) ?? opt.stable_key });
    optionsByAttribute.set(opt.attribute_id, list);
  }

  const attributeById = new Map(
    (attributes ?? [])
      .filter((a) => SUPPORTED_DATA_TYPES.has(a.data_type))
      .map((a) => [
        a.id,
        {
          id: a.id,
          stableKey: a.stable_key,
          dataType: a.data_type,
          unitCode: a.unit_code,
          label: attributeNameById.get(a.id) ?? a.stable_key,
          options: optionsByAttribute.get(a.id) ?? [],
        },
      ]),
  );

  const attributesByCategory = new Map<string, AttributeDef[]>();
  for (const ca of categoryAttributes ?? []) {
    const attr = attributeById.get(ca.attribute_id);
    if (!attr) continue;
    const list = attributesByCategory.get(ca.category_id) ?? [];
    list.push({ ...attr, isRequired: ca.is_required, sortOrder: ca.sort_order } as AttributeDef & { sortOrder: number });
    attributesByCategory.set(ca.category_id, list);
  }
  for (const list of attributesByCategory.values()) {
    list.sort((a, b) => (a as AttributeDef & { sortOrder: number }).sortOrder - (b as AttributeDef & { sortOrder: number }).sortOrder);
  }

  // category_attributes (06_attributes_mappings.sql) only maps attributes onto top-level
  // categories, never their subcategories — a level-3 leaf like "Women's Clothing > Shoes" has no
  // direct rows at all. Rather than re-seed mappings onto every one of the ~150 subcategories,
  // inherit the nearest ancestor's attribute list when a category has none of its own.
  const parentIdById = new Map((categories ?? []).map((c) => [c.id, c.parent_id]));
  function resolveAttributes(categoryId: string, seen = new Set<string>()): AttributeDef[] {
    const direct = attributesByCategory.get(categoryId);
    if (direct?.length) return direct;
    const parentId = parentIdById.get(categoryId);
    if (!parentId || seen.has(parentId)) return [];
    seen.add(parentId);
    return resolveAttributes(parentId, seen);
  }
  for (const c of categories ?? []) {
    if (!attributesByCategory.get(c.id)?.length) {
      const inherited = resolveAttributes(c.id);
      if (inherited.length) attributesByCategory.set(c.id, inherited);
    }
  }

  // Alphabetical throughout (by parent name, then by the category's own name) rather than the
  // seeded sort_order — sort_order reflects whatever order categories happened to be entered in,
  // not a deliberate browsing order, so alphabetical is both simpler to reason about and easier
  // for a user to scan.
  const parentNameById = categoryNameById;
  const categoryOptions: CategoryOption[] = (categories ?? [])
    .map((c) => {
      const name = categoryNameById.get(c.id) ?? c.id;
      const parentName = c.parent_id ? parentNameById.get(c.parent_id) : null;
      return {
        id: c.id,
        stableKey: c.stable_key,
        label: parentName ? `${parentName} → ${name}` : name,
        sortKey: `${(parentName ?? name).toLowerCase()} ${name.toLowerCase()}`,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ id, stableKey, label }) => ({ id, stableKey, label }));

  const topLevelCategories = (categories ?? [])
    .filter((c) => !c.parent_id)
    .map((c) => ({ id: c.id, stableKey: c.stable_key, label: categoryNameById.get(c.id) ?? c.stable_key }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Plain object, not a Map — this crosses the Server -> Client Component boundary as a prop.
  return {
    categoryOptions,
    topLevelCategories,
    attributesByCategory: Object.fromEntries(attributesByCategory) as Record<string, AttributeDef[]>,
  };
}

type CategoryNode = { id: string; parentId: string | null; stableKey: string; sortOrder: number; name: string };

// Shared by the breadcrumb/directory helpers below — same small-taxonomy-preload approach as
// getCategoriesAndAttributes, kept separate since those callers don't need attributes at all.
async function loadCategoryNodes(language?: string): Promise<CategoryNode[]> {
  const lang = await resolveLocale(language);
  const supabase = await createClient();
  const [categories, translations, translationsEn] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("categories").select("id, parent_id, stable_key, sort_order").eq("is_active", true).range(from, to)),
    fetchAllRows((from, to) => supabase.from("category_translations").select("category_id, name").eq("language_code", lang).range(from, to)),
    lang === "en" ? Promise.resolve([]) : fetchAllRows((from, to) => supabase.from("category_translations").select("category_id, name").eq("language_code", "en").range(from, to)),
  ]);
  const nameByIdEn = new Map(translationsEn.map((t) => [t.category_id, t.name]));
  return categories.map((c) => {
    const localized = translations?.find((t) => t.category_id === c.id)?.name;
    return {
      id: c.id,
      parentId: c.parent_id,
      stableKey: c.stable_key,
      sortOrder: c.sort_order,
      name: localized ?? nameByIdEn.get(c.id) ?? c.stable_key,
    };
  });
}

// Home > ... > this category, for breadcrumbs. Empty array if the id doesn't exist.
export async function getCategoryPath(categoryId: string, language?: string) {
  const nodes = await loadCategoryNodes(language);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: CategoryNode[] = [];
  let current = byId.get(categoryId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

// This category's own id plus every descendant id, for filtering listings by a whole branch of
// the tree (e.g. picking "Antiques & Art" should surface listings tagged under any of its
// sub-subcategories too, not just ones tagged on that exact node).
export async function getCategoryDescendantIds(categoryId: string, language?: string) {
  const nodes = await loadCategoryNodes(language);
  const childrenByParent = new Map<string, CategoryNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n);
    childrenByParent.set(n.parentId, list);
  }
  const ids: string[] = [];
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

// For the /categories/[id] directory page: this category's node, its direct children, and (per
// child) *its* children — matches the card-of-subcategories-with-leaf-links layout.
export async function getCategoryDirectory(categoryId: string, language?: string) {
  const nodes = await loadCategoryNodes(language);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const self = byId.get(categoryId) ?? null;

  const childrenByParent = new Map<string, CategoryNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n);
    childrenByParent.set(n.parentId, list);
  }
  const sortNodes = (list: CategoryNode[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  const children = sortNodes(childrenByParent.get(categoryId) ?? []).map((child) => ({
    id: child.id,
    stableKey: child.stableKey,
    name: child.name,
    children: sortNodes(childrenByParent.get(child.id) ?? []).map((gc) => ({ id: gc.id, stableKey: gc.stableKey, name: gc.name })),
  }));

  return { self: self ? { id: self.id, stableKey: self.stableKey, name: self.name } : null, children };
}

// Stock photo gallery for a leaf category's browse page. Rows only exist for categories that had
// real listings at the time the gallery was sourced (scratchpad/source_photos*.mjs, one-off run,
// not a live scraper) — most categories simply have none, which is a real empty state, not a bug.
export async function getCategoryGallery(categoryId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("category_gallery_images")
    .select("id, storage_key")
    .eq("category_id", categoryId)
    .order("sort_order");
  return data ?? [];
}

// Every top-level category, for the site footer's link grid — all of them are meant to be
// reachable from there, not a curated subset. (A prior version hand-picked 11 by hardcoded id;
// those ids don't survive a database migration, since a fresh seed regenerates every row's id.
// This reads live off parent_id instead, so it can't go stale the same way again.)
export async function getFooterCategories(language?: string) {
  const nodes = await loadCategoryNodes(language);
  return nodes
    .filter((n) => !n.parentId)
    .map((n) => ({ id: n.id, name: n.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
