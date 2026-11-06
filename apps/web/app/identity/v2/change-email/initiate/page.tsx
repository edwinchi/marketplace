import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfileForRender } from "@/lib/supabase/profile";
import { ChangeEmailForm } from "@/components/change-email-form";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function ChangeEmailPage() {
  const { user, profile } = await getCurrentUserAndProfileForRender();
  if (!user || !profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Change email</h1>
      <Card>
        <CardContent className="pt-6">
          <ChangeEmailForm currentEmail={user.email ?? ""} />
        </CardContent>
      </Card>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>
        Back to profile
      </Link>
    </div>
  );
}
