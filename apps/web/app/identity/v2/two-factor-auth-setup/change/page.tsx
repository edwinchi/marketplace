import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function TwoFactorAuthSetupPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Two-factor authentication</h1>
      <Card>
        <CardContent className="pt-6">
          <TwoFactorSetup />
        </CardContent>
      </Card>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>
        Back to profile
      </Link>
    </div>
  );
}
