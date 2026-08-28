# SokoCoin (LokoTrade): Ultimate Master Specification & AI-First Docker Blueprint

This document is the master engineering specification and operational roadmap for building, running, and scaling **SokoCoin (or LokoTrade)**, a next-generation classifieds platform modeled directly after Marktplaats.nl, optimized for the African continent.

---

## 🌍 Part 1: The Business & Architectural Reality of Marktplaats

If you're asking **"what did it take to build a site like Marktplaats.nl?"**, the answer is: much more than just a website.

Marktplaats started in 1999 as a relatively simple classified ads platform and evolved into one of the Netherlands' largest online marketplaces, serving more than 8 million monthly visitors and millions of active listings. 

### 1. What Marktplaats Consists of Today

#### **A. Frontend Application**
The website and mobile applications that users interact with:
*   Homepage and infinite-scroll listing discovery grids
*   Highly categorized Search Results and Product Listing Pages (PLPs)
*   User profiles, favorites, and transactional watchlists
*   In-app Messaging/Chat systems with real-time delivery statuses
*   Highly optimized mobile responsive designs and native iOS/Android mobile apps

*Current technology scans indicate the use of Next.js, Node.js, modern JavaScript frameworks, and AWS-hosted infrastructure.*

#### **B. Massive Backend Platform**
Under the hood, Marktplaats operates as a highly distributed microservices platform:
```text
API Gateway Layer
├── User Service (Authentication, profiles, and verification)
├── Listings Service (Ad posting, updates, and moderation queues)
├── Search Service (Indexing, filtering, and recommendations)
├── Messaging Service (Real-time user chats & system payment triggers)
├── Payment Service (Escrow accounts, processing, and merchant subscription billing)
├── Notification Service (Push messages, emails, and SMS alerts)
└── Analytics Service (User tracking, click rates, and business reporting)
```

#### **C. Search Engine**
Search is the absolute heart of the classifieds experience. It requires complex filtering mechanisms:
*   Keyword fuzzy text search with typo tolerance
*   Hierarchical category filtering
*   Postcode-based location geosearch (proximity sorting)
*   Dynamic price range filtering
*   Relevance ranking and sponsored ("promoted") listings algorithms
*   *Typically powered by: Elasticsearch, OpenSearch, or Solr.*

#### **D. Database Infrastructure**
To support millions of active listings, historic transactions, and active chats without performance bottlenecks:
*   **Relational Database:** PostgreSQL or MySQL for transactions, users, and relational integrity.
*   **Caching Layer:** Redis for lightning-fast session storage and live chat message routing.
*   **Search Indexes:** Highly optimized search index stores.
*   **Object Storage:** Cloud-based object storage (like AWS S3) for compressing and serving millions of ad images via a global CDN.

#### **E. Cloud Infrastructure**
Technology scans show extensive AWS infrastructure backed by AWS WAF (Web Application Firewall) to block scraping and DDOS attacks:
```text
AWS Production Topology
├── EC2 / ECS Containers (Running scalable application compute)
├── Managed RDS (PostgreSQL with clustering)
├── S3 Bucket (Object storage for listing assets)
├── CloudFront CDN (Global media distribution)
├── AWS WAF (Web Application Firewall & security)
├── Application Load Balancers (Traffic distribution)
└── CloudWatch (Monitoring, logging, and metrics)
```

#### **F. Security & Trust Systems**
A massive investment area necessary to keep the marketplace from becoming unusable:
*   Automated scam and phishing link detection
*   Fake account and bot creation detection
*   Seller identity validation (KYC/ID checks)
*   Rate limiting and spam prevention
*   Human-in-the-loop content moderation dashboards

#### **G. Integrated Payment & Shipping**
Modern classifieds cannot survive on simple listings alone. They require complete transactional loops:
*   **Integrated Payments ("Betaalverzoeken"):** In-chat payment requests and processing.
*   **Smart Shipping ("Meer verzendgemak"):** Automated shipping label generation with multiple carrier options.
*   **Buyer Protection ("Kopersbescherming"):** Secure escrow hold of funds until delivery tracking confirms successful delivery.
*   **Dispute & Mediation Management:** Administrative portals to resolve buyer/seller conflicts.

---

### 2. The Scaling Equation: Legacy vs. Modern AI-First Team

#### **The Legacy Scaling Path**
To build a platform of Marktplaats's size from scratch using older frameworks required massive teams and capital:
*   **To build a solid MVP (first version):** Required **7–15 people** (2-4 Frontend Developers, 3-6 Backend Developers, 1 UX Designer, 1 Product Manager, 1-2 QA Engineers, 1 DevOps Engineer) working for **6–12 months**.
*   **To run at scale today:** A marketplace of this volume involves **50–200+ engineers**, dedicated product managers, security teams, data scientists, fraud specialists, marketing teams, and massive customer support networks. Operating costs easily run into millions of euros per year. (eBay famously acquired Marktplaats for €225 million in 2004, and it later joined the Adevinta classifieds portfolio).

