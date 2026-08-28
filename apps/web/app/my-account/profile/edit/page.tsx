import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const isBusiness = profile.account_type === "business";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <form action={updateProfile} className="flex max-w-lg flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" name="postal_code" defaultValue={identityFields?.postal_code ?? ""} placeholder="900001" maxLength={20} />
              <p className="text-xs text-muted-foreground">Shown on your listings and bids. You can change this anytime.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone_number">Phone number (optional)</Label>
              <Input id="phone_number" name="phone_number" type="tel" defaultValue={identityFields?.phone_number ?? ""} placeholder="+234 800 000 0000" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seller type</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              To keep AfroDeals transparent, we ask every seller whether they&apos;re a private
              individual or a business. It&apos;s not permitted to present yourself as a private
              seller while operating as a business. Once set to business, this can&apos;t be
              switched back to private.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="account_type" value="private" defaultChecked={!isBusiness} disabled={isBusiness} />
              Private seller
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="account_type" value="business" defaultChecked={isBusiness} />
              Business seller
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link href="/my-account/profile" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Save</Button>
        </div>
      </form>

      <div className="max-w-lg">
        <DeleteAccountButton />
      </div>
    </div>
  );
}
