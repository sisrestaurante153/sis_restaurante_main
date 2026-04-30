# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Full-stack modular monolith on Next.js App Router with domain-oriented modules, server actions, Prisma-backed repositories and a local demo fallback path.

**Key Characteristics:**
- Single web codebase with UI, auth, domain logic, persistence and background import worker in one repository.
- Domain modules split by responsibility under `src/modules/access`, `audit`, `catalog`, `engineering`, `import` and `platform`.
- Pure domain logic extracted into `domain/` modules, especially composition and cost calculation.
- Repositories act as anti-corruption boundaries between UI/actions and storage details.
- Several repositories can operate against PostgreSQL or against the JSON demo store, depending on runtime availability.

## Layers

**Routing and page composition:**
- Purpose: define HTTP entry points and screen composition.
- Contains: App Router pages in `src/app/` and route handlers in `src/app/api/`.
- Depends on: server repositories, server auth helpers, UI components.
- Used by: browser clients and Playwright E2E tests.

**UI layer:**
- Purpose: render forms, grids, dashboards and navigation shells.
- Contains: shared components in `src/components/`, domain screens in `src/modules/*/ui`, theme setup in `src/theme/`.
- Depends on: React, MUI, Radix/shadcn primitives and data returned by page loaders.
- Used by: App Router pages and authenticated shell.

**Application/server layer:**
- Purpose: execute request-bound use cases and permission checks.
- Contains: server actions such as `src/modules/catalog/server/catalog-actions.ts`, `src/modules/engineering/server/engineering-actions.ts` and `src/modules/import/server/import-actions.ts`.
- Depends on: auth/authorization helpers, repositories, audit service, Zod schema parsers.
- Used by: forms and route handlers.

**Domain layer:**
- Purpose: enforce business rules that should not depend on Next.js or storage.
- Contains: recursive composition closure in `src/modules/engineering/domain/composition.ts`, cost math in `src/modules/engineering/domain/cost-engine.ts`, import execution state machine in `src/modules/import/domain/import-execution.ts`, unit normalization in `src/modules/platform/domain/units.ts`.
- Depends on: types and lightweight primitives only.
- Used by: repositories, services, scripts and tests.

**Persistence and infrastructure layer:**
- Purpose: connect business operations to Prisma, env, logging, files and container runtime.
- Contains: `src/modules/platform/infra/prisma.ts`, repository implementations in `src/modules/*/server/*repository.ts`, import artifact storage in `src/modules/import/server/import-storage.ts`.
- Depends on: Prisma client, filesystem, environment configuration.
- Used by: server actions, route handlers, background scripts.

**Operational scripts layer:**
- Purpose: background processing, seeding, import load and maintenance.
- Contains: `scripts/import-worker.ts`, `scripts/load-legacy-import.ts`, `scripts/ops/*.ts`, `scripts/ops/*.sh`.
- Depends on: the same domain and repository modules used by the app.
- Used by: operators and Docker services.

## Data Flow

**Authenticated page request:**
1. Request enters `src/middleware.ts`.
2. Middleware reads the signed session cookie and checks route policy from `src/modules/access/domain/access-control.ts`.
3. App Router page in `src/app/(app)/*` calls `requireSession()` or specific repositories.
4. Repository loads data from Prisma, or falls back to demo data when the DB is unavailable.
5. Page renders server-side and passes serialized data into client components where needed.

**Item save flow:**
1. Client form in `src/modules/catalog/ui/item-form.tsx` submits to `saveItemAction()`.
2. `src/modules/catalog/server/item-form-schema.ts` parses and validates form data.
3. `src/modules/catalog/server/catalog-repository.ts` writes `item`, units, purchases and conversions.
4. Audit event is recorded through `src/modules/audit/server/audit-service.ts`.
5. If cost drivers changed, cascade recalculation is triggered from the repository/service layer.

**Ficha save and cost recalculation flow:**
1. `src/modules/engineering/ui/ficha-form.tsx` submits to `saveFichaAction()`.
2. `src/modules/engineering/server/ficha-form-schema.ts` parses the payload.
3. `src/modules/engineering/server/engineering-repository.ts` updates `ficha_tecnica` and `ficha_componente`.
4. `assertNoCyclesBeforeSaving()` and `rebuildDependencyClosure()` maintain the dependency graph.
5. `recalculateCascade()` in `src/modules/engineering/server/cost-engine-service.ts` recalculates affected ascendents and persists snapshots.

