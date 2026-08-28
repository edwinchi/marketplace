import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileToggle } from "@/components/profile-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const CATEGORIES = [
  {
    field: "marketing_news_opt_in" as const,
    title: "News and inspiration",
    body: "Newsletters and listings we think you'll find interesting.",
  },
  {
    field: "marketing_listing_tips_opt_in" as const,
    title: "Tips and info about your listings",
    body: "Stats about your listings and tips to sell faster.",
  },
  {
    field: "marketing_promotions_opt_in" as const,
    title: "Deals and promotions",
    body: "Offers picked for you and fun giveaways.",
  },
  {
    field: "marketing_surveys_opt_in" as const,
    title: "Surveys",
    body: "Help us make AfroDeals better by taking part in surveys and satisfaction research.",
  },
  {
    field: "marketing_partner_ads_opt_in" as const,
    title: "Personalized ads outside AfroDeals",
    body: "Ads matched to your interests on partner sites and apps, based on pseudonymized data like your email address.",
  },
];

// AfroDeals doesn't send any of these emails yet (no campaign system, no partner-ad network) —
// same honest-not-yet framing as the rest of Marketing preferences: real per-category columns,
// genuinely saved, just nothing reads them yet.
export default async function MarketingPreferencesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "marketing_news_opt_in, marketing_listing_tips_opt_in, marketing_promotions_opt_in, marketing_surveys_opt_in, marketing_partner_ads_opt_in",
    )
    .eq("id", profile.id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Marketing preferences</h1>
        <p className="text-sm text-muted-foreground">
          Beyond the system messages tied to your listings and customer service, choose what other
          information you want to receive by email. We don&apos;t send any of these yet — this just
          saves your preference for when we do.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y pt-6">
          {CATEGORIES.map((c) => (
            <div key={c.field} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
              <ProfileToggle
                field={c.field}
                checked={data?.[c.field] ?? true}
                returnTo="/my-account/preferences/marketing"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Want to set email preferences just for saved searches?{" "}
        <Link href="/my-account/saved-searches" className="text-primary underline underline-offset-2">
          Manage your saved searches here.
        </Link>
      </p>

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back to profile
      </Link>
    </div>
  );
}
