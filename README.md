# Cleaning & Facility Business Software (CFBS)

A full-stack operations platform for cleaning and facility management
businesses: client & property management, job scheduling with recurring
jobs, staff assignment and time tracking, inventory/supplies, quality
inspections, and invoicing with payments and PDF export.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express, TypeScript, Prisma ORM, SQLite (dev) / Postgres-ready, JWT auth, Zod validation, PDFKit |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios |
| Deployment | Dockerfiles for both apps + `docker-compose.yml` |

## Features

- **Auth & roles** — JWT-based login, `ADMIN` / `MANAGER` / `STAFF` roles.
  First-run bootstrap creates the initial admin account with no invite needed.
- **Clients & properties** — one client can have many serviced properties
  (offices, retail, warehouses, etc.), each with access notes and history.
- **Jobs & scheduling** — one-off or recurring jobs (daily/weekly/biweekly/
  monthly) with automatic future-occurrence generation, staff assignment,
  checklists, status tracking (scheduled → in progress → completed),
  clock in/out time entries, and supply usage logging.
- **Inventory** — stock levels, reorder thresholds, restocking, and
  low-stock alerts on the dashboard.
- **Inspections** — post-job quality checks scored by area with an overall
  score.
- **Invoicing** — generate invoices from completed jobs (or manually),
  line items, tax, partial/full payments, status lifecycle, and PDF export.
- **Dashboard** — jobs today/this week, revenue this month, overdue
  invoices, low-stock items, and upcoming jobs at a glance.

## Project layout

```
backend/     Express + Prisma API server
frontend/    React + Vite single-page app
docker-compose.yml
```

## Getting started (local development)

Requires Node.js 20+.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate   # creates SQLite dev.db and applies the schema
npm run seed              # optional: demo clients, jobs, invoices, users
npm run dev                # http://localhost:4000
```

Demo accounts created by the seed script (password `password123` for all):

- `admin@cfbs.demo` — ADMIN
- `manager@cfbs.demo` — MANAGER
- `staff1@cfbs.demo` / `staff2@cfbs.demo` — STAFF

If you'd rather start from a clean database, skip `npm run seed` and use the
"First time setup" link on the login page to create your own admin account.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev   # http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173 and log in.

## Database

The backend ships configured for **SQLite** (`backend/prisma/dev.db`) so it
runs with zero external services. The Prisma schema (`backend/prisma/schema.prisma`)
intentionally avoids any SQLite- or Postgres-specific column types, so moving
to Postgres for production is just:

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`.
2. Point `DATABASE_URL` at your Postgres instance.
3. Run `npx prisma migrate deploy`.

Enum-like fields (roles, job status, invoice status, etc.) are stored as
plain strings and validated at the API layer (see `backend/src/types/enums.ts`
and the `zod` schemas in each route file) rather than native Prisma enums —
SQLite has no enum support, so this keeps one schema working on both engines.

## Running with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000 (proxied through the frontend's nginx at `/api`)

The backend container persists its SQLite database in a named Docker volume
(`cfbs-data`), so data survives restarts. Set `JWT_SECRET` in your shell
environment before running in anything beyond local testing.

## API overview

All endpoints are under `/api` and (except `/api/auth/*`) require a
`Authorization: Bearer <token>` header.

| Resource | Base path |
|---|---|
| Auth | `/api/auth` (`login`, `bootstrap-admin`, `me`) |
| Users / staff | `/api/users` |
| Clients | `/api/clients` |
| Properties | `/api/properties` |
| Service types | `/api/service-types` |
| Jobs | `/api/jobs` (+ `/assignments`, `/checklist`, `/clock-in`, `/inventory-usage`) |
| Inventory | `/api/inventory` |
| Inspections | `/api/inspections` |
| Invoices | `/api/invoices` (+ `/from-jobs`, `/payments`, `/pdf`) |
| Dashboard | `/api/dashboard/summary` |

## Scripts

**Backend** (`backend/package.json`): `dev`, `build`, `start`,
`prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:studio`, `seed`.

**Frontend** (`frontend/package.json`): `dev`, `build`, `preview`.
