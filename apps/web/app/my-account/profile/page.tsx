import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

// Full card grid matches the reference layout. Every card here is real — two-factor auth, email
// change, address book, marketing/notification/location preferences, digital invoice, My
// experiences (real reviews table, honestly empty — no fabricated reviewers/ratings), and Enable
// payments (honest not-yet page — no bank-details form, since we won't store account numbers
// without PCI-grade handling; nothing left in "Coming soon").
export default async function MyAccountPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const supabase = await createClient();
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("created_at, email_verified")
    .eq("id", profile.id)
    .single();

  // Separate, best-effort query — kept independent from fullProfile above so that once the
  // phone_number/postal_code/account_number migration reaches production (still pending on the
  // prod DB password), this starts populating automatically with no code change. Until then it
  // silently returns null and the identity card just omits these lines, same as it does today.
  const { data: identityFields } = await supabase
    .from("profiles")
    .select("phone_number, postal_code, account_number")
    .eq("id", profile.id)
    .single();

  const { data: mfaData } = await supabase.auth.mfa.listFactors();
  const twoFactorEnabled = mfaData?.totp?.some((f) => f.status === "verified") ?? false;

  const memberSince = fullProfile?.created_at
    ? new Date(fullProfile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  const activeSince = fullProfile?.created_at
    ? new Date(fullProfile.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  const cardHover = "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#008848]/40 hover:shadow-md";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{profile.display_name || profile.username}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>@{profile.username}</p>
            {memberSince && <p>Member since {memberSince}</p>}
            {identityFields?.phone_number && <p>{identityFields.phone_number}</p>}
            {identityFields?.postal_code && <p>{identityFields.postal_code}</p>}
            {identityFields?.account_number != null && <p>Id: {identityFields.account_number}</p>}
            <Badge variant="outline" className="mt-1 w-fit capitalize">{profile.account_type} account</Badge>
            <Link href="/my-account/profile/edit" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit" })}>
              Edit
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Security check</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {activeSince && <p>Active since {activeSince}</p>}
            <Badge variant={twoFactorEnabled ? "default" : "outline"} className="mt-1 w-fit">
              {twoFactorEnabled ? "Two-factor authentication on" : "Two-factor authentication off"}
            </Badge>
            <Link href="/identity/v2/two-factor-auth-setup/change" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit" })}>
              Manage
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Login</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>{user.email}</p>
            <Badge variant={fullProfile?.email_verified ? "default" : "outline"} className="mt-1 w-fit">
              {fullProfile?.email_verified ? "Email verified" : "Email not verified"}
            </Badge>
            <div className="mt-2 flex gap-2">
              <Link href="/identity/v2/change-email/initiate" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Change email
              </Link>
              <Link href="/forgot-password" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Reset password
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Address book</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>Save addresses for pickup or delivery.</p>
            <Link href="/messages/address-profile" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit" })}>
              Manage
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Selling on AfroDeals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Manage your ads or post a new one — free, no dealer required.</p>
            <div className="flex gap-2">
              <Link href="/my-account/my-listings" className={buttonVariants({ variant: "outline", size: "sm" })}>My listings</Link>
              <Link href="/listings/new" className={buttonVariants({ size: "sm" })}>Post an ad</Link>
            </div>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Payment overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>See what you&apos;ve been paid for sold items and paid for purchases.</p>
            <Link href="/my-account/transactions" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              View
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Enable payments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Add or change the bank account you use for transactions on AfroDeals.</p>
            <Link href="/my-account/payments/enable" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              View
            </Link>
          </CardContent>
        </Card>

        {profile.website_url && (
          <Card className={cardHover}>
            <CardHeader>
              <CardTitle className="text-base">Website</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {profile.website_url}
              </a>
            </CardContent>
          </Card>
        )}

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Marketing preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Choose which emails you get from AfroDeals.</p>
            <Link href="/my-account/preferences/marketing" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              Set up
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Digital invoice</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Invoices for any paid features you use.</p>
            <Link href="/my-account/invoices" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              View
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">AI features</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Free AI photo autofill, plus what&apos;s planned next.</p>
            <Link href="/my-account/ai-features" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              View
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Ad &amp; location preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Control how your city is used for nearby listings.</p>
            <Link href="/my-account/preferences/location" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              Manage
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">Notification settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Choose which notifications you receive.</p>
            <Link href="/my-account/preferences/notifications" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              Set up
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">My experiences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Ratings and reviews from buyers and sellers.</p>
            <Link href="/experiences/my-reviews" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}>
              View
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
