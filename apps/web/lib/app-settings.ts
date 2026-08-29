import { createServiceClient } from "./supabase/service";

// Small key/value settings store for site-wide toggles the admin can flip without a code deploy.
// See supabase/migrations/20260101004100_app_settings.sql.
export async function getRequireLoginSetting(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "require_login").maybeSingle();
  return data?.value ?? true;
}

export async function setRequireLoginSetting(value: boolean) {
  const supabase = createServiceClient();
  await supabase.from("app_settings").upsert({ key: "require_login", value, updated_at: new Date().toISOString() });
}
