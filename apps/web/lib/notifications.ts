import { createClient } from "@/lib/supabase/server";

// For the nav badge -- simpler than getUnreadMessageCount's join-and-filter since read_at lives
// directly on the row.
export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("read_at", null);
  return count ?? 0;
}
