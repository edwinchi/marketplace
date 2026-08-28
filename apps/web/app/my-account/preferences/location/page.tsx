import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileToggle } from "@/components/profile-toggle";
import { updatePreferredCity } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";

// No real geolocation/reverse-geocoding is wired up anywhere in this app (the homepage's "Near
// you" tab is an honest city-text filter, not device location) — this preference is the same
// city-based approach, saved for real, not GPS tracking dressed up as a preference.
export default async function LocationPreferencesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("location_sharing_opt_in, preferred_city").eq("id", profile.id).single();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Ad &amp; location preferences</h1>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Use my city for nearby listings</p>
              <p className="text-sm text-muted-foreground">
                Pre-fills the &quot;Near you&quot; tab with this city. AfroDeals doesn&apos;t use precise device location anywhere.
              </p>
            </div>
            <ProfileToggle field="location_sharing_opt_in" checked={data?.location_sharing_opt_in ?? false} returnTo="/my-account/preferences/location" />
          </div>

          <form action={updatePreferredCity} className="flex flex-col gap-1.5">
            <Label htmlFor="preferred_city">Your city</Label>
            <div className="flex gap-2">
              <Input id="preferred_city" name="preferred_city" defaultValue={data?.preferred_city ?? ""} placeholder="e.g. Lagos" />
              <Button type="submit" variant="outline">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline" })}>Back to profile</Link>
    </div>
  );
}
