# NEXT-GEN AFRICA CLASSIFIEDS: DEPLOYMENT & SETUP GUIDE
This guide maps out the exact steps required to deploy the **PostgreSQL (v2 schema)** database and **FastAPI AI Listing API** backend. 

For speed, cost-effectiveness, and native support for advanced tools like **PostGIS** and **pgvector**, we recommend deploying the database via **Supabase** (managed Postgres) and the FastAPI backend on **Render**, **Railway**, or **AWS App Runner**.

---

## PILLAR 1: DATABASE PROVISIONING (SUPABASE OPTION)
Supabase is the ideal database provider because it provides physical PostgreSQL instances with pre-configured PostGIS and pgvector extensions, eliminating complex database compilation.

### Step 1.1: Create your Supabase Project
1. Go to [Supabase](https://supabase.com) and sign up for an account.
2. Click **New Project** and select your nearest African AWS region (e.g., **Cape Town / af-south-1** for low latency).
3. Set your **Database Password** (save this securely) and complete the creation wizard.

### Step 1.2: Enable Extensions & Create Tables
1. In your Supabase Dashboard, navigate to the **SQL Editor** in the left sidebar.
2. Create a new query and paste the entire contents of your database file: `marktplaats-multilingual-schema-v2.sql`.
3. Click **Run**. This will execute the following setups automatically:
   * Load the `postgis` GIS proximity engine.
   * Load the `vector` similarity matching engine.
   * Initialize all relational tables (`users`, `ads`, `chats`, `transactions`, `smart_locker_shipments`, etc.).
   * Establish the hierarchical multi-level categories (English & French seed data).
   * Create HNSW index operators on the vector embeddings to guarantee sub-millisecond query performance.

---

## PILLAR 2: BACKEND DEPLOYMENT (RENDER, RAILWAY, OR AWS APP RUNNER)
The FastAPI backend (`ai-listing-api.py`) runs in a stateless container and communicates directly with the database.

### Step 2.1: Dockerize the Backend
Create a `Dockerfile` in your root development directory to package the FastAPI application:

```dockerfile
FROM python:3.12-slim

# Install system dependencies needed for compiling certain python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency ledger
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Expose port and run Gunicorn/Uvicorn
EXPOSE 8000
CMD ["uvicorn", "ai_listing_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create a corresponding `requirements.txt` containing the necessary dependencies:
```text
fastapi==0.111.0
uvicorn==0.30.1
psycopg2-binary==2.9.9
sqlalchemy==2.0.31
pgvector==0.2.5
pydantic==2.7.4
python-multipart==0.0.9
google-generativeai==0.5.4
httpx==0.27.0
```

### Step 2.2: Hosting Configuration
Select **one** of the hosting paths below to run your FastAPI container:

#### Option A: Render (Easiest & Free-Tier Friendly)
1. Push your code repository (FastAPI code, Dockerfile, and requirements) to **GitHub** or **GitLab**.
2. Log into [Render](https://render.com) and select **New +** $\rightarrow$ **Web Service**.
3. Connect your Git repository.
4. Set the **Runtime** to **Docker** (Render will automatically detect your Dockerfile).
5. Under **Environment Variables**, add the system configurations (detailed in Pillar 3).
6. Click **Deploy Web Service**.

#### Option B: AWS App Runner (Production-Scale & High Performance)
1. Push your Docker image to **AWS Elastic Container Registry (ECR)**:
   ```bash
   aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin <your-aws-account-id>.dkr.ecr.af-south-1.amazonaws.com
   docker build -t nextgen-classifieds-backend .
   docker tag nextgen-classifieds-backend:latest <your-aws-account-id>.dkr.ecr.af-south-1.amazonaws.com/nextgen-classifieds:latest
   docker push <your-aws-account-id>.dkr.ecr.af-south-1.amazonaws.com/nextgen-classifieds:latest
   ```
2. Navigate to the **AWS App Runner Console** and click **Create Service**.
3. Select **Container Registry** $\rightarrow$ **Amazon ECR** and link your pushed image.
4. Choose **Automatic Deployment** so App Runner redeploys whenever you push an update.
5. In the configuration step, assign your environment variables and set the listening port to `8000`.

---

## PILLAR 3: ENVIRONMENTS & COMPONENT CONNECTIONS
Your application requires connection secrets to orchestrate payment, logistics, and AI. Add these variables to your cloud hosting manager (Render/AWS console):

| Variable Name | Sample Value / Pattern | System Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@aws-0-af-south-1.pooler.supabase.com:6543/postgres` | Your pooling connection string retrieved from Supabase's Database Settings. |
| `GEMINI_API_KEY` | `AIzaSyD...` | To power the Multimodal AI image categorization and title/description generator. |
| `STRIPE_API_KEY` | `sk_live_51...` | Key for processing payment requests, escrow holds, and in-chat seller payouts. |
| `LOCKER_PARTNER_API_KEY` | `sec_lock_...` | API credential for reserving locker cells and tracking drop-off/pickup webhooks. |

---

## PILLAR 4: POST-DEPLOYMENT VERIFICATION
Run these smoke tests once the deployment completes to ensure your transaction, database, and AI engines are communicating flawlessly.

### Test 1: Service Health Check
Run a curl request against your newly deployed FastAPI server:
```bash
curl -X GET https://your-backend-domain.com/health
```
**Expected Response:** `{"status": "healthy", "database": "connected"}`

### Test 2: AI Multi-Modal Ad Optimization
Verify that your image classifier successfully communicates with Google's API, returns JSON metadata, and writes the vector embeddings directly into your PostgreSQL database:
```bash
curl -X POST https://your-backend-domain.com/api/v1/ads/ai-analyze \
  -F "file=@sample_iphone.jpg"
```
**Expected Response JSON Structure:**
```json
{
  "ai_optimized": {
    "suggested_category_id": 3,
    "confidence_score": 0.98,
    "suggested_title": "Apple iPhone 13 - 128GB - Space Gray (Good Condition)",
    "suggested_description": "Perfectly working iPhone 13. Screen shows micro-scratches...",
    "estimated_price_range": {
      "min_price": 320.00,
      "max_price": 380.00
    },
    "tags": ["iphone", "apple", "smartphone", "ios"]
  }
}
```
