"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

// Grants bonus AI uses to any single account by account number -- e.g. a one-off trial exception,
// same mechanism a real top-up purchase credits (ai_bonus_uses, added to whatever their free limit
// already is). Never touches ai_subscription_status, so it's exactly a trial: once the granted
// uses (plus their normal free limit) run out, they fall back to normal billing on their own --
// no separate "revert" step needed. Uses the service-role client since this must reach any
// account, not just the calling admin's own.
export async function grantAiBonusUses(accountNumber: number, amount: number): Promise<{ error: string | null; newTotal: number | null; accountName: string | null }> {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) throw new Error("Not authorized");
  if (!Number.isInteger(accountNumber) || accountNumber <= 0) return { error: "Enter a valid account number.", newTotal: null, accountName: null };
  if (!Number.isInteger(amount) || amount === 0) return { error: "Enter a non-zero whole number of uses.", newTotal: null, accountName: null };

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from("profiles").select("id, username, display_name").eq("account_number", accountNumber).maybeSingle();
  if (!profile) return { error: `No account with number ${accountNumber}.`, newTotal: null, accountName: null };

  const { data: newTotal, error } = await supabase.rpc("increment_ai_bonus_uses", { p_profile_id: profile.id, p_amount: amount });
  if (error) return { error: error.message, newTotal: null, accountName: null };

  return { error: null, newTotal, accountName: profile.display_name || profile.username };
}