**Legacy import flow:**
1. Upload starts in `src/modules/import/server/import-actions.ts`.
2. Workbook is stored by `persistImportWorkbook()` in `src/modules/import/server/import-storage.ts`.
3. Import execution metadata is persisted through `src/modules/import/server/import-repository.ts`.
4. `scripts/import-worker.ts` picks pending executions and launches the Python parser.
5. `scripts/load-legacy-import.ts` reads parser artifacts, upserts items/fichas/staging rows and records conflicts.
6. UI pages under `src/app/(app)/importacao*` poll and resolve pending reconciliation items.

## Key Abstractions

**Repository factories:**
- Purpose: provide a stable read/write API to pages and actions.
- Examples: `getCatalogRepository()`, `getEngineeringRepository()`, `getImportRepository()`, `getAuthRepository()`.
- Pattern: factory returning a plain object of use cases; hides Prisma-vs-demo branching.

**Calculation graph:**
- Purpose: represent recursive item composition independently of persistence.
- Examples: `CalculationGraph`, `CalculatedItemCost`, `CascadeRecalculationResult` in `src/modules/engineering/domain/cost-engine.ts`.
- Pattern: pure functional domain engine with deterministic output from graph inputs.

**Dependency closure:**
- Purpose: materialize recursive ancestry/descendency for cycle detection and cascade ordering.
- Examples: `buildDependencyClosure()` and persisted `dependencia_item`.
- Pattern: compute-then-persist graph closure.

**Execution snapshot metadata:**
- Purpose: persist calculation and import summaries for auditing and UI presentation.
- Examples: `custo_snapshot_item`, `calculo_execucao`, `calculo_componente_snapshot`, `importacao_execucao`.
- Pattern: append-only snapshot/history tables plus current state tables.

## Entry Points

**Web app:**
- Location: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, page files under `src/app/(app)/*`.
- Triggers: browser requests and navigation.
- Responsibilities: route composition, auth gating, screen rendering.

**HTTP API routes:**
- Location: `src/app/api/auth/*`, `src/app/api/importacao/*`, `src/app/api/health/route.ts`.
- Triggers: programmatic fetches, health checks and login/logout requests.
- Responsibilities: JSON responses, cookie mutation, file download and health reporting.

**Background worker:**
- Location: `scripts/import-worker.ts`.
- Triggers: Docker `import-worker` service or manual CLI execution.
- Responsibilities: pull pending imports, call Python parser, load report, mark completion/failure.

**Operational CLI scripts:**
- Location: `scripts/ops/*.ts` and `prisma/seed.ts`.
- Triggers: npm scripts and operator commands.
- Responsibilities: bootstrap, user creation, cost recalculation, backup/restore and conflict resolution.

## Error Handling

**Strategy:** throw domain invariants inside pure logic, parse/validate at boundaries, then often collapse infrastructure failures into `null`, redirects or fallback demo behavior at repository/action boundaries.

**Patterns:**
- Domain errors use `DomainInvariantError` in `src/modules/engineering/domain/errors.ts`.
- Form validation uses Zod and returns structured field errors from server actions.
- Repositories frequently wrap Prisma calls in `try/catch` and return `null` on failure.
- Import worker translates failures into friendly summaries and persisted execution status.

## Cross-Cutting Concerns

**Validation:**
- Zod schemas for env and form parsing in `src/modules/platform/server/env.ts`, `src/modules/catalog/server/item-form-schema.ts` and `src/modules/engineering/server/ficha-form-schema.ts`.

**Authentication and authorization:**
- Cookie-backed custom session implementation in `src/modules/access/server/session*.ts`.
- Role and route policy enforcement in `src/modules/access/domain/access-control.ts` and `src/middleware.ts`.

**Auditing:**
- Audit records are written by `src/modules/audit/server/audit-service.ts`.
- The audit page uses `src/modules/audit/server/audit-repository.ts` and `src/modules/audit/ui/audit-timeline.tsx`.

**Observability:**
- Health payload builder in `src/modules/platform/server/health/get-health-payload.ts`.
- Structured logger in `src/modules/platform/server/logger.ts`.

*Architecture analysis: 2026-03-24*
*Update when module boundaries, entry points or storage strategy change*
