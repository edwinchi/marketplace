CREATE TABLE vehicle_makes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), stable_key varchar(120) UNIQUE NOT NULL, name varchar(120) NOT NULL, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE vehicle_models(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), make_id uuid NOT NULL REFERENCES vehicle_makes(id), stable_key varchar(160) NOT NULL, name varchar(160) NOT NULL, is_active boolean NOT NULL DEFAULT true, UNIQUE(make_id,stable_key));
INSERT INTO vehicle_makes(stable_key,name) VALUES ('audi','Audi'),('bmw','BMW'),('ford','Ford'),('hyundai','Hyundai'),('kia','Kia'),('mercedes-benz','Mercedes-Benz'),('nissan','Nissan'),('peugeot','Peugeot'),('renault','Renault'),('skoda','Skoda'),('tesla','Tesla'),('toyota','Toyota'),('volkswagen','Volkswagen'),('volvo','Volvo') ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models(make_id,stable_key,name) SELECT id,'model-3','Model 3' FROM vehicle_makes WHERE stable_key='tesla' ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models(make_id,stable_key,name) SELECT id,'golf','Golf' FROM vehicle_makes WHERE stable_key='volkswagen' ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models(make_id,stable_key,name) SELECT id,'corolla','Corolla' FROM vehicle_makes WHERE stable_key='toyota' ON CONFLICT DO NOTHING;
-- Refresh this catalog from RDW open data in a scheduled ETL. Do not treat this starter list as exhaustive.
