# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```text
sis-restaurante/
├── docs/                 # ADRs, domain docs, operations, QA and implementation plans
├── docker/               # Nginx runtime templates
├── prisma/               # Prisma schema, migrations and seed
├── scripts/              # Import pipeline, workers and ops scripts
├── src/
│   ├── app/              # Next App Router pages, layouts and route handlers
│   ├── components/       # Cross-module layout and UI primitives
│   ├── generated/        # Prisma client output (committed, generated)
│   ├── lib/              # Small shared helpers
│   ├── modules/          # Domain-oriented application modules
│   ├── tests/            # Unit and integration tests
│   └── theme/            # MUI/Emotion theme setup
├── tests/                # Playwright E2E and Python parser tests
├── Dockerfile            # Multi-stage build for app, ops and worker
├── docker-compose.yml    # Self-hosted runtime topology
├── eslint.config.mjs     # ESLint flat config
├── next.config.ts        # Next runtime/build config
├── package.json          # Scripts and dependency manifest
└── prettier.config.mjs   # Formatting rules
```

## Directory Purposes

**`src/app/`:**
- Purpose: route tree and HTTP surface.
- Contains: App Router pages, route handlers, layouts and loading states.
- Key files: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/api/health/route.ts`.
- Subdirectories: `(app)` for authenticated product pages, `(auth)` for login, `api/` for handlers.

**`src/modules/`:**
- Purpose: primary place for business features.
- Contains: `access`, `audit`, `catalog`, `engineering`, `import`, `platform`.
- Key files: repository/action/domain files within each module.
- Subdirectories: typically `domain/`, `server/`, `ui/`, plus `infra/` or `lib/` where needed.

**`src/components/`:**
- Purpose: cross-cutting layout and presentational building blocks.
- Contains: `layout/` and `ui/`.
- Key files: `src/components/layout/AppShellClient.tsx`, `src/components/ui/data-grid-pattern.tsx`.

**`prisma/`:**
- Purpose: relational schema and migration history.
- Contains: `schema.prisma`, migration folders, `seed.ts`.
- Key files: `prisma/schema.prisma`, `prisma/migrations/202603131430_domain_foundation/migration.sql`.

**`scripts/`:**
- Purpose: operational and import automation outside the request lifecycle.
- Contains: background worker, Python launcher, loader and ops utilities.
- Key files: `scripts/import-worker.ts`, `scripts/load-legacy-import.ts`, `scripts/import_legacy_excel.py`, `scripts/ops/migrate-and-seed.sh`.

**`src/tests/` and `tests/`:**
- Purpose: automated verification.
- Contains: unit/integration tests in `src/tests/`, E2E and Python tests in `tests/`.
- Key files: `src/tests/unit/setup.ts`, `src/tests/integration/helpers/prisma-test-env.ts`, `tests/e2e/engineering-flow.spec.ts`.

**`docs/`:**
- Purpose: persistent architecture and operational knowledge.
- Contains: ADRs, domain docs, import docs, operations runbooks and QA artifacts.
- Key files: `docs/adr/`, `docs/domain/`, `docs/import/`, `docs/operations/`, `docs/qa/`.

## Key File Locations

**Entry points:**
- `src/app/page.tsx`: root redirect/home page.
- `src/app/(app)/layout.tsx`: authenticated shell bootstrap.
- `src/app/api/auth/login/route.ts`: programmatic login endpoint.
- `scripts/import-worker.ts`: background import executor.

**Configuration:**
- `package.json`: scripts, engines and dependencies.
- `next.config.ts`: standalone build, basePath and experimental options.
- `tsconfig.json`: compiler settings and `@/*` path alias.
- `vitest.config.ts`: unit/integration test config.
- `playwright.config.ts`: E2E dev server orchestration.
- `eslint.config.mjs` and `prettier.config.mjs`: code style.

**Core logic:**
- `src/modules/engineering/domain/cost-engine.ts`: recursive cost engine.
- `src/modules/engineering/domain/composition.ts`: cycle detection and dependency closure.
- `src/modules/catalog/server/catalog-repository.ts`: item persistence/query API.
- `src/modules/engineering/server/engineering-repository.ts`: ficha persistence/query API.
- `src/modules/import/server/import-repository.ts`: import execution and conflict state.

**Testing:**
- `src/tests/unit/`: component, page, domain and route tests.
- `src/tests/integration/`: Prisma-backed integration tests.
- `tests/e2e/`: browser flows.
- `tests/python/`: parser tests for the workbook pipeline.

## Naming Conventions

**Files:**
- Lowercase kebab-ish domain filenames for logic files, for example `catalog-repository.ts`, `cost-engine-service.ts`, `import-execution.ts`.
- PascalCase `.tsx` files for React components that are used as components, for example `AppShell.tsx`, `PageHeader.tsx`, `ResumoFichaSidebar.tsx`.
- `*.test.ts` / `*.test.tsx` for tests.

**Directories:**
- `src/modules/<feature>/<layer>` is the dominant organizational pattern.
- App Router directories follow Next conventions, including route groups like `src/app/(app)` and dynamic segments like `src/app/(app)/fichas/[fichaId]`.

**Special patterns:**
- Generated code lives under `src/generated/` and is ignored by lint.
- Server-only modules often begin with `import "server-only";`.
- Client components begin with `"use client";`; server actions begin with `"use server";`.

## Where to Add New Code

**New domain feature:**
- Primary code: `src/modules/<feature>/`.
- Route/page wiring: `src/app/`.
- Tests: `src/tests/unit/` for domain/UI, `src/tests/integration/` if Prisma interaction matters.

**New shared UI component:**
- Cross-module primitive: `src/components/ui/`.
- Layout/navigation element: `src/components/layout/`.
- Module-specific screen widget: `src/modules/<feature>/ui/`.

**New persistence or background workflow:**
- Repository/service: `src/modules/<feature>/server/`.
- Pure business rules: `src/modules/<feature>/domain/`.
- Long-running or operator entry point: `scripts/`.

**New documentation:**
- Architecture/ops rationale: `docs/`.
- Generated codebase map: `.planning/codebase/`.

## Special Directories

**`src/generated/`:**
- Purpose: generated Prisma client output.
- Source: `prisma generate`.
- Committed: yes, but should still be treated as generated code.

**`artifacts/`:**
- Purpose: runtime file outputs for imports, demo store and local operational artifacts.
- Source: app runtime, worker and scripts.
- Committed: mostly ignored by `.gitignore`.

**`.planning/`:**
- Purpose: agent-produced planning and mapping artifacts.
- Source: GSD workflows.
- Committed: yes when explicitly generated and tracked.

*Structure analysis: 2026-03-24*
*Update when directory layout or placement rules change*
