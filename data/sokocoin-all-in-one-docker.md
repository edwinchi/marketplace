# 🐳 SokoCoin (LokoTrade): All-In-One Unified Docker Development & Deployment Blueprint

This master blueprint compiles all system requirements, code interfaces, and multi-container configurations into a single document. **Your AI engineering team can load this exact file into any advanced coding model (such as Claude, Cursor, or GPT-4o) to automatically scaffold, containerize, seed, and run the entire platform locally and in production.**

---

## 🏗️ 1. Multi-Container System Architecture

Instead of dealing with manual local database installations, complex DLL compilation (like `pgvector` on Windows), or configuration mismatches, the entire platform runs inside an orchestrated **Docker** network.

### Unified Monorepo Folder Structure
Your AI team must scaffold the directory structure exactly as follows:

```text
sokocoin-monorepo/
├── docker-compose.yml              # Core Docker orchestration for the entire stack
├── database/
│   ├── schema.sql                  # Database Schema (marktplaats-multilingual-schema-v2.sql)
│   └── seed.sql                    # Pre-compiled multi-country test data (seed-data.sql)
├── backend/
│   ├── Dockerfile                  # Production container config for FastAPI
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # FastAPI core server & routers
│   └── app/
│       ├── config.py               # Credentials & environment variables
│       ├── database.py             # PostgreSQL connection pool with retries
│       └── routers/
│           ├── ai_listing.py       # AI Computer Vision classification (ai-listing-api.py)
│           ├── geosearch.py        # PostGIS proximity lookup ("Kijk in je Wijk")
│           └── transactions.py     # Stripe Escrow state machine
└── frontend/
    ├── Dockerfile                  # Container configuration for React
    ├── package.json                # Front-end dependencies
    ├── tailwind.config.js          # Tailwind CSS compiler rules
    └── src/
        ├── App.tsx                 # Front-end React entry
        └── components/
            └── MarketplaceDashboard.tsx # Interactive UI dashboard component
```

---

## 🐳 2. The Core Orchestrator (`docker-compose.yml`)

Save this file in the root directory. It coordinates five interconnected services:
1.  **`db`**: PostgreSQL 15 compiled with both `pgvector` (AI searches) and `postgis` (geospatial coordinates). Mounts your database schemas to execute automatically on startup.
2.  **`redis`**: For lighting-fast session storage and instant in-app chat routing.
3.  **`backend`**: Your FastAPI application communicating with the Postgres pool.
4.  **`frontend`**: Your React Node dev container.
5.  **`pgadmin`**: A web-based database browser so your team can visually inspect tables without SQL command-line tools.

```yaml
version: '3.8'

services:
  db:
    image: ankane/pgvector:v0.5.1-pg15  # Relies on pre-compiled Postgres + pgvector image
    container_name: sokocoin_db
    restart: always
    environment:
      POSTGRES_USER: soko_admin
      POSTGRES_PASSWORD: SokoSecurePassword2026
      POSTGRES_DB: sokocoin_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Automated migrations: Mount schema and seed files to run on container launch
      - ./database/schema.sql:/docker-entrypoint-initdb.d/1_schema.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/2_seed.sql
    command: >
      postgres
      -c shared_preload_libraries=vector
      -c max_connections=200
      -c shared_buffers=512MB
    networks:
      - sokocoin_network

  redis:
    image: redis:7-alpine
    container_name: sokocoin_redis
    restart: always
    ports:
      - "6379:6379"
    networks:
      - sokocoin_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sokocoin_backend
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+psycopg://soko_admin:SokoSecurePassword2026@db:5432/sokocoin_db
      - GEMINI_API_KEY=AIzaSyD_YourMockOrRealGeminiKey
      - STRIPE_API_KEY=sk_test_YourStripeSecretKey
    depends_on:
      - db
      - redis
    networks:
      - sokocoin_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sokocoin_frontend
    restart: always
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - sokocoin_network

  pgadmin:
    image: dpage/pgadmin4
    container_name: sokocoin_pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@sokocoin.com
      PGADMIN_DEFAULT_PASSWORD: adminlocalpassword
    ports:
      - "5050:80"
    depends_on:
      - db
    networks:
      - sokocoin_network

volumes:
  postgres_data:

networks:
  sokocoin_network:
    driver: bridge
```

