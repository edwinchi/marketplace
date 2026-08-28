import { redirect } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { buttonVariants } from "@/components/ui/button";

// Real, not decorative — genuinely no payout collection yet. A bank-details form here would mean
// storing account numbers without PCI-grade encryption, tokenization, or audit logging, which is
// a real security/compliance risk, not just a missing feature. Same honest-not-yet treatment as
// Digital invoice: explain why instead of collecting data we can't safely hold. When AfroDeals
// adds this for real, it'll go through a licensed processor's hosted form (e.g. Paystack,
// Flutterwave) that returns a reference token — we'd never store raw bank details ourselves.
export default async function EnablePaymentsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Enable payments</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16">
        <Landmark className="size-10 text-muted-foreground" />
        <p className="font-medium">Not available yet.</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          AfroDeals doesn&apos;t collect payout bank details yet — we&apos;d rather wait for a
          secure, licensed way to do it than store sensitive account details ourselves. You&apos;ll
          be able to add a payout method here once that&apos;s built.
        </p>
      </div>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
