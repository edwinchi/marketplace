import { createServiceClient } from "./supabase/service";

// Which of the site's languages (beyond English, the permanent fallback -- see
// i18n/request.ts's DEFAULT_LOCALE) are actually offered to visitors, flippable from the admin
// dashboard without a code deploy. See supabase/migrations/20260101004900_language_settings.sql.
// Fails open (returns every non-English locale as enabled) on any error, including "table doesn't
// exist yet" -- same reasoning as every other not-yet-run-migration feature in this project: a
// missing migration should degrade to "toggle isn't available yet", never take languages that
// already shipped away from real users.
export async function getDisabledLocales(): Promise<Set<string>> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("language_settings").select("locale, enabled");
    if (error || !data) return new Set();
    return new Set(data.filter((row) => !row.enabled).map((row) => row.locale));
  } catch {
    return new Set();
  }
}

export async function setLocaleEnabled(locale: string, enabled: boolean): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("language_settings").upsert({ locale, enabled, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
