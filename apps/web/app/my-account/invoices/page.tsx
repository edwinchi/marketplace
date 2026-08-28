import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileToggle } from "@/components/profile-toggle";
import { buttonVariants } from "@/components/ui/button";

// Real, not decorative — it's just genuinely empty, because AfroDeals has no paid features
// (promotions/boosts/subscriptions are a later phase per agents.md §10) to have generated an
// invoice for yet. Same honest-empty-state treatment as Transactions and every other real-but-
// currently-unused query on this account hub. The monthly-invoice-by-email opt-in below is real
// and genuinely saved, even though nothing sends that email yet.
export default async function InvoicesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("digital_invoice_opt_in").eq("id", profile.id).single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Digital invoice</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
        <FileText className="size-10 text-muted-foreground" />
        <p className="font-medium">No invoices yet.</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          This invoice covers any paid products you&apos;ve already paid for. AfroDeals doesn&apos;t
          have any paid features yet — everything (listing, browsing, messaging) is free. You&apos;ll
          see an invoice here if that changes.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border p-4 text-left">
        <p className="text-sm">Send me a monthly digital invoice by email.</p>
        <ProfileToggle
          field="digital_invoice_opt_in"
          checked={data?.digital_invoice_opt_in ?? false}
          returnTo="/my-account/invoices"
        />
      </div>

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
