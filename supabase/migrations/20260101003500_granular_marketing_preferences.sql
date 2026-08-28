-- Splits the single marketing_emails_opt_in toggle into the granular categories shown in the
-- reference marketing-preferences screen — same "real column before the feature that reads it"
-- sequencing as marketing_emails_opt_in itself. AfroDeals doesn't send any of these emails yet;
-- this saves genuine per-category preference for when campaigns/partner-ads exist.
alter table profiles
  add column if not exists marketing_news_opt_in boolean not null default true,
  add column if not exists marketing_listing_tips_opt_in boolean not null default true,
  add column if not exists marketing_promotions_opt_in boolean not null default true,
  add column if not exists marketing_surveys_opt_in boolean not null default true,
  add column if not exists marketing_partner_ads_opt_in boolean not null default true;
