-- General-purpose rate-limit event log. One row per attempt; a bucket_key (e.g. "signup:1.2.3.4")
-- plus a rolling time-window count query is enough to rate-limit any action without a separate
-- Redis/Upstash dependency -- this project's traffic doesn't need anything more than that yet.
-- Service-role only (no RLS policies): every check/insert goes through createServiceClient(), same
-- pattern as stripe_webhook_events.
CREATE TABLE rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_events_bucket_key_created_at_idx ON rate_limit_events(bucket_key, created_at);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
