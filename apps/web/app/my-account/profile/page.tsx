import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("Profile");
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
    ? t("memberSince", { date: new Date(fullProfile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) })
    : null;
  const activeSince = fullProfile?.created_at
    ? t("activeSince", { date: new Date(fullProfile.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) })
    : null;

  const cardHover = "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#008848]/40 hover:shadow-md";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{profile.display_name || profile.username}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>@{profile.username}</p>
            {memberSince && <p>{memberSince}</p>}
            {identityFields?.phone_number && <p>{identityFields.phone_number}</p>}
            {identityFields?.postal_code && <p>{identityFields.postal_code}</p>}
            {identityFields?.account_number != null && <p>{t("id", { number: identityFields.account_number })}</p>}
            <Badge variant="outline" className="mt-1 w-fit">{t("accountType", { type: profile.account_type })}</Badge>
            <Link href="/my-account/profile/edit" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("edit")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("securityCheck")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {activeSince && <p>{activeSince}</p>}
            <Badge variant={twoFactorEnabled ? "default" : "outline"} className="mt-1 w-fit">
              {twoFactorEnabled ? t("twoFactorOn") : t("twoFactorOff")}
            </Badge>
            <Link href="/identity/v2/two-factor-auth-setup/change" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("manage")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("login")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>{user.email}</p>
            <Badge variant={fullProfile?.email_verified ? "default" : "outline"} className="mt-1 w-fit">
              {fullProfile?.email_verified ? t("emailVerified") : t("emailNotVerified")}
            </Badge>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/identity/v2/change-email/initiate" className={buttonVariants({ variant: "outline", size: "sm", className: "transition-transform duration-150 hover:-translate-y-0.5" })}>
                {t("changeEmail")}
              </Link>
              <Link href="/forgot-password" className={buttonVariants({ variant: "outline", size: "sm", className: "transition-transform duration-150 hover:-translate-y-0.5" })}>
                {t("resetPassword")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("addressBook")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p>{t("addressBookBody")}</p>
            <Link href="/messages/address-profile" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("manage")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("selling")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("sellingBody")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/my-account/my-listings" className={buttonVariants({ variant: "outline", size: "sm", className: "transition-transform duration-150 hover:-translate-y-0.5" })}>{t("myListings")}</Link>
              <Link href="/listings/new" className={buttonVariants({ size: "sm", className: "transition-transform duration-150 hover:-translate-y-0.5" })}>{t("postAd")}</Link>
            </div>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("paymentOverview")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("paymentOverviewBody")}</p>
            <Link href="/my-account/transactions" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("view")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("enablePayments")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("enablePaymentsBody")}</p>
            <Link href="/my-account/payments/enable" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("view")}
            </Link>
          </CardContent>
        </Card>

        {profile.website_url && (
          <Card className={cardHover}>
            <CardHeader>
              <CardTitle className="text-base">{t("website")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary transition-colors hover:underline">
                {profile.website_url}
              </a>
            </CardContent>
          </Card>
        )}

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("marketingPreferences")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("marketingPreferencesBody")}</p>
            <Link href="/my-account/preferences/marketing" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("setUp")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("digitalInvoice")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("digitalInvoiceBody")}</p>
            <Link href="/my-account/invoices" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("view")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("aiFeatures")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("aiFeaturesBody")}</p>
            <Link href="/my-account/ai-features" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("view")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("adLocationPreferences")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("adLocationPreferencesBody")}</p>
            <Link href="/my-account/preferences/location" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("manage")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("notificationSettings")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("notificationSettingsBody")}</p>
            <Link href="/my-account/preferences/notifications" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("setUp")}
            </Link>
          </CardContent>
        </Card>

        <Card className={cardHover}>
          <CardHeader>
            <CardTitle className="text-base">{t("myExperiences")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("myExperiencesBody")}</p>
            <Link href="/experiences/my-reviews" className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit transition-transform duration-150 hover:-translate-y-0.5" })}>
              {t("view")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
