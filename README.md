# GrowJob (Web3 Jobs MVP)

Production-oriented MVP for a Web3 jobs app built with Next.js, TypeScript, Tailwind, PostgreSQL, Prisma, NextAuth, Stripe, and cron ingestion.

## Features

- Aggregated job feed from official/public ATS APIs:
  - Greenhouse Job Board API
  - Lever Postings API
  - Ashby public postings (GraphQL)
  - SmartRecruiters postings API
- Apply quota system (weekly UTC reset at Monday 00:00 UTC):
  - Free: 7 applies/week
  - Premium: 20 applies/week
  - Credits can buy +1 apply token, capped at +3/week
- Save/Hide unlimited jobs regardless of apply tokens
- Freshness rules:
  - Feed default: jobs from last 7 days
  - Ingestion retention: only jobs within 10 days
- Verification tiers:
  - `SOURCE_VERIFIED` when pulled from ATS connector
  - `DOMAIN_VERIFIED` when apply domain matches company domain/known ATS domain
- Matching:
  - Profile-based role/skills/location match score and 1-line reason
  - Feed ranking by match score, freshness, verification tier
- Admin-only company directory:
  - Manage companies
  - Detect ATS (heuristics + mock AI-style classifier)
- Resume ATS score MVP:
  - Upload PDF/DOCX
  - Mock ATS scan (score, top improvements, missing keywords)
  - Premium stub: "Tailor resume to this job"
- Event logging:
  - `job_view`, `save`, `hide`, `apply_attempt`, `apply_success`, `paywall_view`, `premium_upgrade`, `ats_scan`

## Tech Stack

- Next.js App Router + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- NextAuth (Google + Email providers when configured)
- Stripe checkout endpoint (+ feature-flag premium upgrade)
- Stripe webhook endpoint for checkout completion premium activation
- Cron:
  - local scheduler script (`node-cron`)
  - manual trigger endpoint: `POST /api/cron/ingest`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Run Prisma generate + migrations + seed:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

4. Start app:

```bash
npm run dev
```

Open http://localhost:3000.

## Zero-Setup Local DB (Recommended)

If you do not have PostgreSQL installed locally, use embedded PostgreSQL:

```bash
npm run db:prepare
npm run dev:with-db
```

This auto-starts a local PostgreSQL instance and runs GrowJob against it.

## Database

- Prisma schema: `/Users/zitkin/Downloads/CODEX project/growjob/prisma/schema.prisma`
- Initial migration SQL: `/Users/zitkin/Downloads/CODEX project/growjob/prisma/migrations/20260210160000_init/migration.sql`
- Seed script adds:
  - ~100 Web3 companies
  - sample jobs for feed testing

## Cron Ingestion

- Manual trigger:

```bash
curl -X POST http://localhost:3000/api/cron/ingest -H "x-cron-secret: $CRON_SECRET"
```

- Local scheduler process:

```bash
npm run cron
```

Runs daily at `00:05 UTC`.

## Zero-Cost Jobs API (No DB)

GrowJob also ships with a filesystem-cached aggregation pipeline that does not use the database schema.

- Source configuration file:
  - `/Users/zitkin/Downloads/CODEX project/growjob/data/companies.json`
  - keys:
    - `greenhouseBoards`: `{ name, boardToken, websiteDomain }[]`
    - `leverCompanies`: `{ name, companySlug, websiteDomain }[]`
- Sources:
  - Greenhouse Board API
  - Lever Postings API
  - Remotive API (with source attribution kept as `sourceName` and `sourceUrl`)
- Cache file:
  - primary: `/Users/zitkin/Downloads/CODEX project/growjob/data/cache/jobs_cache.json`
  - fallback on serverless: `/tmp/growjob_jobs_cache.json`
- Freshness:
  - ingestion keeps max 10 days
  - API defaults to 7 days and caps at 10

### API: `GET /api/jobs`

Query params:

- `days=7` (default 7, max 10)
- `verifiedOnly=true|false`
- `remoteOnly=true|false`
- `tag=solana` (crypto tags)
- `q=search text`

### API: `POST /api/cron/ingest`

Header:

- `x-ingest-secret: $INGEST_SECRET` (preferred)
- `x-cron-secret: $CRON_SECRET` (backward compatible)

### Run ingestion locally

```bash
npm run ingest:jobs
```

### Add companies quickly

```bash
# Greenhouse
npm run companies:add -- --source greenhouse --name "Acme" --domain acme.com --token acme-board

# Lever
npm run companies:add -- --source lever --name "Acme" --domain acme.com --slug acme
```

### UI helper

Client helper to call unified jobs API:

- `/Users/zitkin/Downloads/CODEX project/growjob/src/lib/client/jobs.ts`

## Stripe Webhook

- Endpoint: `POST /api/stripe/webhook`
- Required env:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- On `checkout.session.completed`, user is upgraded to premium using `metadata.userId` (or `client_reference_id`).

## Tests

Run all tests:

```bash
npm test
```

Included unit tests:

- weekly UTC token reset boundaries
- ingestion dedupe key behavior
- integration tests for:
  - apply route behavior (auth/quota/success)
  - cron ingest auth + execution
  - stripe webhook signature and premium upgrade flow

## Security Notes

- Cron endpoint protected by `x-cron-secret` when `CRON_SECRET` is set
- Zero-DB ingest endpoint protected by `INGEST_SECRET` (fallback `CRON_SECRET`)
- Admin page/API guarded by session role (`ADMIN`) and `ADMIN_EMAILS`
- Auth providers only enabled when relevant env vars are configured
- Premium logic can be safely feature-flagged via `PREMIUM_FEATURE_FLAG=true`
- Optional board ingestion sources can be enabled via `ENABLE_BOARD_APIS=true`
- Avatar uploads require `BLOB_READ_WRITE_TOKEN` (Vercel Blob)

## Key Routes

- Feed: `/`
- Profile: `/profile`
- Resume scan: `/resume`
- Admin companies: `/admin/companies`
- Health: `/api/health`

## Known MVP Constraints

- Resume file storage is DB text-only in v0.1 (no external object storage)
- Stripe webhook handling and durable subscription state are not implemented in v0.1
- ATS connectors tolerate failures and skip invalid sources rather than halting ingestion
