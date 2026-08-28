-- Records what the AI listing assistant suggested for a listing, for seller review,
-- audit, and future tuning. Adapted from ad_ai_metadata in
-- data/schema.sql (formerly marktplaats-multilingual-schema-v2.sql) onto the UUID listings table.
CREATE TABLE listing_ai_metadata(
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  raw_vision_analysis jsonb NOT NULL DEFAULT '{}',
  confidence_score numeric(5,2),
  detected_brand varchar(100),
  detected_condition varchar(50),
  suggested_category_id uuid REFERENCES categories(id),
  suggested_price_min_minor bigint,
  suggested_price_max_minor bigint,
  suggested_currency_code char(3),
  automated_tags text[] NOT NULL DEFAULT '{}',
  model_name varchar(100),
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listing_ai_metadata ENABLE ROW LEVEL SECURITY;

-- Read-only to the listing's own seller. Writes come only from the trusted server
-- route that calls the vision model, using the Supabase service role (bypasses RLS).
CREATE POLICY listing_ai_metadata_seller_read ON listing_ai_metadata FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM listings l WHERE l.id = listing_id AND l.seller_id = current_profile_id()
  ));
