import { redirect } from "next/navigation";
import { Gift, Users } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { getNumericSetting } from "@/lib/numeric-settings";
import { ReferralLinkBox } from "@/components/referral-link-box";

// account_number doubles as the referral code (see supabase/migrations/20260101006500_referral_loop.sql)
// -- already a unique, stable, human-typeable id on every profile, so no separate code needed.
export default async function ReferralsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: row }, { count }, origin, bonus] = await Promise.all([
    supabase.from("profiles").select("account_number").eq("id", profile.id).single(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by_profile_id", profile.id),
    getSiteOrigin(),
    getNumericSetting("referral_bonus_ai_uses"),
  ]);

  const link = row?.account_number != null ? `${origin}/login?ref=${row.account_number}` : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
          <Gift className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Refer a friend</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your link — when a friend signs up through it, you <em>both</em> get {bonus} free AI uses.
        </p>
      </div>

      {link ? (
        <ReferralLinkBox link={link} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">Your referral link isn&apos;t ready yet — try again in a moment.</p>
      )}

      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-sm text-muted-foreground">
        <Users className="size-4" />
        {count ?? 0} {count === 1 ? "friend" : "friends"} joined through your link
      </div>
    </div>
  );
}
