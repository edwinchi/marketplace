CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE languages(code varchar(10) PRIMARY KEY, english_name varchar(80) NOT NULL, native_name varchar(80) NOT NULL, direction varchar(3) NOT NULL DEFAULT 'ltr' CHECK(direction IN ('ltr','rtl')), is_default boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true);
CREATE UNIQUE INDEX one_default_language ON languages(is_default) WHERE is_default;
CREATE TABLE profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_user_id uuid NOT NULL UNIQUE, username citext NOT NULL UNIQUE, account_type varchar(30) NOT NULL DEFAULT 'private', display_name varchar(150), preferred_language varchar(10) REFERENCES languages(code), email_verified boolean NOT NULL DEFAULT false, phone_verified boolean NOT NULL DEFAULT false, status varchar(30) NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_profile_id uuid NOT NULL REFERENCES profiles(id), legal_name varchar(200) NOT NULL, trading_name varchar(200), chamber_of_commerce_number varchar(50), vat_number varchar(50), verification_status varchar(30) NOT NULL DEFAULT 'unverified', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE locations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code char(2) NOT NULL DEFAULT 'NL', province varchar(100), municipality varchar(150), city varchar(150), postal_code varchar(20), neighborhood varchar(150), latitude numeric(9,6), longitude numeric(9,6));
