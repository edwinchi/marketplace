-- Referral loop: a new user who signs up via /login?ref=<referrer's account_number> and the
-- referrer who sent them both get a one-off bonus of AI uses -- reusing ai_bonus_uses (already
-- exists, already admin-grantable one-off via /admin/grant-ai-uses-action.ts) rather than inventing
-- a second reward currency. account_number doubles as the shareable referral code since it's
-- already a unique, stable, human-typeable identifier on every profile -- no new code column needed.

alter table profiles add column if not exists referred_by_profile_id uuid references profiles(id);

insert into numeric_settings (key, value)
values ('referral_bonus_ai_uses', 10)
on conflict (key) do nothing;

-- Extends the original handle_new_user() (20260101001500) to also capture referred_by_profile_id
-- (looked up by the referrer's account_number, passed through signUp's raw_user_meta_data the same
-- way username/display_name already are) and grant both sides the configured bonus.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_bonus integer;
begin
  insert into public.profiles (auth_user_id, username, display_name, referred_by_profile_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name',
    (select id from profiles where account_number::text = new.raw_user_meta_data->>'referral_code')
  )
  returning referred_by_profile_id into v_referrer_id;

  if v_referrer_id is not null then
    select value into v_bonus from numeric_settings where key = 'referral_bonus_ai_uses';
    v_bonus := coalesce(v_bonus, 10);
    update profiles set ai_bonus_uses = coalesce(ai_bonus_uses, 0) + v_bonus where id = v_referrer_id;
    update profiles set ai_bonus_uses = coalesce(ai_bonus_uses, 0) + v_bonus where auth_user_id = new.id;
  end if;

  return new;
end;
$$;
