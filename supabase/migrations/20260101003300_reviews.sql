-- Real reviews between real account holders — not gated behind a completed Stripe order (payments
-- aren't wired up yet, agents.md §10 Phase 3), since offers and messaging are already real working
-- buyer-seller interactions on this platform. order_id stays as an optional link for whenever
-- checkout exists, not a requirement. One review per reviewer/reviewee pair, enforced below,
-- keeps this from being spammable — no fabricated seed rows either way.
begin;

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  reviewer_profile_id uuid not null references profiles(id),
  reviewee_profile_id uuid not null references profiles(id),
  rating smallint not null check (rating between 1 and 5),
  positive_tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  check (reviewer_profile_id <> reviewee_profile_id),
  unique (reviewer_profile_id, reviewee_profile_id)
);

alter table reviews enable row level security;

-- Reviews are public once left (matches the reference's "Reviews van anderen" being visible to
-- anyone viewing a seller), but only the reviewer can create their own, and never edit/delete
-- after the fact (keeps them honest) — matching how offers/messages are similarly append-only
-- from the non-owning party's perspective.
create policy reviews_public_read on reviews for select using (true);
create policy reviews_reviewer_insert on reviews for insert with check (reviewer_profile_id = current_profile_id());

commit;
