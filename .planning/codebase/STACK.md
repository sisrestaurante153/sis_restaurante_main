# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.9 - all application code in `src/`, `scripts/` and Prisma seed/ops tooling.
- TSX/React 19 - UI and route composition in `src/app/`, `src/components/` and `src/modules/*/ui`.

**Secondary:**
- Python 3 - legacy workbook parsing in `scripts/import_legacy_excel.py` and `scripts/importers/legacy_excel/*`.
- SQL - Prisma migrations in `prisma/migrations/*/migration.sql`.
- Shell - operational scripts in `scripts/ops/*.sh` and `scripts/reset-local-env.sh`.

## Runtime

**Environment:**
- Node.js >= 20.19.0 for local development, enforced in `package.json`.
- Node.js 22 Alpine in container images, defined in `Dockerfile`.
- Browser runtime for client components marked with `"use client"`.
- Node runtime for route handlers and server modules, with explicit `runtime = "nodejs"` in `src/app/api/health/route.ts`.

**Package Manager:**
- npm 11.9.0 declared in `package.json`.
- Lockfile: `package-lock.json` is expected by `Dockerfile`.

## Frameworks

**Core:**
- Next.js 15.1.11 App Router in `src/app/`.
- React 19 in server and client component split.
- Prisma 7.5 with driver adapter mode (`@prisma/adapter-pg`) and generated client in `src/generated/prisma`.
- PostgreSQL 17 as the primary relational database via `docker-compose.yml`.

**UI:**
- Tailwind CSS 4 configured in `tailwind.config.ts` and `src/app/globals.css`.
- shadcn/Radix primitives in `src/components/ui/*`.
- MUI 7 and MUI X Data Grid used heavily in page shells and complex tables such as `src/modules/catalog/ui/items-listing-view.tsx`.
- Emotion for MUI styling integration via `src/theme/theme-registry.tsx`.

**Testing:**
- Vitest 3 for unit and integration tests in `src/tests/`.
- Playwright 1.55 for browser E2E flows in `tests/e2e/`.
- Testing Library for React component tests.
- `openpyxl` through Python test/import flows in `tests/python/` and `scripts/import_legacy_excel.py`.

**Build and Dev:**
- TypeScript with path alias `@/*` from `tsconfig.json`.
- ESLint flat config in `eslint.config.mjs`.
- Prettier in `prettier.config.mjs`.
- `tsx` for running TS scripts without a manual build.

## Key Dependencies

**Critical application dependencies:**
- `next` / `react` / `react-dom` - full-stack web runtime.
- `@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg` - relational persistence and queries.
- `zod` - env parsing and form/schema validation in files like `src/modules/platform/server/env.ts`.
- `@mui/material`, `@mui/x-data-grid`, `@emotion/*` - production UI system actually used by most screens.
- `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge` - local reusable primitives under `src/components/ui/`.
- `pino` - structured server logging in `src/modules/platform/server/logger.ts`.

**Infrastructure and tooling:**
- `dotenv` for script/runtime env loading.
- `@playwright/test`, `vitest`, `jsdom`, `@testing-library/*` for automated verification.
- `tailwindcss` and `@tailwindcss/postcss` for styling pipeline.

## Configuration

**Environment:**
- Central env parsing lives in `src/modules/platform/server/env.ts`.
- Core vars include `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, `IMPORT_STORAGE_DIR`, `IMPORT_WORKER_POLL_INTERVAL_MS` and Postgres bootstrap vars.
- App base path resolution is centralized in `src/modules/platform/lib/base-path.ts` and consumed by `next.config.ts`.

**Build and runtime config:**
- `next.config.ts` enables `output: "standalone"` and typed routes.
- `vitest.config.ts` splits jsdom unit tests from node integration tests.
- `playwright.config.ts` boots the Next dev server on port 3100 for E2E.
- `docker-compose.yml` defines `db`, `migrate`, `app`, `import-worker`, `proxy` and `db-backup`.

## Platform Requirements

**Development:**
- Node.js 20+, npm, Python 3 and a reachable PostgreSQL instance for full fidelity.
- Docker/Compose is the expected local path for Postgres and self-hosted runtime validation.
- The repo also supports a degraded demo store fallback when `DATABASE_URL` is missing or unreachable in several repositories.

**Production:**
- Self-hosted Docker deployment using the standalone Next build from `Dockerfile`.
- Nginx reverse proxy template in `docker/nginx/default.conf.template`.
- Shared writable storage for `artifacts/runtime/imports` and worker execution artifacts.

*Stack analysis: 2026-03-24*
*Update after major dependency or runtime changes*
