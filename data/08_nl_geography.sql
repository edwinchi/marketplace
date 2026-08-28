CREATE TABLE provinces(code varchar(4) PRIMARY KEY,name_nl varchar(100) NOT NULL, country_code char(2) NOT NULL DEFAULT 'NL');
CREATE TABLE municipalities(code varchar(8) PRIMARY KEY,province_code varchar(4) REFERENCES provinces(code),name_nl varchar(150) NOT NULL,is_active boolean NOT NULL DEFAULT true,valid_from date,valid_to date);
CREATE TABLE municipality_import_staging(code varchar(8),province_code varchar(4),name_nl varchar(150),valid_from date,valid_to date);

INSERT INTO provinces(code,name_nl) VALUES('PV20','Drenthe') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV21','Flevoland') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV22','Friesland') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV23','Gelderland') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV24','Groningen') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV25','Limburg') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV26','Noord-Brabant') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV27','Noord-Holland') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV28','Overijssel') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV29','Utrecht') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV30','Zeeland') ON CONFLICT DO NOTHING;
INSERT INTO provinces(code,name_nl) VALUES('PV31','Zuid-Holland') ON CONFLICT DO NOTHING;
CREATE OR REPLACE PROCEDURE merge_municipality_import() LANGUAGE sql AS $$
INSERT INTO municipalities(code,province_code,name_nl,is_active,valid_from,valid_to)
SELECT code,province_code,name_nl,(valid_to IS NULL OR valid_to>=current_date),valid_from,valid_to FROM municipality_import_staging
ON CONFLICT(code) DO UPDATE SET province_code=EXCLUDED.province_code,name_nl=EXCLUDED.name_nl,is_active=EXCLUDED.is_active,valid_from=EXCLUDED.valid_from,valid_to=EXCLUDED.valid_to;
$$;
-- Load the current official CBS municipality export into municipality_import_staging, then CALL merge_municipality_import().
