-- Lets a seller flag AI-generated listing text (title/description/attribute guesses) as wrong,
-- offensive, or off-topic -- the "Meld dat hier" feedback link from the Marktplaats reference.
-- Insert-only from the app's side: no update/delete/select policy for authenticated/anon at all,
-- so once submitted a report can't be edited or read back by its own submitter -- same one-way
-- shape as a content report on any platform. An admin reviews these via the service-role client
-- (app/admin/ai-reports/page.tsx), the same pattern the existing moderation queue already uses.
create table if not exists ai_output_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text not null,
  extra_text text,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now()
);

alter table ai_output_reports enable row level security;

create policy ai_output_reports_insert_own on ai_output_reports for insert
  with check (reporter_id = current_profile_id());
