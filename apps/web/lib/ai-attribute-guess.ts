import type { AttributeDef } from "@/lib/categories";

// Only attributes a photo could plausibly reveal something about get asked for -- open-ended
// free-text attributes with no seeded options (brand/model-style fields, already covered by the
// title/description) are excluded, same reasoning as vehicle-listing-defaults.ts leaving those to
// a raw string rather than pretending there's a fixed list. boolean/date are included: a visible
// "like new" condition or a clearly-legible date sticker are real things a photo can show.
function guessableAttributes(attributes: AttributeDef[]): AttributeDef[] {
  return attributes.filter((a) => a.dataType !== "single_select" || a.options.length > 0);
}

// Builds the prompt section asking the model to guess values for this category's attributes --
// the model only ever sees option LABELS (it has no idea what an internal stable_key is), so the
// response is label text, resolved back to real option ids by resolveAttributeGuesses below.
export function buildAttributeGuessPrompt(attributes: AttributeDef[]): string | null {
  const guessable = guessableAttributes(attributes);
  if (guessable.length === 0) return null;

  const lines = guessable.map((a) => {
    if (a.dataType === "single_select") return `- "${a.stableKey}" (${a.label}): pick exactly one of [${a.options.map((o) => o.label).join(", ")}]`;
    if (a.dataType === "multi_select") return `- "${a.stableKey}" (${a.label}): pick any that clearly apply from [${a.options.map((o) => o.label).join(", ")}]`;
    if (a.dataType === "boolean") return `- "${a.stableKey}" (${a.label}): true or false`;
    if (a.dataType === "integer" || a.dataType === "decimal") return `- "${a.stableKey}" (${a.label}${a.unitCode ? `, in ${a.unitCode}` : ""}): a number`;
    if (a.dataType === "date") return `- "${a.stableKey}" (${a.label}): a date as YYYY-MM-DD`;
    return `- "${a.stableKey}" (${a.label}): a short value`;
  });

  return `Now guess values for these listing attributes, based only on what's genuinely visible in the photo(s) or stated in the seller's own notes:
${lines.join("\n")}

Respond with ONLY a JSON object (no markdown fences, no commentary) mapping each attribute's exact key name above to your guessed value (a plain string for single_select/boolean/integer/decimal/date, an array of strings for multi_select). Omit a key entirely rather than guessing when you're not reasonably confident -- an omitted field is fine, a wrong one isn't.`;
}

// Resolves the model's label-text guesses back to real attribute_option ids (for select types) or
// passes validated primitives through (for boolean/integer/decimal/date) -- same shape
// CharacteristicsSection's defaultValues prop already expects (Record<stableKey, string | string[]>,
// see components/listings/characteristics-section.tsx), so this plugs into the exact same
// autofill path the RDW plate lookup uses (lib/vehicle-listing-defaults.ts).
export function resolveAttributeGuesses(raw: Record<string, unknown>, attributes: AttributeDef[]): Record<string, string | string[]> {
  const resolved: Record<string, string | string[]> = {};
  const byStableKey = new Map(attributes.map((a) => [a.stableKey, a]));

  for (const [stableKey, value] of Object.entries(raw)) {
    const attr = byStableKey.get(stableKey);
    if (!attr || value == null) continue;

    if (attr.dataType === "single_select") {
      const label = String(value).trim().toLowerCase();
      const option = attr.options.find((o) => o.label.toLowerCase() === label);
      if (option) resolved[stableKey] = option.id;
      continue;
    }
    if (attr.dataType === "multi_select") {
      if (!Array.isArray(value)) continue;
      const ids = value
        .map((v) => attr.options.find((o) => o.label.toLowerCase() === String(v).trim().toLowerCase())?.id)
        .filter((id): id is string => !!id);
      if (ids.length > 0) resolved[stableKey] = ids;
      continue;
    }
    if (attr.dataType === "boolean") {
      resolved[stableKey] = String(value).trim().toLowerCase() === "true" ? "true" : "false";
      continue;
    }
    if (attr.dataType === "integer" || attr.dataType === "decimal") {
      const n = Number(value);
      if (Number.isFinite(n)) resolved[stableKey] = String(n);
      continue;
    }
    if (attr.dataType === "date") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) resolved[stableKey] = String(value);
      continue;
    }
  }

  return resolved;
}
