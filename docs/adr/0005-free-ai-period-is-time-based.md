# ADR-0005: The free AI period switches itself off by date

**Status:** Accepted (2026-11-07, owner decision)

**Context:** The owner made every AI feature free for six months, after which paid tiers return.

**Decision:** `lib/ai-free-period.ts` compares the clock with an end date
(2027-05-07 00:00 Amsterdam; `AI_FREE_PERIOD_ENDS_AT` overrides). Every gate (photo autofill,
`canUseSellerProAi`, Listen, checkout) and every banner reads it. Promo uses skip the per-account
counter; a 40-per-day fair-use cap per account limits paid-fallback cost. The new-listing
broadcast stays a paid perk (`isSellerProSubscriber`).

**Consequences:** No one has to remember to switch it off. Cost exposure while it runs is bounded
by the daily cap and the text features' hourly limits; watch OpenAI and OpenRouter spend monthly.
Announcing the end to users is not automated.
