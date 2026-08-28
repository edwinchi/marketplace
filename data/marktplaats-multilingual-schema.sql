-- ============================================================================
-- SQL SCHEMA FOR MARKTPLAATS REPLICATION (MULTILINGUAL: ENGLISH & FRENCH)
-- ============================================================================
-- Designed for PostgreSQL with PostGIS support for location-based search ("Kijk in je Wijk").
-- Includes complete category translation mapping (English & French) and the escrow transaction ledger.
-- ============================================================================

-- Enable PostGIS extension for proximity geosearch
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create Enums
CREATE TYPE user_role_type AS ENUM ('private', 'professional');
CREATE TYPE merchant_package_type AS ENUM ('none', 'pro_basic', 'pro_premium');
CREATE TYPE price_type AS ENUM ('fixed', 'bidding', 'free', 'contact_us');
CREATE TYPE ad_status AS ENUM ('active', 'reserved', 'sold', 'expired');
CREATE TYPE ad_boost_type AS ENUM ('top_ad', 'daily_bump', 'spotlight');
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE message_type AS ENUM ('text', 'payment_request', 'system_notification');
CREATE TYPE escrow_state AS ENUM (
    'payment_requested', 
    'funds_escrowed', 
    'item_shipped', 
    'delivered', 
    'funds_released', 
    'disputed', 
    'refunded'
);
CREATE TYPE shipping_carrier AS ENUM ('budbee', 'postnl', 'dhl', 'local_pickup');

-- 1. Users & Profiles (Supports C2C Casual & B2C Pro)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role_type DEFAULT 'private' NOT NULL,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    postcode VARCHAR(20),
    city_en VARCHAR(100),
    city_fr VARCHAR(100),
    location GEOMETRY(Point, 4326), -- For distance calculation ("Kijk in je Wijk")
    company_name VARCHAR(255),       -- Pro merchants
    vat_number VARCHAR(50),          -- Pro merchants
    package_type merchant_package_type DEFAULT 'none',
    logo_url VARCHAR(255)
);

-- 2. Multilingual Category Taxonomy (Hierarchical Tree)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    priority INT DEFAULT 0,
    is_vertical_special BOOLEAN DEFAULT FALSE -- e.g., Cars, Houses, Jobs requiring custom forms
);

-- Index for speedy hierarchical lookups
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 3. Advertisements Table
CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2),
    price_type price_type DEFAULT 'fixed' NOT NULL,
    status ad_status DEFAULT 'active' NOT NULL,
    location_postcode VARCHAR(20) NOT NULL,
    location_geom GEOMETRY(Point, 4326), -- Ad-specific location
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX idx_ads_category ON ads(category_id);
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ads_location ON ads USING gist(location_geom);

-- 4. Ad Images Block
CREATE TABLE ad_images (
    id SERIAL PRIMARY KEY,
    ad_id INT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0
);

-- 5. Ad Boosts / Promotion System ("Opvallen")
CREATE TABLE ad_boosts (
    id SERIAL PRIMARY KEY,
    ad_id INT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    boost_type ad_boost_type NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. Bidding Engine
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    ad_id INT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status bid_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Chat Engine & Messaging (Secure In-Chat Flow)
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    ad_id INT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ad_id, buyer_id, seller_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type message_type DEFAULT 'text' NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB, -- Can hold structured payment request triggers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Integrated Escrow & Transactions ("Betalen en Verzenden" / "Kopersbescherming")
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    buyer_id INT NOT NULL REFERENCES users(id),
    seller_id INT NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    buyer_protection_fee NUMERIC(8, 2) DEFAULT 0.00, -- Escrow fee (Kopersbescherming)
    shipping_fee NUMERIC(8, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    escrow_status escrow_state DEFAULT 'payment_requested' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Logistics / Shipping details ("Meer verzendgemak")
CREATE TABLE shipping_details (
    transaction_id INT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    carrier shipping_carrier NOT NULL,
    tracking_code VARCHAR(100),
    shipping_label_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'label_created'
);

-- ============================================================================
-- SEED DATA: MULTILINGUAL CATEGORY TAXONOMY (ENGLISH & FRENCH)
-- ============================================================================

-- Top-Level Categories
INSERT INTO categories (id, parent_id, slug, name_en, name_fr, priority, is_vertical_special) VALUES
(1, NULL, 'cars', 'Cars', 'Voitures', 100, TRUE),
(2, NULL, 'home-furniture', 'Home & Furniture', 'Maison & Ameublement', 90, FALSE),
(3, NULL, 'computers-software', 'Computers & Software', 'Informatique & Logiciels', 85, FALSE),
(4, NULL, 'womens-clothing', 'Women''s Clothing', 'Vêtements | Femmes', 80, FALSE),
(5, NULL, 'books', 'Books', 'Livres', 75, FALSE),
(6, NULL, 'caravans-camping', 'Caravans & Camping', 'Caravanes & Camping', 70, FALSE),
(7, NULL, 'diy-renovation', 'DIY & Renovation', 'Bricolage & Rénovation', 65, FALSE),
(8, NULL, 'services-trades', 'Services & Tradespeople', 'Services & Artisans', 60, TRUE),
(9, NULL, 'jobs', 'Jobs', 'Emplois', 55, TRUE),
(10, NULL, 'real-estate', 'Real Estate', 'Immobilier', 50, TRUE),
(11, NULL, 'business-goods', 'Business Goods', 'Biens Professionnels', 45, FALSE);

-- Subcategories under 'Books' (Category ID 5)
INSERT INTO categories (id, parent_id, slug, name_en, name_fr, priority) VALUES
(501, 5, 'books-food-cooking', 'Food & Cooking', 'Cuisine & Gastronomie', 10),
(502, 5, 'books-history-politics', 'History & Politics', 'Histoire & Politique', 9),
(503, 5, 'books-children-youth', 'Children & Youth', 'Enfants & Jeunesse', 8),
(504, 5, 'books-art-culture', 'Art & Culture', 'Art & Culture', 7),
(505, 5, 'books-popular-fiction', 'Popular Fiction', 'Fiction Populaire', 6);

-- Subcategories under 'DIY & Renovation' (Category ID 7)
INSERT INTO categories (id, parent_id, slug, name_en, name_fr, priority) VALUES
(701, 7, 'diy-sanitary', 'Sanitary Ware', 'Sanitaires', 10),
(702, 7, 'diy-heating-radiators', 'Heating & Radiators', 'Chauffage & Radiateurs', 9),
(703, 7, 'diy-electrical', 'Electrical & Cabling', 'Électricité & Câblage', 8),
(704, 7, 'diy-tools', 'Hand Tools', 'Outils à main', 7);

-- Subcategories under 'Home & Furniture' (Category ID 2)
INSERT INTO categories (id, parent_id, slug, name_en, name_fr, priority) VALUES
(201, 2, 'home-chairs', 'Chairs', 'Chaises', 10),
(202, 2, 'home-beds', 'Beds & Bedrooms', 'Lits & Chambre', 9),
(203, 2, 'home-lighting', 'Lighting & Lamps', 'Luminaires & Lampes', 8),
(204, 2, 'home-kitchen', 'Kitchenware & Tableware', 'Arts de la table & Cuisine', 7);
