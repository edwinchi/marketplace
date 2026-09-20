import { createServiceClient } from "./supabase/service";

// Admin-editable numeric settings, flippable from /admin without a code deploy -- same reasoning
// as app_settings/language_settings, but for integers (a Save button, not instant-save-on-click,
// since this is a text field someone is actively typing into). See
// supabase/migrations/20260101005000_numeric_settings.sql and .../20260101005100_stripe_connect.sql.
//
// buyer_fee_percent_x100 is the percentage times 100 (500 = 5.00%) since this column is an
// integer, not a decimal -- see lib/payments.ts's calculateBuyerFee for the actual math.
const DEFAULTS: Record<string, number> = {
  category_group_collapsed_limit: 3,
  buyer_fee_percent_x100: 500,
  buyer_fee_min_cents: 59,
  buyer_fee_max_cents: 2000,
  referral_bonus_ai_uses: 10,
  ad_bump_price_cents: 199,
  // Priced against Marktplaats' own real "Plaats advertentie" tiers for the equivalent category
  // (Plus EUR 16.40, Premium EUR 40.40, captured live 2026-09-20), undercut 40% -- a deliberate
  // competitive-pricing call, not arbitrary numbers.
  listing_tier_plus_price_cents: 984,
  listing_tier_premium_price_cents: 2424,
  // Same reference/discount logic (Marktplaats' 3-day homepage placement add-on, EUR 22.99, minus
  // 40%) -- see listing-boost-actions.ts for what this actually buys.
  homepage_placement_price_cents: 1379,
};

// Fails open to the code-shipped default on any error, including "table doesn't exist yet" -- same
// reasoning as every other not-yet-run-migration feature in this project.
export async function getNumericSetting(key: keyof typeof DEFAULTS): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("numeric_settings").select("value").eq("key", key).maybeSingle();
    if (error || data == null) return DEFAULTS[key];
    return data.value;
  } catch {
    return DEFAULTS[key];
  }
}

export async function setNumericSetting(key: keyof typeof DEFAULTS, value: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("numeric_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
