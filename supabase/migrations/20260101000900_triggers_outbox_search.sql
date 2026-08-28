CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE outbox_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, aggregate_type varchar(80) NOT NULL, aggregate_id uuid NOT NULL, event_type varchar(120) NOT NULL, payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, attempts integer NOT NULL DEFAULT 0, last_error text);
CREATE INDEX outbox_pending_idx ON outbox_events(available_at,id) WHERE processed_at IS NULL;
CREATE OR REPLACE FUNCTION listing_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO outbox_events(aggregate_type,aggregate_id,event_type,payload) VALUES('listing',NEW.id,CASE WHEN TG_OP='INSERT' THEN 'listing.created' ELSE 'listing.updated' END,jsonb_build_object('listing_id',NEW.id,'status',NEW.status,'updated_at',NEW.updated_at)); RETURN NEW; END $$;
CREATE TRIGGER listing_outbox_trigger AFTER INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION listing_outbox();

CREATE TABLE search_documents(listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,language_code varchar(10) NOT NULL REFERENCES languages(code),document jsonb NOT NULL,index_version integer NOT NULL DEFAULT 1,indexed_at timestamptz,status varchar(20) NOT NULL DEFAULT 'pending',last_error text,PRIMARY KEY(listing_id,language_code));
CREATE TABLE search_worker_leases(worker_key varchar(120) PRIMARY KEY,leased_by varchar(120),lease_until timestamptz,heartbeat_at timestamptz);
CREATE INDEX search_documents_pending_idx ON search_documents(status,listing_id) WHERE status IN ('pending','failed');
