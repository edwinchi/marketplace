# Marketplace database bundle
This document provides a comprehensive technical blueprint for developing a robust, scalable marketplace platform inspired by the structure of Marktplaats. It outlines a sophisticated relational database architecture that uses a hierarchical taxonomy to organise products across thirty-six primary categories while supporting multi-level subcategories. A central theme of the text is the implementation of a dynamic attribute system, which allows for category-specific details—such as vehicle mileage or clothing size—without cluttering the primary data tables. Beyond simple listings, the source details essential operational modules including user authentication, secure payment processing, and moderation tools to ensure a professional and safe trading environment. Overall, the purpose of the text is to offer a ready-to-implement PostgreSQL and Supabase framework that separates stable data identifiers from multilingual display labels for maximum flexibility.


Run files in order: `00_core.sql`, `01_taxonomy_i18n.sql`, `02_marketplace.sql`, `03_indexes_partitions.sql`, then `04_seed.sql`.

## Multilingual strategy
Keep stable machine keys language-neutral. Put category, attribute and option labels in normalized translation tables keyed by entity and language. Keep each listing source language in `listings.source_language`; add optional human or machine-reviewed copies in `listing_translations`. Store unit codes rather than translated unit labels and format currency, dates, plurals, numbers and measurement units in the application locale. Suggested fallback: requested language, source language, platform default, then any available translation.

## Scaling strategy
1. Start with one primary PostgreSQL database plus connection pooling and object storage for media.
2. Measure with slow-query logging, `pg_stat_statements`, and `EXPLAIN (ANALYZE, BUFFERS)`.
3. Keep normal filter/sort keys as typed columns. Use JSONB only for sparse metadata.
4. Send search projections to OpenSearch, Typesense or Algolia using an outbox/CDC worker. PostgreSQL remains the source of truth.
5. Add read replicas for browsing and reporting. Keep checkout/payment writes on the primary.
6. Range-partition append-heavy audit/event tables by month. Partition listings only when measured size and access patterns justify it.
7. Use queues for images, notifications, translation, moderation, search indexing and payment webhooks.
8. Archive expired data under retention policy. Shard only after vertical scaling, indexing, caching, replicas and partitioning are exhausted.

Review privacy, moderation, tax, consumer protection, payment, retention, backup, PITR, disaster recovery and RLS requirements before production.


