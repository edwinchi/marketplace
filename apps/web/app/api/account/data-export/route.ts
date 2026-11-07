import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectUserData, type ExportDb } from "@/lib/data-export";

// GET /api/account/data-export: the signed-in user's own data as a JSON download (GDPR Art. 15/20).
// Who is asking comes from the session cookie only, never from a parameter. The collection itself is
// scoped to that profile in lib/data-export.ts. 5 exports per hour per account: each one reads
// every table, so this stops it being used to load the database.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your data." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "No profile for this account." }, { status: 404 });

  if (!(await checkRateLimit(`data-export:${profile.id}`, 5, 3600))) {
    return NextResponse.json({ error: "You've downloaded your data several times in the last hour. Try again later." }, { status: 429 });
  }

  const data = await collectUserData(createServiceClient() as unknown as ExportDb, profile.id, user);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="marketitnow-my-data-${day}.json"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
