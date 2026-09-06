import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

// Counts a real, distinct-per-day visitor for the admin dashboard's "visitors today" stat (see
// lib/admin-stats.ts) -- deliberately NOT done in proxy.ts (middleware), which runs on every
// request site-wide including the Stripe webhook; a bug there once silently broke every webhook
// this project ever sent, so new site-wide logic goes in an isolated route instead, never touching
// that file. A tiny client beacon (components/visit-tracker.tsx) posts here once per page load;
// this route decides whether that visit is actually new for today.
const SEEN_TODAY_COOKIE = "afrodeals_seen_today";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
    const seenToday = cookieStore.get(SEEN_TODAY_COOKIE)?.value;
    if (seenToday === today) return new NextResponse(null, { status: 204 });

    const supabase = createServiceClient();
    const { error } = await supabase.rpc("increment_daily_visitor_count", { p_day: today });
    if (error) console.error("Failed to record daily visitor count:", error);

    cookieStore.set(SEEN_TODAY_COOKIE, today, { path: "/", maxAge: 60 * 60 * 24 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Best-effort telemetry -- never worth surfacing an error to the visitor over this.
    console.error("track-visit failed:", err);
    return new NextResponse(null, { status: 204 });
  }
}
