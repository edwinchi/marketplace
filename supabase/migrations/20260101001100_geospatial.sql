-- Proximity search ("near me"). Adds a geography column to the existing generic
-- locations table (data/00_core.sql) instead of the NL-only provinces/municipalities
-- model in data/08_nl_geography.sql, which does not generalize across countries.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE locations ADD COLUMN geog geography(Point, 4326);

UPDATE locations
SET geog = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX locations_geog_idx ON locations USING gist(geog);

CREATE OR REPLACE FUNCTION locations_set_geog() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER locations_set_geog_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON locations
  FOR EACH ROW EXECUTE FUNCTION locations_set_geog();

-- Proximity query shape for app code:
-- SELECT l.*, ST_Distance(l.geog, $point) AS distance_m
-- FROM listings ls JOIN locations l ON l.id = ls.location_id
-- WHERE ls.status = 'active' AND ST_DWithin(l.geog, $point, $radius_m)
-- ORDER BY distance_m ASC;