#### **The Modern AI-First Scaling Path (SokoCoin Approach)**
By leveraging modern, pre-built API infrastructures, containerized microservices, and AI-first engineering tools (like Claude, Cursor, and ChatGPT), a tiny, highly efficient team of **2–5 experienced developers can build a functional, fully scalable "Marktplaats-style MVP" in 3–6 months for a fraction of the cost.**

We achieve this by using the exact stack pre-configured in this blueprint:
*   **React & Tailwind:** Fast, responsive frontend development.
*   **FastAPI & Python:** High-speed asynchronous backend endpoints.
*   **PostgreSQL with pgvector & PostGIS:** Handling relational, spatial geosearch, and AI visual search within a single database cluster.
*   **Docker:** Guaranteeing that our complete stack runs exactly the same way locally during testing as it does when deployed to production.

---

## 🐳 Part 2: Unified Docker Compose Local Environment

Save this `docker-compose.yml` file in the root directory of your project folder. It provisions your database with PostGIS spatial geography, pgvector similarity matrices, and Redis caching out-of-the-box.

```yaml
version: '3.8'

services:
  db:
    image: ankane/pgvector:v0.5.1
    container_name: sokocoin_database
    restart: always
    environment:
      POSTGRES_USER: soko_admin
      POSTGRES_PASSWORD: SokoSecurePassword2026
      POSTGRES_DB: sokocoin_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Automated database schema and seed data injection on first container startup
      - ./database/schema.sql:/docker-entrypoint-initdb.d/1_schema.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/2_seed.sql
    command: >
      postgres
      -c shared_preload_libraries=vector
      -c max_connections=200
      -c shared_buffers=512MB

  redis:
    image: redis:7-alpine
    container_name: sokocoin_cache
    restart: always
    ports:
      - "6379:6379"

  pgadmin:
    image: dpage/pgadmin4
    container_name: sokocoin_pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@sokocoin.africa
      PGADMIN_DEFAULT_PASSWORD: PgAdminSecurePassword2026
    ports:
      - "5050:80"
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## 🛠️ Part 3: Folder Structure & System Layout

Configure your local monorepo workspace exactly like this:

```text
sokocoin-monorepo/
├── docker-compose.yml              # Orchestrates local PostgreSQL, PostGIS, pgvector, Redis & pgAdmin
├── README.md                       # Local setup commands and system checkpoints
├── database/
│   ├── schema.sql                  # Relational and vector schema database structures
│   └── seed.sql                    # Production-ready test dataset (Nairobi, Lagos, Abidjan, Dakar)
├── backend/
│   ├── Dockerfile                  # Container instructions for the FastAPI backend
│   ├── requirements.txt            # Python dependencies (FastAPI, pgvector, sqlalchemy, etc.)
│   ├── main.py                     # Backend entry point and routing manager
│   └── app/
│       ├── config.py               # Environment variables (Stripe, AI, DB connection details)
│       ├── database.py             # SQLAlchemy async pool engine
│       ├── models.py               # Database ORM models
│       └── routers/
│           ├── ai_listing.py       # AI photo uploads, categories, and vector embeddings
│           ├── geosearch.py        # PostGIS-powered proximity search ("Kijk in je Wijk")
│           └── escrow.py           # Stripe Connect payment escrow and locker logistics
└── frontend/
    ├── Dockerfile                  # Container instructions for React/Vite
    ├── package.json                # Frontend dependencies
    ├── tailwind.config.js          # Tailwind CSS compiler options
    └── src/
        ├── App.tsx                 # Core application layout
        └── components/
            └── MarketplaceDashboard.tsx # Interactive Desktop & Mobile UI Dashboard
```

---

## 📑 Part 4: Step-by-Step AI Implementation Prompts

Your AI engineering team can copy and paste these highly detailed prompts directly into advanced coding models (like Claude 3.5 Sonnet, Cursor, or GPT-4o) to generate production-grade code for every key system module.

### **Prompt 1: Asynchronous Database Connection Pool (`backend/app/database.py`)**
> **AI System Prompt:** Write a production-ready Python file `backend/app/database.py` using SQLAlchemy (async connection pool preferred). It must connect to our PostgreSQL database container using the connection string: `postgresql+psycopg://soko_admin:SokoSecurePassword2026@db:5432/sokocoin_db`. 
> Make sure to include:
> 1. Robust error handling and logging.
> 2. Connection retries with exponential backoff. This is crucial because when running `docker-compose up`, the FastAPI application will attempt to boot up faster than the PostgreSQL engine finishes its internal initialization.
> 3. An asynchronous dependency function `get_db` to yield session states safely to FastAPI router endpoints.

