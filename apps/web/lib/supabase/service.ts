import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Bypasses RLS — only for trusted server code (webhook handlers, outbox/search workers, AI
// listing analysis writes). Never import this into anything that runs in the browser, and never
// call it from a Server Component/Action that just wants to read data on the user's behalf —
// use lib/supabase/server.ts for that, so RLS still applies.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
