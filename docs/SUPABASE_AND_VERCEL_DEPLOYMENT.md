# Deploying ChurchOS: Supabase (Database) + Vercel (Frontend)

This guide walks you through deploying ChurchOS with:
- **Supabase**: Managed PostgreSQL database, daily automated backups, and visual SQL/table editor.
- **Vercel**: Ultra-fast global Edge CDN for the Vite React frontend.
- **Backend API**: Connected seamlessly to Supabase over secure SSL.

```
┌─────────────────────────────────┐
│        Vercel Edge CDN          │  ◄─── Global React SPA Frontend
│    (https://cos.tbclekki.org)   │
└────────────────┬────────────────┘
                 │ HTTPS / API
                 ▼
┌─────────────────────────────────┐
│        ChurchOS Node API        │  ◄─── Backend API (Railway / Render / Vercel)
│         (Express Server)        │
└────────────────┬────────────────┘
                 │ Secure SSL (Port 5432 / 6543)
                 ▼
┌─────────────────────────────────┐
│       Supabase PostgreSQL       │  ◄─── Managed Postgres 15/16 + Backups
│         (Church Database)       │
└─────────────────────────────────┘
```

---

## Part 1: Set Up Supabase Database

### Step 1: Create a Free Supabase Project
1. Go to **[supabase.com](https://supabase.com)** and sign in / sign up.
2. Click **New Project**:
   - **Name**: `church-crm` (or your church's name)
   - **Database Password**: Set a strong password (and save it securely)
   - **Region**: Choose the region closest to your congregation (e.g., *Frankfurt/London* for West Africa/Europe, *US East* for Americas).
3. Click **Create new project** and wait ~60 seconds for the database to provision.

### Step 2: Get your Database Connection String
1. In the Supabase Dashboard, click **Project Settings** (gear icon at the bottom left).
2. Go to **Database**.
3. Scroll down to **Connection parameters** or **Connection string**:
   - Select the **URI** tab.
   - Mode: **Session** (Port `5432`) or **Transaction** (Port `6543`).
   - The connection string looks like this:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
4. Replace `[YOUR-PASSWORD]` with the actual database password you created in Step 1.
   *(This is your `DATABASE_URL`)*.

### Step 3: Initialize the ChurchOS Schema in Supabase
You have two easy ways to initialize all tables:

* **Method A (Instant 1-Click in Supabase Dashboard — Recommended)**:
  1. In your Supabase dashboard, click **SQL Editor** on the left navigation bar.
  2. Click **New query**.
  3. Open [`docs/supabase_complete_schema.sql`](file:///c:/Users/HomePC/Desktop/church-crm-final/church-crm/docs/supabase_complete_schema.sql) from this repository, copy the entire contents, and paste it into the editor.
  4. Click **Run** (or `Ctrl+Enter`). All 34 migrations, indexes, constraints, and audit tables will be created immediately!

* **Method B (Automatic on Backend Boot)**:
  ChurchOS includes an auto-migrator. When your backend starts with the Supabase `DATABASE_URL`, it automatically checks for pending migrations and runs them sequentially with zero data loss.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Import Repository into Vercel
1. Go to **[vercel.com](https://vercel.com)** and log in.
2. Click **Add New...** > **Project**.
3. Choose your GitHub repository: `dehleh/church-crm`.

### Step 2: Configure Project Settings
In the Vercel project configuration screen:
1. **Root Directory**: Click **Edit** and select **`frontend`**.
2. **Framework Preset**: Vercel will auto-detect **`Vite`**.
3. **Build and Output Settings**:
   - Build Command: `vite build` (or leave default)
   - Output Directory: `dist` (default)
   - Install Command: `npm install` (default)

### Step 3: Add Environment Variables in Vercel
Under the **Environment Variables** section, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://church-crm-backend-production.up.railway.app` | URL of your running backend API |

*(If you are deploying the backend on a different domain or server, enter that URL here).*

### Step 4: Click Deploy!
Vercel will build the frontend in ~20 seconds and assign you a live production URL:
```
https://church-crm-frontend.vercel.app
```

### Step 5: (Optional) Add your Custom Church Subdomain on Vercel
If you want to use `cos.tbclekki.org` or `portal.tbclekki.org`:
1. In your Vercel Project, go to **Settings** > **Domains**.
2. Enter your domain: `cos.tbclekki.org`.
3. Vercel will prompt you to add a DNS record at your domain provider (e.g. Cloudflare / cPanel):
   - **Type**: `CNAME`
   - **Name**: `cos`
   - **Value**: `cname.vercel-dns.com`
4. Vercel automatically generates and renews a free SSL certificate!

---

## Part 3: Configure Backend with Supabase

In your backend hosting environment (Railway, Render, Fly.io, or VPS), set the following environment variables:

```ini
# Database Connection (from Supabase Step 2)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Force SSL Mode for Supabase
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

# Application Secrets
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here
PORT=8080

# CORS Allowed Origins (comma-separated, includes your Vercel domains)
APP_URL=https://church-crm-frontend.vercel.app,https://cos.tbclekki.org
```

Once saved, the backend connects directly to your Supabase PostgreSQL cluster!

---

## Summary of Advantages

| Feature | Previous Setup | Supabase + Vercel Setup |
| :--- | :--- | :--- |
| **Frontend Speed** | Standard single container | Global Edge CDN (sub-50ms latency worldwide) |
| **Database Management** | Raw disk volume | Visual table browser, auto backups & point-in-time recovery |
| **Frontend Downtime** | Container reboots during deploys | Zero downtime atomic deployments with instant rollbacks |
| **Database Scaling** | Limited to container RAM | Enterprise PostgreSQL with connection pooling & read replicas |
| **Cost** | Cloud container fees | **$0 / month** on Vercel Hobby + Supabase Free tier |
