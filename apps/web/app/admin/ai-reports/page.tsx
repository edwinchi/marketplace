import { redirect } from "next/navigation";
import Link from "next/link";
import { Flag, Check } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { buttonVariants, Button } from "@/components/ui/button";
import { markAiReportReviewed } from "@/app/admin/ai-reports-actions";

// Seller-submitted "this AI text was wrong/offensive/off-topic" reports (the "Meld dat hier"
// feedback link from the reference this feature was modeled on) -- see components/listings/
// new-listing-step1.tsx's ReportAiOutput and supabase/migrations/20260101008600_ai_output_reports.sql.
// Same service-role-read, admin-only shape as the existing moderation queue.
export default async function AiReportsPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) redirect("/admin");

  const supabase = createServiceClient();
  const { data: reports } = await supabase
    .from("ai_output_reports")
    .select("id, title, description, extra_text, reason, status, created_at, profiles(username, display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Flag className="size-6 text-destructive" /> AI output reports
        </h1>
        <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to dashboard
        </Link>
      </div>

      {reports?.length ? (
        <ul className="flex flex-col divide-y">
          {reports.map((r) => {
            const reporter = r.profiles as unknown as { username: string | null; display_name: string | null } | null;
            return (
              <li key={r.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Reported by {reporter?.display_name || reporter?.username || "a seller"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={markAiReportReviewed.bind(null, r.id)}>
                    <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                      <Check className="size-3.5" /> Mark reviewed
                    </Button>
                  </form>
                </div>
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <span className="font-medium">Reason: </span>
                  {r.reason}
                </p>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{r.description}</p>
                {r.extra_text && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Seller&apos;s own notes: </span>
                    {r.extra_text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Flag className="size-10 text-muted-foreground" />
          <p className="font-medium">No open reports.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When a seller flags AI-generated text as wrong or offensive, it shows up here.
          </p>
        </div>
      )}
    </div>
  );
}
