import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileToggle } from "@/components/profile-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function NotificationSettingsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("notify_new_messages, notify_offers").eq("id", profile.id).single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Notification settings</h1>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">New messages</p>
              <p className="text-sm text-muted-foreground">When a buyer or seller messages you.</p>
            </div>
            <ProfileToggle field="notify_new_messages" checked={data?.notify_new_messages ?? true} returnTo="/my-account/preferences/notifications" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Offers on your listings</p>
              <p className="text-sm text-muted-foreground">When someone makes an offer.</p>
            </div>
            <ProfileToggle field="notify_offers" checked={data?.notify_offers ?? true} returnTo="/my-account/preferences/notifications" />
          </div>
          <p className="text-xs text-muted-foreground">
            These control your preference — the in-app{" "}
            <Link href="/notifications" className="underline">notifications inbox</Link> itself doesn&apos;t filter by them yet.
          </p>
        </CardContent>
      </Card>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
