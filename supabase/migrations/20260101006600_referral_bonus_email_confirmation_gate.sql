-- Security fix: the referral bonus was granted at raw signup (handle_new_user() fires on the
-- initial auth.users INSERT, the instant supabase.auth.signUp() is called) -- BEFORE any email
-- confirmation. That meant anyone could script repeated signups with disposable/unconfirmed email
-- addresses via /login?ref=<their own account_number> and farm +10 ai_bonus_uses per fake account
-- with zero email deliverability required. Moves the bonus grant to the moment the email is
-- actually confirmed instead, and adds a per-referrer lifetime cap as defense in depth against a
-- determined attacker with real, confirmable mailboxes.
--
-- Also fixes an unrelated-but-adjacent bug found while working on this: profiles.email_verified
-- (20260101000000_core.sql) was never synced from auth.users.email_confirmed_at by anything --
-- permanently false for every account regardless of real confirmation status. The same trigger
-- this migration needs anyway (firing exactly once, when a user's email is actually confirmed)
-- fixes both issues together.

-- handle_new_user() now only records who referred whom -- no bonus granted at this point anymore.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, username, display_name, referred_by_profile_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name',
    (select id from profiles where account_number::text = new.raw_user_meta_data->>'referral_code')
  );
  return new;
end;
$$;

insert into numeric_settings (key, value)
values ('referral_bonus_max_per_referrer', 20)
on conflict (key) do nothing;

create or replace function handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_referrer_id uuid;
  v_bonus integer;
  v_cap integer;
  v_already_credited integer;
begin
  -- Fixes the separate email_verified bug for every account, referred or not -- this trigger
  -- fires on every real email confirmation, not just referral signups.
  update profiles set email_verified = true
    where auth_user_id = new.id
    returning id, referred_by_profile_id into v_profile_id, v_referrer_id;

  if v_referrer_id is not null then
    select value into v_cap from numeric_settings where key = 'referral_bonus_max_per_referrer';
    v_cap := coalesce(v_cap, 20);

    select count(*) into v_already_credited
      from profiles p
      where p.referred_by_profile_id = v_referrer_id and p.email_verified = true and p.id != v_profile_id;

    if v_already_credited < v_cap then
      select value into v_bonus from numeric_settings where key = 'referral_bonus_ai_uses';
      v_bonus := coalesce(v_bonus, 10);
      update profiles set ai_bonus_uses = coalesce(ai_bonus_uses, 0) + v_bonus where id = v_referrer_id;
      update profiles set ai_bonus_uses = coalesce(ai_bonus_uses, 0) + v_bonus where id = v_profile_id;
    end if;
  end if;

  return new;
end;
$$;

-- WHEN clause is the whole guard against double-firing -- email_confirmed_at transitions from
-- null to a real timestamp exactly once per account (GoTrue never resets it back to null), so
-- there's no need for a separate "already granted" flag.
drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function handle_email_confirmed();
