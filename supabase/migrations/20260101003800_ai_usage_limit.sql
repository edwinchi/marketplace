-- Real usage counter for the free tier of AI photo analysis — 3 free uses per registered user,
-- then the honest "upgrade" prompt on the AI features page (no payment processor to actually
-- charge yet, so this just blocks further free use rather than faking a paywall bypass).
alter table profiles
  add column if not exists ai_photo_analysis_uses integer not null default 0;
