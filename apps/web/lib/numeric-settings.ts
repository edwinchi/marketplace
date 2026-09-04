import { createServiceClient } from "./supabase/service";

// Admin-editable numeric settings, flippable from /admin without a code deploy -- same reasoning
// as app_settings/language_settings, but for integers (a Save button, not instant-save-on-click,
// since this is a text field someone is actively typing into). See
// supabase/migrations/20260101005000_numeric_settings.sql.
const DEFAULTS: Record<string, number> = { category_group_collapsed_limit: 3 };

// Fails open to the code-shipped default on any error, including "table doesn't exist yet" -- same
// reasoning as every other not-yet-run-migration feature in this project.
export async function getNumericSetting(key: keyof typeof DEFAULTS): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("numeric_settings").select("value").eq("key", key).maybeSingle();
    if (error || data == null) return DEFAULTS[key];
    return data.value;
  } catch {
    return DEFAULTS[key];
  }
}

export async function setNumericSetting(key: keyof typeof DEFAULTS, value: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("numeric_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
