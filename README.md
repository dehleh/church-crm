# ⛪ ChurchOS — Church Management SaaS

A full-featured, multi-tenant church management platform built with React, Node.js, and PostgreSQL.

---

## 🚀 Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Router v6 |
| Backend  | Node.js, Express, JWT Auth |
| Database | PostgreSQL (18 tables, multi-tenant) |

---

## 📦 Features

### People Management
- **Members** — Full CRUD, member profiles with tabs (overview, departments, attendance, giving), auto-generated IDs (MBR-00001)
- **First Timers** — Visitor tracking, follow-up pipeline, one-click conversion to member
- **Departments** — Choir, Ushering, Media, etc. — with member assignments and roles
- **Follow-ups** — Pastoral care scheduling (call, visit, WhatsApp), assigned to staff, outcome tracking

### Church Operations
- **Events** — Create services and programs, expected vs actual attendance
- **Attendance** — Event picker → interactive check-in list, bulk save, deduplication
- **Communications** — Compose email/SMS/WhatsApp/in-app blasts, audience targeting, draft/send flow
- **Prayer Requests** — Submit, categorize, track status (open → praying → answered)
- **Media Library** — Sermons, worship recordings, podcasts, documents with publish/draft status

### Finance
- **Transactions** — Income/expense recording with category, member, payment method
- **Accounts** — Multiple bank/cash accounts with live balances
- **Budgets** — Monthly/quarterly/annual budgets with spend tracking and visual progress bars
- **Charts** — 12-month income vs expense trends, giving by category (pie chart)

### Administration
- **Branches** — Multi-branch support with member counts and pastor assignment
- **User Management** — Invite staff, assign roles (super_admin → viewer), reset passwords
- **Reports** — Member, finance, attendance, first timer reports with CSV export
- **Settings** — Church profile, personal profile, password change
- **Global Search** — Live search across members, events, transactions (Cmd/Ctrl+K)

### Dashboard
- Real-time stats: members, first timers, upcoming events, monthly income
- 12-month financial trend (area chart)
- Last 8 services attendance (bar chart)
- Member gender/active breakdown with progress bars
- First timer conversion funnel
- Recent activity feed

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=church_crm
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

### 3. Create database and run migrations

```bash
createdb church_crm
cd backend && npm run migrate
```

### 4. Seed demo data (optional but recommended)

```bash
cd backend && npm run seed
```

This creates:
- **Church:** Grace Cathedral Lagos
- **Login:** `admin@gracecathedral.ng` / `password123`
- **Also:** `pastor@gracecathedral.ng` / `password123`
- **Also:** `staff@gracecathedral.ng` / `password123`

Seeded with: 60 members, 20 first timers, 12 events, 6 months of transactions, departments, budgets, prayer requests, media items, and more.

### 5. Run the app

```bash
# From project root — runs both backend (:5000) and frontend (:5173)
npm run dev
```

Or separately:
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

Visit: **http://localhost:5173**

---

## 🗄️ Database Schema

18 tables, all with `church_id` tenant key:

```
churches          — tenant root
branches          — multi-branch support
users             — staff accounts with roles
members           — full member profiles
first_timers      — visitor tracking
departments       — units and ministries
member_departments — member ↔ department (many-to-many)
events            — services and programs
attendance        — event check-ins
finance_accounts  — bank/cash accounts
giving_categories — tithe, offering, etc.
transactions      — income/expense ledger
budgets           — financial planning
media_items       — sermons and resources
prayer_requests   — prayer tracking
follow_ups        — pastoral care
communications    — bulk messages
audit_logs        — activity history
```

---

## 🔐 Roles

| Role        | Permissions |
|-------------|-------------|
| super_admin | Full access |
| admin       | Members, finance, events, users |
| pastor      | People, departments, follow-ups |
| staff       | Record members, transactions, attendance |
| viewer      | Read-only |

---

## 📁 Project Structure

```
church-crm/
├── backend/
│   ├── src/
│   │   ├── config/         database.js
│   │   ├── controllers/    15 controllers
│   │   ├── middleware/     auth.js, errorHandler.js
│   │   ├── migrations/     001_initial_schema.sql, run.js, seed.js
│   │   └── routes/         15 route files
│   └── .env.example
└── frontend/
    └── src/
        ├── api/            client.js, services.js
        ├── components/
        │   ├── layout/     Layout.jsx (sidebar + topbar)
        │   └── ui/         Modal.jsx, GlobalSearch.jsx
        ├── context/        AuthContext.jsx
        └── pages/          22 pages
```

---

## 🌍 Multi-tenancy

Each church is a tenant. Every database table includes `church_id`, enforced at the API middleware layer via `req.churchId`. No data leaks between tenants.

---

## 📝 API Endpoints

```
POST   /api/auth/register         — onboard new church
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/dashboard
GET    /api/members               — list + search + filter
POST   /api/members
GET    /api/members/:id
PUT    /api/members/:id
GET    /api/first-timers
POST   /api/first-timers
PATCH  /api/first-timers/:id/follow-up
POST   /api/first-timers/:id/convert
GET    /api/events
POST   /api/events
POST   /api/events/:id/attendance
GET    /api/finance/summary
GET    /api/finance/transactions
POST   /api/finance/transactions
GET    /api/finance/accounts
GET    /api/departments
POST   /api/departments
GET    /api/departments/:id/members
GET    /api/branches
POST   /api/branches
GET    /api/communications
POST   /api/communications
POST   /api/communications/:id/send
GET    /api/users
POST   /api/users
PUT    /api/users/:id
GET    /api/budgets
POST   /api/budgets
GET    /api/reports/members
GET    /api/reports/finance
GET    /api/reports/attendance
GET    /api/reports/first-timers
GET    /api/follow-ups
POST   /api/follow-ups
GET    /api/settings
PUT    /api/settings/church
PUT    /api/settings/profile
GET    /api/search?q=
```
