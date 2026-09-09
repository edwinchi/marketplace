// Live account status for the /admin "top up AI" guide -- real numbers from OpenRouter's own API,
// not a static instructional card. total_credits is lifetime credits ever PURCHASED (not current
// balance) per OpenRouter's own documented semantics -- that's the number that actually decides
// the free-tier daily request cap (50/day below $10 ever purchased, 1000/day permanently once
// $10+ has been purchased at any point), which is why this checks totalCredits >= 10 rather than
// remaining balance.
export type OpenRouterStatus = {
  totalCreditsPurchased: number;
  totalUsage: number;
  dailyFreeRequestCap: number;
};

export async function getOpenRouterStatus(): Promise<OpenRouterStatus | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const totalCreditsPurchased = json?.data?.total_credits ?? 0;
    const totalUsage = json?.data?.total_usage ?? 0;
    return { totalCreditsPurchased, totalUsage, dailyFreeRequestCap: totalCreditsPurchased >= 10 ? 1000 : 50 };
  } catch {
    return null;
  }
}
