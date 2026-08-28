import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default async function EditProfilePage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  // Separate, best-effort query — see the matching comment in my-account/profile/page.tsx.
  const supabase = await createClient();
  const { data: identityFields } = await supabase
    .from("profiles")
    .select("phone_number, postal_code")
    .eq("id", profile.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display_name">Name</Label>
              <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? profile.username} required maxLength={30} />
              <p className="text-xs text-muted-foreground">Shown on your listings and bids.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={user.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email changes aren&apos;t supported from here yet.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website_url">Website (optional)</Label>
              <Input id="website_url" name="website_url" defaultValue={profile.website_url ?? ""} placeholder="yourbusiness.com" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone_number">Phone number (optional)</Label>
              <Input id="phone_number" name="phone_number" type="tel" defaultValue={identityFields?.phone_number ?? ""} placeholder="+234 800 000 0000" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postal_code">Postal code (optional)</Label>
              <Input id="postal_code" name="postal_code" defaultValue={identityFields?.postal_code ?? ""} placeholder="900001" maxLength={20} />
            </div>

            <div className="flex gap-2 pt-2">
              <Link href="/my-account/profile" className="flex-1">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </Link>
              <Button type="submit" className="flex-1">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
