"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { recordAdminAction } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/service";

// Service-role client -- ai_output_reports has no select/update policy for authenticated/anon at
// all (supabase/migrations/20260101008600_ai_output_reports.sql), by design: a report is a
// one-way submission, reviewed only from here.
export async function markAiReportReviewed(reportId: string) {
  const { user, profile: admin } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");

  const supabase = createServiceClient();
  const { error } = await supabase.from("ai_output_reports").update({ status: "reviewed" }).eq("id", reportId);
  if (error) throw new Error(error.message);
  await recordAdminAction({ actorProfileId: admin?.id ?? null, action: "ai_report.review", entityType: "ai_output_report", entityId: reportId, next: { status: "reviewed" } });
  revalidatePath("/admin/ai-reports");
}
