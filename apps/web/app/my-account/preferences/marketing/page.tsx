import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileToggle } from "@/components/profile-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

// AfroDeals doesn't send marketing emails yet (no campaign system, no Resend template for
// promotional content) — this genuinely saves the preference for when that exists, same
// sequencing as building a database column before the feature that reads it, rather than a fake
// settings screen that saves nothing.
export default async function MarketingPreferencesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("marketing_emails_opt_in").eq("id", profile.id).single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Marketing preferences</h1>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium">Marketing emails</p>
            <p className="text-sm text-muted-foreground">
              News, tips, and offers from AfroDeals. We don&apos;t send these yet — this just saves your preference for when we do.
            </p>
          </div>
          <ProfileToggle field="marketing_emails_opt_in" checked={data?.marketing_emails_opt_in ?? true} returnTo="/my-account/preferences/marketing" />
        </CardContent>
      </Card>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
