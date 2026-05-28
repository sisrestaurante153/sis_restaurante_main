# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Prisma generate + next build
npm run lint         # ESLint
npm run typecheck    # TypeScript check (no emit)
npm run format       # Prettier (write)
npm run format:check # Prettier (dry-run)

# Tests
npm run test:unit               # Vitest unit tests
npm run test:unit:watch         # Vitest watch mode
npm run test:integration        # Vitest integration tests
npm run test:e2e                # Playwright e2e
npm run test:e2e:ui             # Playwright interactive UI
npm test                        # All tests (unit + integration + e2e)

# Database
npm run db:up        # Docker Compose start PostgreSQL
npm run db:down      # Docker Compose stop
npm run db:migrate   # Prisma migrate dev
npm run db:push      # Prisma db push (no migration file)
npm run db:generate  # Prisma client generation
npm run db:seed      # Seed bootstrap data
npm run db:logs      # Docker Compose DB logs

# Operational scripts
npm run ops:migrate-and-seed    # Migrations + optional seed (env RUN_DB_SEED=true)
npm run ops:create-user         # Create admin user
npm run ops:recalculate-costs   # Recalculate all item costs
npm run ops:reconcile-conflict  # Resolve import conflicts
npm run ops:backup              # PostgreSQL dump
npm run ops:restore             # PostgreSQL restore
npm run ops:import-worker       # Start async import worker process

# Legacy import
npm run import:legacy:parse     # Parse Excel with Python
npm run import:legacy:load      # Load parsed data into DB
```

## Architecture

**Modular Monolith** (ADR 001) — single Next.js App Router deployment, domain split into 8 modules under `src/modules/`:

| Module | Responsibility |
|--------|---------------|
| `platform` | Core infra: session, email, logging, shared utilities |
| `access` | Auth, RBAC (roles + permissions) |
| `master-data` | Unit types, operational categories, item aliases |
| `catalog` | Item (insumo) CRUD |
| `engineering` | Technical sheets (fichas), composition, recursive cost calculation |
| `import` | Legacy Excel parse → staging → conflict reconciliation |
| `billing` | Subscription management, Asaas payment webhook |
| `audit` | Change audit log |

Each module follows this folder structure:
```
src/modules/<module>/
├── ui/       # React components, forms, client/server UI
├── server/   # Server actions, use cases ("use server")
├── domain/   # Types, interfaces, business rules
└── infra/    # Prisma queries, external adapters
```

### App Router Layout

- `src/app/(app)/` — Authenticated routes (dashboard, fichas, itens, etc.)
- `src/app/(auth)/` — Public routes (login, signup, password reset)
- `src/app/api/` — API endpoints (health, auth callbacks, webhooks)

### Key Domain Entities

- **Item** — master ingredient/product record; types: `insumo`, `pre_preparo`, `intermediario`, `prato`, `porcao`, `marmita`, `combo`, `embalagem`, `apoio`
- **FichaTecnica** — recipe/technical sheet; statuses: `rascunho → ativa → inativa → arquivada`
- **FichaComponente** — recipe line (ingrediente/embalagem/apoio), linked to items
- **ItemCompra** — purchase link (item → supplier → unit → cost), drives cost calculation
- **Restaurante** — multi-tenant root; every entity belongs to a restaurant
- **Assinatura** — subscription record (trial/active/overdue/cancelled/suspended/bloqueada/expirada)

### Cost Calculation

Recursive cost recalculation cascades from `item_compra` changes up through `ficha_componente` → `ficha_tecnica` → dependent fichas. `custo_snapshot_item` and `calculo_componente_snapshot` store immutable cost history. `dependencia_item` tracks the dependency graph for cycle prevention.

### Import Pipeline

Excel → Python parser → `importacao_staging` rows (status: pending/conflict/imported/skipped) → import worker polls for `processando` executions → conflicts queue in `importacao_conflito` for manual reconciliation.

## Database Conventions

**Column naming prefixes** (mandatory — do not change):
- `cd_` — código/ID references
- `nm_` — nome (name)
- `ds_` — descrição (description, also used for codes/slugs)
- `tp_` — tipo (type/category)
- `vl_` — valor (numeric value)
- `sn_` — sim/não (boolean flags)
- `nr_` — número (numeric counts/sequences)
- `ts_` — timestamp
- `js_` — JSON blobs

All IDs are CUIDs. All timestamps are `timestamptz(6)` (UTC). Soft deletes use `sn_ativo` boolean. `ds_codigo_interno` on items must always be numeric; auto-generation increments the highest existing value.

## Testing Layout

```
src/tests/unit/         # Vitest unit tests
src/tests/integration/  # Vitest integration tests
tests/e2e/              # Playwright e2e
tests/python/           # Python unittest (import pipeline)
```

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — 32-char hex
- `APP_URL` — base URL (used for dynamic basePath in next.config.ts)
- `RESEND_API_KEY` + `EMAIL_FROM` — transactional email
- `ASAAS_API_KEY`, `ASAAS_WALLET_ID`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN` — payments
- `SENTRY_DSN` — error tracking (optional in dev)

Bootstrap credentials after seed:
- `admin@sis-restaurante.local` / `admin123`
- `engenharia@sis-restaurante.local` / `engenharia123`
- `consulta@sis-restaurante.local` / `consulta123`

## Tech Stack

- **Next.js 15** (App Router, standalone output), **React 19**, **TypeScript 5**
- **Prisma 7** + **PostgreSQL 17** (Docker in dev)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI) + **MUI 7** (DataGrid, DatePicker)
- **Zod 4** (validation), **Pino** (logging), **Sentry** (error tracking)
- **Vitest** (unit/integration), **Playwright** (e2e)
- **Resend** (email), **Asaas** (payments), **XLSX** (Excel import)

## Docker Compose (Production)

Six services: `db` (Postgres 17), `migrate` (one-shot migrations + seed), `app` (Next.js), `proxy` (Nginx 1.27, port 80), `import-worker`, `db-backup`. All services use healthchecks and depend chains. Persistent volumes: `postgres_data`, `db_backups`, `import_storage`.