Yes. I can map the complete Marktplaats-style category structure and turn it into a database-ready taxonomy. Below is the verified top-level category list, followed by the database architecture needed for users, listings, category-specific attributes, images, messaging, offers, payments, shipping, moderation, favorites, notifications, business sellers, and audit history.
1. Verified top-level categories
Marktplaats currently displays the following 36 primary categories on its homepage. [marktplaats.nl]
Antiek en Kunst
Audio, Tv en Foto
Auto’s
Auto-onderdelen
Auto diversen
Boeken
Caravans en Kamperen
Cd’s en Dvd’s
Computers en Software
Contacten en Berichten
Diensten en Vakmensen
Dieren en Toebehoren
Doe-het-zelf en Verbouw
Fietsen en Brommers
Hobby en Vrije tijd
Huis en Inrichting
Huizen en Kamers
Kinderen en Baby’s
Kleding | Dames
Kleding | Heren
Motoren
Muziek en Instrumenten
Postzegels en Munten
Sieraden, Tassen en Uiterlijk
Spelcomputers en Games
Sport en Fitness
Telecommunicatie
Tickets en Kaartjes
Tuin en Terras
Vacatures
Vakantie
Verzamelen
Watersport en Boten
Witgoed en Apparatuur
Zakelijke goederen
Diversen
The public category URLs also expose numeric category identifiers, such as 91 for Auto’s, 504 for Huis en Inrichting, 1847 for Tuin en Terras, and 322 for Computers en Software. These IDs should be treated as external reference values rather than copied as your platform’s internal primary keys. [marktplaats.nl]
2. Recommended category structure
Do not create a separate database table for every category. Use one hierarchical categories table with parent-child relationships.
Example:
Auto's
├── Audi
├── BMW
├── Ford
├── Mercedes-Benz
├── Tesla
├── Toyota
└── Volkswagen
Computers en Software
├── Laptops
├── Desktopcomputers
├── Monitoren
├── Computeronderdelen
├── Netwerkapparatuur
├── Printers
├── Software
└── Overige Computers en Software
The category tree should support at least three levels:
Primary category
└── Subcategory
└── Detailed category
For selected categories, you may require a fourth level:
Auto-onderdelen
└── Onderdelen
└── Remsystemen
└── Remschijven
3. Core database modules
A production marketplace database should be separated into these functional areas:
Marketplace Database
├── Accounts and authentication
├── User profiles
├── Business sellers
├── Categories
├── Category attributes
├── Listings
├── Images and attachments
├── Locations
├── Search
├── Favorites
├── Offers
├── Conversations and messages
├── Orders
├── Payments
├── Shipping
├── Reviews
├── Reports and moderation
├── Notifications
├── Seller subscriptions
└── Audit and security logs
4. Core categories table
CREATE TABLE categories (
id UUID PRIMARY KEY,
parent_id UUID REFERENCES categories(id),
external_reference VARCHAR(100),
name VARCHAR(150) NOT NULL,
slug VARCHAR(180) NOT NULL UNIQUE,
description TEXT,
level SMALLINT NOT NULL DEFAULT 1,
sort_order INTEGER NOT NULL DEFAULT 0,
icon_name VARCHAR(100),
image_url TEXT,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
allows_products BOOLEAN NOT NULL DEFAULT TRUE,
requires_moderation BOOLEAN NOT NULL DEFAULT FALSE,
listing_fee_cents INTEGER NOT NULL DEFAULT 0,
currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
metadata JSONB NOT NULL DEFAULT '{}',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_parent
ON categories(parent_id);
CREATE INDEX idx_categories_active
ON categories(is_active);
CREATE INDEX idx_categories_slug
ON categories(slug);
``
Why parent_id matters
The hierarchy becomes self-referencing:
id: 100
name: Auto's
parent_id: NULL
id: 101
name: Volkswagen
parent_id: 100
id: 102
name: Golf
parent_id: 101
This allows you to add, move, hide, reorder, or rename categories without changing the listings table.
5. Category seed data
A simplified PostgreSQL seed can start like this:
INSERT INTO categories (
id,
name,
slug,
level,
sort_order
)
VALUES
(gen_random_uuid(), 'Antiek en Kunst', 'antiek-en-kunst', 1, 10),
(gen_random_uuid(), 'Audio, Tv en Foto', 'audio-tv-en-foto', 1, 20),
(gen_random_uuid(), 'Auto''s', 'autos', 1, 30),
(gen_random_uuid(), 'Auto-onderdelen', 'auto-onderdelen', 1, 40),
(gen_random_uuid(), 'Auto diversen', 'auto-diversen', 1, 50),
(gen_random_uuid(), 'Boeken', 'boeken', 1, 60),
(gen_random_uuid(), 'Caravans en Kamperen', 'caravans-en-kamperen', 1, 70),
(gen_random_uuid(), 'Cd''s en Dvd''s', 'cds-en-dvds', 1, 80),
(gen_random_uuid(), 'Computers en Software', 'computers-en-software', 1, 90),
(gen_random_uuid(), 'Contacten en Berichten', 'contacten-en-berichten', 1, 100),
(gen_random_uuid(), 'Diensten en Vakmensen', 'diensten-en-vakmensen', 1, 110),
(gen_random_uuid(), 'Dieren en Toebehoren', 'dieren-en-toebehoren', 1, 120),
(gen_random_uuid(), 'Doe-het-zelf en Verbouw', 'doe-het-zelf-en-verbouw', 1, 130),
(gen_random_uuid(), 'Fietsen en Brommers', 'fietsen-en-brommers', 1, 140),
(gen_random_uuid(), 'Hobby en Vrije tijd', 'hobby-en-vrije-tijd', 1, 150),
(gen_random_uuid(), 'Huis en Inrichting', 'huis-en-inrichting', 1, 160),
(gen_random_uuid(), 'Huizen en Kamers', 'huizen-en-kamers', 1, 170),
(gen_random_uuid(), 'Kinderen en Baby''s', 'kinderen-en-babys', 1, 180),
(gen_random_uuid(), 'Kleding | Dames', 'kleding-dames', 1, 190),
(gen_random_uuid(), 'Kleding | Heren', 'kleding-heren', 1, 200),
(gen_random_uuid(), 'Motoren', 'motoren', 1, 210),
(gen_random_uuid(), 'Muziek en Instrumenten', 'muziek-en-instrumenten', 1, 220),
(gen_random_uuid(), 'Postzegels en Munten', 'postzegels-en-munten', 1, 230),
(gen_random_uuid(), 'Sieraden, Tassen en Uiterlijk', 'sieraden-tassen-en-uiterlijk', 1, 240),
(gen_random_uuid(), 'Spelcomputers en Games', 'spelcomputers-en-games', 1, 250),
(gen_random_uuid(), 'Sport en Fitness', 'sport-en-fitness', 1, 260),
(gen_random_uuid(), 'Telecommunicatie', 'telecommunicatie', 1, 270),
(gen_random_uuid(), 'Tickets en Kaartjes', 'tickets-en-kaartjes', 1, 280),
(gen_random_uuid(), 'Tuin en Terras', 'tuin-en-terras', 1, 290),
(gen_random_uuid(), 'Vacatures', 'vacatures', 1, 300),
(gen_random_uuid(), 'Vakantie', 'vakantie', 1, 310),
(gen_random_uuid(), 'Verzamelen', 'verzamelen', 1, 320),
(gen_random_uuid(), 'Watersport en Boten', 'watersport-en-boten', 1, 330),
(gen_random_uuid(), 'Witgoed en Apparatuur', 'witgoed-en-apparatuur', 1, 340),
(gen_random_uuid(), 'Zakelijke goederen', 'zakelijke-goederen', 1, 350),
(gen_random_uuid(), 'Diversen', 'diversen', 1, 360);
6. Users and seller profiles
Use separate authentication and public profile records.
CREATE TABLE profiles (
id UUID PRIMARY KEY,
auth_user_id UUID NOT NULL UNIQUE,
account_type VARCHAR(30) NOT NULL DEFAULT 'private',
username VARCHAR(60) NOT NULL UNIQUE,
display_name VARCHAR(150),
first_name VARCHAR(100),
last_name VARCHAR(100),
email_verified BOOLEAN NOT NULL DEFAULT FALSE,
phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
avatar_url TEXT,
biography TEXT,
preferred_language VARCHAR(10) DEFAULT 'nl',
status VARCHAR(30) NOT NULL DEFAULT 'active',
last_seen_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Recommended account types:
private
business
dealer
service_provider
moderator
administrator
Never store unencrypted passwords in this table. Authentication should be handled by Supabase Auth, Microsoft Entra External ID, Auth0, Clerk, Firebase Authentication, or another dedicated identity provider.
7. Business sellers
CREATE TABLE businesses (
id UUID PRIMARY KEY,
owner_profile_id UUID NOT NULL REFERENCES profiles(id),
legal_name VARCHAR(200) NOT NULL,
trading_name VARCHAR(200),
chamber_of_commerce_number VARCHAR(50),
vat_number VARCHAR(50),
website_url TEXT,
support_email VARCHAR(255),
support_phone VARCHAR(50),
logo_url TEXT,
description TEXT,
verification_status VARCHAR(30) DEFAULT 'unverified',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
For a Netherlands-focused platform, support fields for:
KvK number
VAT number
Legal business name
Trading name
Business address
Return address
Customer service information
Verification status
8. Locations
Listings should point to a normalized location record instead of storing unrestricted location text.
CREATE TABLE locations (
id UUID PRIMARY KEY,
country_code CHAR(2) NOT NULL DEFAULT 'NL',
province VARCHAR(100),
municipality VARCHAR(150),
city VARCHAR(150),
postal_code VARCHAR(20),
neighborhood VARCHAR(150),
latitude NUMERIC(9, 6),
longitude NUMERIC(9, 6),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_locations_coordinates
ON locations(latitude, longitude);
CREATE INDEX idx_locations_postal_code
ON locations(postal_code);
For privacy, do not publicly expose a private seller’s exact address. Show only an approximate city, postcode area, or map radius.
9. Listings
CREATE TABLE listings (
id UUID PRIMARY KEY,
seller_id UUID NOT NULL REFERENCES profiles(id),
business_id UUID REFERENCES businesses(id),
category_id UUID NOT NULL REFERENCES categories(id),
location_id UUID REFERENCES locations(id),
title VARCHAR(120) NOT NULL,
slug VARCHAR(180) NOT NULL,
description TEXT NOT NULL,
listing_type VARCHAR(30) NOT NULL DEFAULT 'product',
transaction_type VARCHAR(30) NOT NULL DEFAULT 'sell',
price_type VARCHAR(30) NOT NULL DEFAULT 'fixed',
price_cents BIGINT,
currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
condition_code VARCHAR(30),
quantity INTEGER NOT NULL DEFAULT 1,
delivery_available BOOLEAN NOT NULL DEFAULT FALSE,
pickup_available BOOLEAN NOT NULL DEFAULT TRUE,
offers_allowed BOOLEAN NOT NULL DEFAULT TRUE,
buyer_protection_available BOOLEAN NOT NULL DEFAULT FALSE,
status VARCHAR(30) NOT NULL DEFAULT 'draft',
moderation_status VARCHAR(30) NOT NULL DEFAULT 'pending',
view_count BIGINT NOT NULL DEFAULT 0,
favorite_count BIGINT NOT NULL DEFAULT 0,
offer_count BIGINT NOT NULL DEFAULT 0,
published_at TIMESTAMPTZ,
expires_at TIMESTAMPTZ,
sold_at TIMESTAMPTZ,
deleted_at TIMESTAMPTZ,
metadata JSONB NOT NULL DEFAULT '{}',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE (seller_id, slug)
);
CREATE INDEX idx_listings_category
ON listings(category_id);
CREATE INDEX idx_listings_seller
ON listings(seller_id);
CREATE INDEX idx_listings_status
ON listings(status);
CREATE INDEX idx_listings_price
ON listings(price_cents);
CREATE INDEX idx_listings_published
ON listings(published_at DESC);
Listing types
product
vehicle
property
service
job
ticket
animal
holiday_accommodation
wanted
free
exchange
Transaction types
sell
wanted
rent
hire
exchange
giveaway
service
vacancy
Price types
fixed
bidding
negotiable
from_price
hourly
daily
monthly
free
on_request
exchange
Listing statuses
draft
pending_review
active
reserved
sold
expired
rejected
suspended
archived
deleted
10. Category-specific attributes
A car needs mileage and fuel type. Clothing needs size and color. A house needs floor area and number of rooms. These fields should not all be placed in the main listings table.
Use a dynamic attribute system.
CREATE TABLE attributes (
id UUID PRIMARY KEY,
code VARCHAR(100) NOT NULL UNIQUE,
name VARCHAR(150) NOT NULL,
data_type VARCHAR(30) NOT NULL,
unit VARCHAR(30),
help_text TEXT,
is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Supported data types:
text
long_text
integer
decimal
boolean
date
datetime
single_select
multi_select
color
measurement
location
`
Connect attributes to categories:
CREATE TABLE category_attributes (
id UUID PRIMARY KEY,
category_id UUID NOT NULL REFERENCES categories(id),
attribute_id UUID NOT NULL REFERENCES attributes(id),
is_required BOOLEAN NOT NULL DEFAULT FALSE,
is_search_filter BOOLEAN NOT NULL DEFAULT TRUE,
sort_order INTEGER NOT NULL DEFAULT 0,
validation_rules JSONB NOT NULL DEFAULT '{}',
UNIQUE(category_id, attribute_id)
);
Store available selection options:
CREATE TABLE attribute_options (
id UUID PRIMARY KEY,
attribute_id UUID NOT NULL REFERENCES attributes(id),
value VARCHAR(150) NOT NULL,
label VARCHAR(150) NOT NULL,
sort_order INTEGER NOT NULL DEFAULT 0,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
UNIQUE(attribute_id, value)
);
Store values assigned to a listing:
CREATE TABLE listing_attribute_values (
id UUID PRIMARY KEY,
listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
attribute_id UUID NOT NULL REFERENCES attributes(id),
value_text TEXT,
value_number NUMERIC,
value_boolean BOOLEAN,
value_date DATE,
value_json JSONB,
UNIQUE(listing_id, attribute_id)
);
11. Important attributes by category
Auto’s
Marktplaats vehicle results expose information such as make, model, production year, mileage, fuel type, transmission, body style, equipment, warranty, maintenance status, financing, and environmental-zone information. [marktplaats.nl], [marktplaats.nl]
Recommended fields:
make
model
variant
production_year
registration_date
mileage_km
fuel_type
transmission
body_type
number_of_doors
number_of_seats
color
interior_color
engine_capacity_cc
power_kw
power_hp
battery_capacity_kwh
electric_range_km
license_plate
vin
apk_expiry
energy_label
emission_class
number_of_previous_owners
maintenance_history
nap_verified
warranty_available
dealer_maintained
financing_available
features
Clothing
brand
gender
clothing_type
size
color
material
fit
season
pattern
condition
original_price
Computers and software
brand
model
device_type
processor
memory_gb
storage_gb
storage_type
screen_size_inches
graphics_card
operating_system
release_year
warranty
included_accessories
Houses and rooms
property_type
offer_type
living_area_m2
plot_area_m2
number_of_rooms
number_of_bedrooms
number_of_bathrooms
construction_year
energy_label
furnished
available_from
minimum_rental_period
monthly_rent
service_costs
deposit
pets_allowed
parking
outdoor_space
Jobs
job_title
company_name
employment_type
hours_per_week
work_location_type
education_level
experience_level
salary_min
salary_max
salary_period
application_deadline
application_url
Services
service_type
service_area
hourly_rate
callout_fee
availability
certifications
years_of_experience
business_verified
remote_service_available
Animals
animal_type
breed
age
gender
microchipped
vaccinated
pedigree
registration_number
rehoming_reason
delivery_allowed
Special review and welfare controls should apply to animal listings.
Tickets
event_name
venue
event_date
event_time
ticket_type
section
row
seat
quantity
original_price
transfer_method
personalized_ticket
Boats and watersport
boat_type
brand
model
construction_year
length_m
width_m
draft_m
engine_brand
engine_type
fuel_type
engine_hours
berth_included
registration
``
12. Listing images and documents
CREATE TABLE listing_media (
id UUID PRIMARY KEY,
listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
media_type VARCHAR(20) NOT NULL DEFAULT 'image',
storage_key TEXT NOT NULL,
public_url TEXT,
thumbnail_url TEXT,
mime_type VARCHAR(100),
file_size_bytes BIGINT,
width INTEGER,
height INTEGER,
sort_order INTEGER NOT NULL DEFAULT 0,
alt_text VARCHAR(255),
moderation_status VARCHAR(30) DEFAULT 'pending',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_listing_media_listing
ON listing_media(listing_id, sort_order);
Store actual files in:
Supabase Storage
Amazon S3
Azure Blob Storage
Cloudflare R2
Do not store image binary data directly in PostgreSQL.
13. Favorites and saved searches
CREATE TABLE favorites (
profile_id UUID NOT NULL REFERENCES profiles(id),
listing_id UUID NOT NULL REFERENCES listings(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
PRIMARY KEY(profile_id, listing_id)
);
CREATE TABLE saved_searches (
id UUID PRIMARY KEY,
profile_id UUID NOT NULL REFERENCES profiles(id),
name VARCHAR(150),
search_query VARCHAR(255),
category_id UUID REFERENCES categories(id),
filters JSONB NOT NULL DEFAULT '{}',
notification_frequency VARCHAR(30) DEFAULT 'instant',
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
14. Offers and bidding
CREATE TABLE offers (
id UUID PRIMARY KEY,
listing_id UUID NOT NULL REFERENCES listings(id),
buyer_id UUID NOT NULL REFERENCES profiles(id),
amount_cents BIGINT NOT NULL,
currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
status VARCHAR(30) NOT NULL DEFAULT 'pending',
message TEXT,
expires_at TIMESTAMPTZ,
responded_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Offer statuses:
pending
accepted
declined
countered
withdrawn
expired
cancelled
To support counteroffers:
CREATE TABLE offer_events (
id UUID PRIMARY KEY,
offer_id UUID NOT NULL REFERENCES offers(id),
actor_id UUID NOT NULL REFERENCES profiles(id),
event_type VARCHAR(30) NOT NULL,
amount_cents BIGINT,
message TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
15. Messaging
CREATE TABLE conversations (
id UUID PRIMARY KEY,
listing_id UUID REFERENCES listings(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE conversation_participants (
conversation_id UUID NOT NULL REFERENCES conversations(id),
profile_id UUID NOT NULL REFERENCES profiles(id),
last_read_at TIMESTAMPTZ,
is_muted BOOLEAN NOT NULL DEFAULT FALSE,
PRIMARY KEY(conversation_id, profile_id)
);
CREATE TABLE messages (
id UUID PRIMARY KEY,
conversation_id UUID NOT NULL REFERENCES conversations(id),
sender_id UUID NOT NULL REFERENCES profiles(id),
message_type VARCHAR(30) NOT NULL DEFAULT 'text',
content TEXT,
attachment_url TEXT,
moderation_status VARCHAR(30) DEFAULT 'approved',
read_at TIMESTAMPTZ,
deleted_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Add controls for:
Spam detection
Suspicious links
Phone-number harvesting
Harassment
Scam patterns
Blocked users
Message reporting
Attachment scanning
16. Orders, payments and shipping
CREATE TABLE orders (
id UUID PRIMARY KEY,
listing_id UUID NOT NULL REFERENCES listings(id),
buyer_id UUID NOT NULL REFERENCES profiles(id),
seller_id UUID NOT NULL REFERENCES profiles(id),
accepted_offer_id UUID REFERENCES offers(id),
quantity INTEGER NOT NULL DEFAULT 1,
subtotal_cents BIGINT NOT NULL,
shipping_cents BIGINT NOT NULL DEFAULT 0,
protection_fee_cents BIGINT NOT NULL DEFAULT 0,
platform_fee_cents BIGINT NOT NULL DEFAULT 0,
total_cents BIGINT NOT NULL,
currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE payments (
id UUID PRIMARY KEY,
order_id UUID NOT NULL REFERENCES orders(id),
provider VARCHAR(50) NOT NULL,
provider_payment_id VARCHAR(255),
amount_cents BIGINT NOT NULL,
currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
status VARCHAR(30) NOT NULL,
payment_method VARCHAR(50),
failure_reason TEXT,
paid_at TIMESTAMPTZ,
refunded_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE shipments (
id UUID PRIMARY KEY,
order_id UUID NOT NULL REFERENCES orders(id),
carrier VARCHAR(50),
service_level VARCHAR(100),
tracking_number VARCHAR(150),
tracking_url TEXT,
label_url TEXT,
status VARCHAR(30) NOT NULL DEFAULT 'pending',
shipped_at TIMESTAMPTZ,
delivered_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Never store complete card numbers or card security codes. Let a regulated payment provider handle card and payment credentials.
17. Reviews and reputation
CREATE TABLE reviews (
id UUID PRIMARY KEY,
order_id UUID REFERENCES orders(id),
reviewer_id UUID NOT NULL REFERENCES profiles(id),
reviewed_profile_id UUID NOT NULL REFERENCES profiles(id),
rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
communication_rating SMALLINT CHECK (
communication_rating BETWEEN 1 AND 5
),
description_accuracy_rating SMALLINT CHECK (
description_accuracy_rating BETWEEN 1 AND 5
),
comment TEXT,
status VARCHAR(30) NOT NULL DEFAULT 'published',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(order_id, reviewer_id)
);
Reputation indicators can include:
Average rating
Number of completed transactions
Account age
Email verification
Phone verification
Business verification
Response rate
Response time
Cancellation rate
Number of confirmed reports
18. Reporting and moderation
CREATE TABLE reports (
id UUID PRIMARY KEY,
reporter_id UUID REFERENCES profiles(id),
reported_listing_id UUID REFERENCES listings(id),
reported_profile_id UUID REFERENCES profiles(id),
reported_message_id UUID REFERENCES messages(id),
reason_code VARCHAR(50) NOT NULL,
description TEXT,
status VARCHAR(30) NOT NULL DEFAULT 'open',
assigned_moderator_id UUID REFERENCES profiles(id),
resolution TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
resolved_at TIMESTAMPTZ
);
Report reasons:
fraud
counterfeit
prohibited_item
incorrect_category
misleading_description
duplicate_listing
spam
harassment
stolen_item
animal_welfare
illegal_content
privacy_violation
other
Maintain a configurable prohibited-items table:
CREATE TABLE prohibited_rules (
id UUID PRIMARY KEY,
rule_name VARCHAR(150) NOT NULL,
category_id UUID REFERENCES categories(id),
keywords TEXT[],
severity VARCHAR(30) NOT NULL,
action VARCHAR(30) NOT NULL,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
19. Notifications
CREATE TABLE notifications (
id UUID PRIMARY KEY,
profile_id UUID NOT NULL REFERENCES profiles(id),
notification_type VARCHAR(50) NOT NULL,
title VARCHAR(200) NOT NULL,
body TEXT,
action_url TEXT,
payload JSONB NOT NULL DEFAULT '{}',
channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
status VARCHAR(30) NOT NULL DEFAULT 'pending',
read_at TIMESTAMPTZ,
sent_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Channels:
in_app
email
push
sms
whatsapp
Notification events:
New message
New offer
Offer accepted or rejected
Listing expiring
Saved-search match
Payment received
Shipping update
Review request
Moderation decision
Suspicious-login warning
20. Search architecture
PostgreSQL search is suitable for the MVP. At larger scale, replicate active listings into:
Elasticsearch
OpenSearch
Typesense
Meilisearch
Algolia
The search record should include:
listing_id
title
description
category path
price
condition
seller type
city
postcode area
latitude
longitude
category attributes
publication date
promoted status
seller reputation
Recommended ranking inputs:
text relevance
category match
distance
listing freshness
image availability
seller quality
engagement
promotion level
price relevance
fraud risk
`
Keep sponsored placement identifiable and separate from organic relevance.
21. Promotions and subscriptions
CREATE TABLE listing_promotions (
id UUID PRIMARY KEY,
listing_id UUID NOT NULL REFERENCES listings(id),
promotion_type VARCHAR(30) NOT NULL,
price_cents BIGINT NOT NULL,
starts_at TIMESTAMPTZ NOT NULL,
ends_at TIMESTAMPTZ NOT NULL,
status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Promotion types:
featured
top_listing
homepage
category_highlight
urgent
refresh
Business subscriptions could include:
free
starter
professional
dealer
enterprise
22. Audit and security
CREATE TABLE audit_logs (
id UUID PRIMARY KEY,
actor_id UUID REFERENCES profiles(id),
action VARCHAR(100) NOT NULL,
entity_type VARCHAR(50) NOT NULL,
entity_id UUID,
previous_values JSONB,
new_values JSONB,
ip_address INET,
user_agent TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Also maintain:
Login events
Failed login attempts
Device sessions
Account blocks
Rate-limit events
Payment webhook history
Moderation decisions
Listing changes
Consent history
Data-export requests
Account-deletion requests
23. Recommended technology stack for your version
Based on the stack you already use, this would work well:
Frontend:
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Backend:
Next.js server functions or API routes
Supabase Edge Functions for isolated workflows
Database:
Supabase PostgreSQL
Authentication:
Supabase Auth
Media:
Supabase Storage or Cloudflare R2
Search:
PostgreSQL initially
Typesense or OpenSearch after scaling
Payments:
Stripe Connect
iDEAL-enabled payment integration
Email:
Resend
Maps:
Mapbox or Google Maps
Monitoring:
Sentry
PostHog
Supabase logs
Deployment:
Vercel
24. Important implementation note
The 36 primary categories can be created immediately. However, the deeper taxonomy and attributes should be stored as configurable seed data rather than hardcoded into the application.
The ideal deliverable would contain:
database-schema.sql
categories.csv
subcategories.csv
attributes.csv
attribute-options.csv
category-attribute-mappings.csv
prohibited-items.csv
seed-database.sql
database-relationships.md
This gives you:
A complete PostgreSQL schema
A hierarchical category tree
Dynamic category-specific fields
Search and filter definitions
Supabase-compatible seed files
Payment, messaging and shipping structures
Moderation and audit controls
Room to modify the taxonomy without changing application code
Main design improvement
The most important architectural decision is separating categories, attribute definitions, and listing values. This prevents the database from becoming a single enormous listings table with hundreds of mostly empty columns, while still supporting specialized areas such as vehicles, property, jobs, animals, clothing, tickets, and services.
I generated a PostgreSQL and Supabase-compatible database bundle covering the marketplace schema, multilingual taxonomy, listing attributes, commerce, messaging, moderation, indexing, and partitioning.