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
  const { error } = await supabase.from("app_settings").upsert({ key: "require_login", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// Temporary promotional override for Listen (see getCanListen()) -- lets an admin make the
// read-aloud feature free for every signed-in user regardless of Seller Pro subscription status,
// for a limited-time window they control by toggling this back off (e.g. a few months' trial to
// drive AI-feature awareness). No seed row needed: app_settings already exists in production, and
// this key simply doesn't exist until the first time an admin turns it on -- defaults to off.
export async function getListenFreeAccessSetting(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "listen_free_access").maybeSingle();
  return data?.value ?? false;
}

export async function setListenFreeAccessSetting(value: boolean) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("app_settings").upsert({ key: "listen_free_access", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
