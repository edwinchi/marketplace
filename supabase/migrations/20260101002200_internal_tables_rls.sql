-- audit_logs (+ its partitions), outbox_events, search_documents, and search_worker_leases were
-- never RLS-enabled at all (found via a systematic audit, not because anything broke — nothing
-- reads these yet). They're internal-only: background workers and audit trail, never meant to be
-- queried by end users. Enabling RLS with zero policies makes them service-role-only by default —
-- the same pattern already used for every other internal/system table in this schema.
alter table audit_logs enable row level security;
-- PostgREST/Supabase's client can query a named partition directly, bypassing the parent's RLS —
-- each existing partition needs it too, not just the parent. Any future partition created by
-- create_monthly_audit_partition() (03_indexes_partitions.sql) will need the same; that function
-- doesn't set it automatically, so this is a gap to close there too, not just here.
alter table audit_logs_default enable row level security;
alter table audit_logs_2026_08 enable row level security;
alter table audit_logs_2026_09 enable row level security;
alter table outbox_events enable row level security;
alter table search_documents enable row level security;
alter table search_worker_leases enable row level security;
