CREATE INDEX categories_parent_idx ON categories(parent_id,sort_order) WHERE is_active;
CREATE INDEX category_name_trgm_idx ON category_translations USING gin(name gin_trgm_ops);
CREATE INDEX listings_active_feed_idx ON listings(category_id,published_at DESC) INCLUDE(price_minor,seller_id) WHERE status='active';
CREATE INDEX listings_seller_idx ON listings(seller_id,created_at DESC);
CREATE INDEX listings_metadata_gin_idx ON listings USING gin(metadata jsonb_path_ops);
CREATE INDEX listing_title_trgm_idx ON listing_translations USING gin(title gin_trgm_ops);
CREATE INDEX listing_attr_number_idx ON listing_attribute_values(attribute_id,value_number,listing_id) WHERE value_number IS NOT NULL;
CREATE INDEX listing_attr_option_idx ON listing_attribute_values(attribute_id,value_option_id,listing_id) WHERE value_option_id IS NOT NULL;
CREATE INDEX messages_conversation_idx ON messages(conversation_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX notifications_unread_idx ON notifications(profile_id,created_at DESC) WHERE read_at IS NULL;
CREATE INDEX audit_created_brin_idx ON audit_logs USING brin(created_at);

CREATE OR REPLACE FUNCTION create_monthly_audit_partition(month_start date) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n text := 'audit_logs_' || to_char(month_start,'YYYY_MM'); e date := (month_start+interval '1 month')::date;
BEGIN EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',n,month_start,e); END $$;
SELECT create_monthly_audit_partition(date_trunc('month',current_date)::date);
SELECT create_monthly_audit_partition((date_trunc('month',current_date)+interval '1 month')::date);