---

## 🐍 3. Backend Dockerization (`backend/`)

### Dockerfile (`backend/Dockerfile`)
Save this in `backend/Dockerfile` to create a lightweight, high-performance container for FastAPI:

```dockerfile
FROM python:3.12-slim

# Install compilation tools needed for database drivers
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependency registry
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source code
COPY . .

# Expose port and launch live reloading server
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Dependency Ledger (`backend/requirements.txt`)
Save this as `backend/requirements.txt`:
```text
fastapi==0.111.0
uvicorn==0.30.1
psycopg[binary]==3.1.19
sqlalchemy==2.0.31
pgvector==0.2.5
pydantic==2.7.4
python-multipart==0.0.9
google-generativeai==0.5.4
httpx==0.27.0
```

---

## ⚛️ 4. Frontend Dockerization (`frontend/`)

### Dockerfile (`frontend/Dockerfile`)
Save this in `frontend/Dockerfile` to build and serve the React development server:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (to cache layers)
COPY package.json .
RUN npm install

# Copy configuration and tailwind compiler parameters
COPY . .

# Expose Vite dev server port
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### Dependency List (`frontend/package.json`)
Save this as `frontend/package.json`:
```json
{
  "name": "sokocoin-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.395.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.2.2",
    "vite": "^5.3.1"
  }
}
```

---

## 🚀 5. Quick-Start Playbook (Run Everything in 3 Commands)

Your team can launch the entire ecosystem locally using these three simple terminal commands:

### Command 1: Stage Migrations & Blueprints
Move the core database migrations and custom scripts we previously generated into their target directories:
*   Copy your database schema structure (`marktplaats-multilingual-schema-v2.sql`) to `database/schema.sql`.
*   Copy your pre-compiled mock dataset (`seed-data.sql`) to `database/seed.sql`.
*   Copy the React dashboard script (`marketplace-dashboard.tsx`) to `frontend/src/components/MarketplaceDashboard.tsx`.
*   Copy the AI Listing generator endpoints (`ai-listing-api.py`) to `backend/main.py`.

### Command 2: Build and Boot Up
Run this in the root directory to build the backend and frontend Docker containers, pull database/cache layers, and launch the orchestrated network:
```bash
docker-compose up -d --build
```

### Command 3: Verify the Stack Status
Make sure all containers are operating cleanly in the background:
```bash
docker ps
```
Your local system is now fully live across these interfaces:
*   **Web Frontend Interface:** `http://localhost:5173` (Desktop & Mobile platform dashboard with interactive geosearch and AI listings)
*   **Backend API Documentation:** `http://localhost:8000/docs` (Swagger visual interface detailing backend API endpoints)
*   **Visual Database Browser:** `http://localhost:5050` (Log in with `admin@sokocoin.com` / `adminlocalpassword` to visually browse schemas and query seed tables).

---

## 🎯 6. Production Scalability & Best Practices

When transitioning this Dockerized environment from local development to production, your AI team should implement these structural best practices:

1.  **Decouple the database:** Move the database service (`db`) out of Docker Compose and use a managed solution (like Supabase Enterprise or AWS Aurora PostgreSQL) which handles replicas, continuous backups, and PostGIS/pgvector configurations natively.
2.  **Separate compiled assets:** For production deployment, update the `frontend/Dockerfile` to use a multi-stage build, compiling the React codebase into static static files served via Nginx or a CDN (such as Cloudflare) for lightning-fast speeds.
3.  **Auto-Scale via ECS or K8s:** Run your stateless FastAPI backend and static Frontend servers inside auto-scaling container configurations (using AWS ECS, App Runner, or Kubernetes). This allows your compute instances to dynamically scale from 1 container to 1,000+ during traffic spikes.