### **Prompt 2: PostGIS Proximity Geosearch (`backend/app/routers/geosearch.py`)**
> **AI System Prompt:** Write a FastAPI router `backend/app/routers/geosearch.py` that handles location-based classifieds searches ("Kijk in je Wijk"). 
> Implement a GET endpoint `/api/search/proximity` that takes query parameters: `latitude: float`, `longitude: float`, `radius_km: float`, `category_id: Optional[int]`, and `query: Optional[str]`. 
> Write an optimized SQL execution block using raw SQLAlchemy to utilize PostGIS spatial features:
> 1. Use the `ST_DWithin` geography function on our coordinate column cast (`location_geom::geography`) to filter listings that lie strictly within the specified kilometer radius.
> 2. Calculate distances dynamically using `ST_Distance` and return listings sorted by distance ascending.
> 3. Combine this with text matching on the title/description or vector matching if a query is present. Ensure inputs are strictly sanitized to prevent SQL injection.

### **Prompt 3: AI Multimodal Listing Optimizer (`backend/app/routers/ai_listing.py`)**
> **AI System Prompt:** Write a FastAPI router `backend/app/routers/ai_listing.py` that acts as our zero-friction listing helper. The POST endpoint `/api/listings/ai-analyze` must accept an uploaded listing image file via `UploadFile`. It should:
> 1. Ingest the image file stream and validate that it is a valid image (PNG/JPEG under 10MB).
> 2. Contain integration blocks calling Google Gemini Multimodal APIs (`gemini-1.5-flash`) or OpenAI Vision APIs to inspect the photo.
> 3. Force the model to output a structured JSON containing: `suggested_title` (string), `suggested_category_id` (matched to our 11 core categories), `auto_description` (rich markdown text), `detected_condition` (enum: new, used, good_condition), and `estimated_price_range` (object with min_price and max_price values).
> 4. Generate random, normalized 1536-dimensional title vector embeddings using a mock helper function (to represent OpenAI text-embedding-3-small outputs) to seed the `title_embedding` column in our PostgreSQL pgvector table.

### **Prompt 4: Stripe Connect Escrow Webhook Handler (`backend/app/routers/escrow.py`)**
> **AI System Prompt:** Write a FastAPI router `/api/payments/webhook` to handle Stripe webhook events for our "Kopersbescherming" (Buyer Protection Escrow) program. Implement:
> 1. Verification of the `Stripe-Signature` header to guarantee origin authenticity.
> 2. Process `payment_intent.succeeded` events: Extract `metadata.transaction_id`, connect to the database, transition `transactions.escrow_status` to `'funds_escrowed'`, and trigger an automated system message in the respective `chats` room alerting both parties that shipment labels can now be safely printed via "Meer verzendgemak".
> 3. Log errors cleanly and return a `200 OK` response to Stripe to prevent retry storms.

---

## 🏃 Part 5: Local Execution & Verification Guide

Follow these sequential steps in your terminal to get your entire local Docker classifieds network fully online:

### **Step 1: Save the Relational Schemas & Mock Data**
Before running Docker, place the database structures into your database folder so the automated container seeders can find them:
*   Copy your database schema structure (`marktplaats-multilingual-schema-v2.sql`) and save it as `database/schema.sql`.
*   Copy your mock seeding dataset (`seed-data.sql`) and save it as `database/seed.sql`.

### **Step 2: Spin Up Your Docker Network**
Open your terminal in the root directory of your project folder containing the `docker-compose.yml` file and run:
```bash
docker-compose up -d --build
```
*Docker will pull the images, compile the PostgreSQL extensions, mount the volume structures, and inject your multilingual categories and African city listings automatically.*

### **Step 3: Verify the Automated Seeding**
To verify that your databases, PostGIS extensions, and mock users are online, run this check inside your running database container:
```bash
docker exec -it sokocoin_database psql -U soko_admin -d sokocoin_db -c "SELECT name_en FROM categories WHERE parent_id IS NULL;"
```
*Expected output: You should see the top-level SokoCoin categories (Cars, Home & Furniture, Computers & Software, etc.) print cleanly in your terminal.*

### **Step 4: Connect visually via pgAdmin**
1. Open your web browser and go to `http://localhost:5050`.
2. Log in using the credentials:
   * **Email:** `admin@sokocoin.africa`
   * **Password:** `PgAdminSecurePassword2026`
3. Click **Add New Server** and connect using:
   * **Host:** `db` (the internal docker service name)
   * **Port:** `5432`
   * **Username:** `soko_admin`
   * **Password:** `SokoSecurePassword2026`
4. You can now visually browse tables, inspect seed data, and run geosearch queries directly inside the UI.
