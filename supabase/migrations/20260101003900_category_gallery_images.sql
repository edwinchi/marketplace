-- Per-category stock photo gallery, for category browse pages. Sourced from free-licensed
-- external images (e.g. Wikimedia Commons), so license/author/source are tracked alongside the
-- stored file for attribution purposes -- these are not user uploads.
create table if not exists category_gallery_images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  storage_key text not null,
  sort_order integer not null default 0,
  source_url text,
  author text,
  license text,
  created_at timestamptz not null default now()
);

create index if not exists category_gallery_images_category_id_idx on category_gallery_images(category_id);

alter table category_gallery_images enable row level security;

create policy "category_gallery_images_read" on category_gallery_images
  for select using (true);
