import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { buttonVariants } from "@/components/ui/button";

// Real, not decorative — it's just genuinely empty, because AfroDeals has no paid features
// (promotions/boosts/subscriptions are a later phase per agents.md §10) to have generated an
// invoice for yet. Same honest-empty-state treatment as Transactions and every other real-but-
// currently-unused query on this account hub.
export default async function InvoicesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Digital invoice</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
        <FileText className="size-10 text-muted-foreground" />
        <p className="font-medium">No invoices yet.</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          AfroDeals doesn&apos;t have any paid features yet — everything (listing, browsing, messaging) is free. You&apos;ll see an invoice here if that changes.
        </p>
      </div>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
