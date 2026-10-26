# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file current.** Whenever you ship a new feature/module, hit a build-breaking gotcha, or uncover a data-quality/instability issue worth knowing next time, add or update a note here in the same commit — don't let this file drift out of sync with the codebase. Prefer the "Known Issues / Unstable Areas" section below for anything workaround-shaped; prefer the tables above it for anything structural.

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
npm run test:unit               # Vitest unit tests (watch: test:unit:watch)
npm run test:integration        # Vitest integration tests
npm run test:e2e                # Playwright e2e (interactive: test:e2e:ui)
npm test                        # All tests (unit + integration + e2e)

# Database
npm run db:up        # Docker Compose start PostgreSQL
npm run db:down      # Docker Compose stop
npm run db:migrate   # Prisma migrate dev
npm run db:push      # Prisma db push (no migration file)
npm run db:generate  # Prisma client generation
npm run db:seed      # Seed bootstrap data

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

**Modular Monolith** (ADR 001) — single Next.js App Router deployment, domain split into 10 modules under `src/modules/`:

| Module | Responsibility |
|--------|---------------|
| `platform` | Core infra: session, email, logging, shared utilities |
| `access` | Auth, RBAC (roles + permissions) |
| `master-data` | Suppliers, units, operational categories, item/stage type registries |
| `catalog` | Item (insumo/embalagem) CRUD |
| `engineering` | Technical sheets (fichas), composition, recursive cost calculation |
| `import` | Legacy Excel parse → staging → conflict reconciliation |
| `menu` | Cardápios (sales menus) and their item/price links |
| `sales` | Vendas (sales records), CSV/Excel sales import (`/vendas/importar`), and financial return reporting |
| `billing` | Subscription management, Asaas payment webhook |
| `audit` | Change audit log |

Each module has `ui/`, `server/`, `domain/` (types, business rules). A separate
`infra/` layer is **not** a real convention — only `platform` has one; every
other module queries Prisma directly inside `server/*-repository.ts`.

Repositories follow a factory pattern: `getXRepository(restaurantId)` returns
an object of async methods, tries a Prisma-backed path first, and falls back
to an in-memory/file-backed demo store (`src/modules/platform/server/demo-data.ts`)
when `DATABASE_URL` is unset — keep this fallback in sync when adding fields.

### App Router Layout

- `src/app/(app)/` — Authenticated routes (dashboard, fichas, itens, pre-preparo, cardapios, vendas, retorno-financeiro, cadastros, importacao, billing, etc.)
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

## Code Conventions

- **Named exports only** — no `export default` for components, functions, or repositories (`export function ItemForm(...)`, `export function getCatalogRepository(...)`).
- Server-only modules start with `import "server-only";`. Server actions/mutations use `"use server"`.
- File naming: kebab-case (`catalog-repository.ts`, `items-listing-view.tsx`).
- Tests mirror source paths under `src/tests/unit/`, suffix `.test.ts`/`.test.tsx`.

## Testing Layout

```
src/tests/unit/         # Vitest unit tests
src/tests/integration/  # Vitest integration tests
tests/e2e/              # Playwright e2e
tests/python/           # Python unittest (import pipeline)
```

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string. If pointed at a Supabase
  transaction pooler (port 6543), it **must** include `?pgbouncer=true` —
  without it Prisma's prepared statements fail intermittently.
- `SESSION_SECRET` — 32-char hex
- `APP_URL` — base URL (used for dynamic basePath in next.config.ts)
- `RESEND_API_KEY` + `EMAIL_FROM` — transactional email
- `ASAAS_API_KEY`, `ASAAS_WALLET_ID`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN` — payments
- `SENTRY_DSN` — error tracking (optional in dev)

Bootstrap credentials after seed (email / password): `admin@sis-restaurante.local` / `admin123`, `engenharia@sis-restaurante.local` / `engenharia123`, `consulta@sis-restaurante.local` / `consulta123`.

## Tech Stack

- **Next.js 15** (App Router, standalone output), **React 19**, **TypeScript 5**
- **Prisma 7** + **PostgreSQL 17** (Docker in dev)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI) + **MUI 7** (DataGrid, DatePicker)
- **Zod 4** (validation), **Pino** (logging), **Sentry** (error tracking)
- **Vitest** (unit/integration), **Playwright** (e2e)
- **Resend** (email), **Asaas** (payments), **XLSX** (Excel import)

## Known Issues / Unstable Areas

- **Ficha técnica cost engine — don't trust `costs.perPortion`.** `catalog-prisma-mappers.ts`'s `mapCosts()` exposes both `costs.total` (matches what the ficha screen shows as "custo atual") and `costs.perPortion` (read from `calculo_execucao.js_metadados.costPerPortion`). For items whose ficha yield is measured by weight (kg) and then packaged into a sale unit (e.g. a marmitex), `costPerPortion` has been observed returning a value computed with the wrong divisor (the same divisor reused across unrelated items with different yields) — it does **not** reliably represent the cost of one sold unit. Always use `costs.total` for per-sold-unit cost (e.g. in `sales-repository.ts`'s `getFinancialReturn`); treat `perPortion` as unverified until the underlying calc-engine bug is found and fixed.
- **`item.tp_item` is not a reliable ground truth — but neither is "it's typed `pre_preparo`, so its ficha must be wrong".** A meaningful chunk of Titan Restaurante's catalog has finished, sellable menu items (dishes, drinks, desserts) incorrectly typed as `pre_preparo` — but these mistyped items very often carry the *correct*, correctly-scaled, already-working ficha técnica; only their `tp_item` label is wrong. **Do not decide "this venda is linked to the wrong item" from type alone.** Validate with a cost/price sanity check first: `ficha.costs.total` should land roughly 10–50% of the item's typical sale price (`vl_preco_unitario` on its `venda` rows); if it's close to or above 100% of the sale price, the ficha is almost certainly scaled for a raw batch (e.g. "5kg de arroz" with no per-portion divisor) and the venda really is on the wrong item — otherwise, the right fix is to **retype the item in place** (keep its `cd_item` and ficha, just correct `tp_item`), not to move the venda to a same-named sibling. Moving vendas by name-similarity alone (as done in a first pass, Sept 2026) redirected ~900 correctly-costed vendas onto ficha-less placeholder items and had to be reverted by hand once the ratio check exposed it — treat that first instinct as the wrong one now.
- **Some sellable-typed items also have a batch-scale ficha (separate, unresolved bug).** Even items with the *correct* `tp_item` and a ficha técnica can still fail the cost/price ratio check above — e.g. "Bife de alcatra acebolado" (`prato`) has a ficha yielding 4.527kg with zero packaging/portion-count components, so `costs.total` (R$150) is the cost of the whole batch, not one ~160g plate (real per-plate cost ≈ R$5.31). This is **not** something to silently patch — it means that ficha's rendimento/porções config needs to be fixed by whoever owns the menu data (add a portion count or packaging line so the yield represents one sold unit). When you find one, flag it rather than guessing a divisor.
- **`npm run lint` is more permissive than the Vercel build.** `next build`'s ESLint pass (e.g. `no-unused-vars`) can fail in production even when `npm run lint` reports clean. Before pushing UI changes, prefer `npx next lint --dir <changed-module-dir>` (mirrors the build's ruleset) over the bare `npm run lint` script.
- **`FUZZY_THRESHOLD = 0.60`** (Jaccard token similarity) is the established convention across import/matching code (`sales-import.ts`, one-off import scripts) for auto-accepting a fuzzy name match without human review. Reuse `normalizeForMatch`/`tokens`/`jaccard` from `src/modules/sales/domain/sales-import.ts` rather than re-implementing matching logic — and remember the type-filtering caveat above when reusing it.
- **Missing ficha técnica ≠ zero cost.** A large share of Titan Restaurante's sellable items (menu items seeded without a ficha yet, per the "cadastro em 2 etapas" plan) have no `ficha_tecnica` row at all. `catalogRepository.getItemDetail().costs.total` silently falls back to `"0.0000"` for these — do **not** treat that as a verified zero cost. Check `detail.fichaStatus` (null when there's no ficha) before trusting `costs.total`; `sales-repository.ts`'s `getFinancialReturn` exposes this as `FinancialReturnRow.hasCostData` and the UI renders `"--"` instead of a fake 100% margin. Apply the same guard anywhere else `costs.total` feeds a margin/profitability calculation.

- **Prisma interactive transactions (`prisma.$transaction(async (tx) => ...)`) can silently fail against the Supabase pooler — fixed 2026-10-26 via a global `transactionOptions` default, but watch for this pattern elsewhere.** Prisma's default `maxWait` (how long it waits to *start* a transaction before giving up) is 2000ms. Measured directly against this project's pooled connection (port 6543, `pgbouncer=true`): a trivial interactive transaction (`tx.item.count()`, nothing else) took **10+ seconds just to begin**, so every interactive transaction was failing with `P2028 "Unable to start a transaction in the given time"` essentially always, not intermittently. Caught via a real user report: Fabiana tried to "vincular ficha pendente" (link Feijoada → Feijoada média) twice and nothing happened — `linkFichaToPendingItemWithPrisma`'s `prisma.$transaction(callback, { timeout: 30000 })` only overrides `timeout`, not `maxWait`, so it kept hitting the 2000ms default and throwing P2028, caught by `ficha-link-actions.ts`'s generic `catch {}` and redirected to `?error=link` with no detail — easy to miss, looks like "the button does nothing." **Fixed** in `src/modules/platform/infra/prisma.ts`'s `getPrismaClient()`: `new PrismaClient({ adapter, transactionOptions: { maxWait: 15000, timeout: 30000 } })` sets the default for every `$transaction()` call app-wide, not just this one call site. Verified by re-running the real failing action after the fix — it succeeded and persisted correctly. If a mutation that uses an interactive transaction appears to silently no-op (action returns, page redirects, but nothing changed in the DB), **check for P2028 first** — don't assume it's a logic/data bug in the specific feature before ruling this out, since the generic catch blocks around these actions tend to swallow the real Prisma error without logging it anywhere visible.
- **Legacy Excel import pipeline used to be hardcoded to `cd_restaurante: "rest_padrao"` — fixed 2026-10-26, but old data from before the fix is still scattered across the wrong tenant.** `scripts/load-legacy-import.ts` (invoked both by the in-app import-worker via `scripts/import-worker.ts`, and by the standalone `npm run import:legacy:load` CLI) hardcoded `"rest_padrao"` in five places (the known-items lookup for dedup, the `Item` upsert's `cd_restaurante`, and the `FichaTecnica` upsert's `cd_restaurante`, twice) ever since the multi-tenant migration (`6c5e41a`), which never updated it. Caught via Titan Restaurante (real `cd_restaurante = cmpoladu9000004i5z122fok2`) asking why "Margarina (75-80%) SEM SAL balde 15 kg" wasn't showing up after importing a Vmarket curva-ABC spreadsheet — the item already existed in the DB, created back in May under `rest_padrao` (and a separate copy under `rest_plataforma_testes`), never under Titan's actual tenant. Every row in `importacao_execucao` had `cd_restaurante` of either `"rest_padrao"` or `null` — never a real client's id — so this pipeline had likely never landed data in the correct tenant for any client since multi-tenancy was introduced. **Fixed**: `ImportExecutionRecord` now carries `restaurantId`; `import-worker.ts` calls `getImportRepository(null)` (no tenant filter — it's one shared process serving every restaurant) instead of the old implicit `"rest_padrao"` default, and passes the execution's real `restaurantId` into `loadLegacyImportReport`, which threads it through `upsertImportedItems`/`importRecipes` instead of the literal string (falls back to `"rest_padrao"` only for a bare CLI run with no `executionId`/no explicit `restaurantId`). The one-off Margarina item was created by hand directly under Titan's tenant (cloned from the `rest_padrao` copy) rather than re-running the import. **Not done**: no bulk migration of the other `rest_padrao`/`rest_plataforma_testes`-owned items into real tenants — that bucket has accumulated rows from multiple test/demo contexts too, not just pre-migration client data, so each item needs per-item confirmation of which real restaurant (if any) it belongs to before moving it. Also surfaced in passing: Titan's existing "Margarina com sal balde 3 kg" holds `ds_codigo_interno = "555157"`, but per the client's own Vmarket curva ABC sheet that código belongs to the SEM SAL item — looks like a prior mix-up between the two margarinas; flagged to the client, not yet corrected.
- **"Itens associados" removal for `stage-type` now deletes the component directly and recalculates cost — `item-type`/`modality` stay read-only.** Originally `linked-items-repository.ts`'s `kind === "stage-type"` always returned `removable: false` ("editado dentro da ficha técnica"). Client (Titan) asked for items like a packaging item ("Bobina picotada") that was nonsensically listed as a component in a "Limpeza / Pré-Preparo" step to be removable by the client themselves, not just flagged for someone to fix in each ficha's editor (confirmed case: it was a real data error in 2 fichas técnicas — "Carne seca escondidinho" and "carne seca pré preparada"). Fixed 2026-10-26: `removeLink` for `stage-type` now does `fichaComponente.deleteMany({ where: { cd_item_componente: itemId, fichaEtapa: { cd_tipo_etapa: recordId } } })` across every ficha that has that item in a step of that type, then calls `recalculateCascade` for the affected result items — unlike the "vincular ficha pendente" flow, this *is* a real edit to the ficha (removing an ingredient), so recalculating cost here is correct and expected, not the "never recalculate" rule that applies to reassignment. `item-type` and `modality` are unrelated kinds and are still intentionally read-only (reclassifying an item's type or a ficha's modality is a bigger decision than deleting a stray component, left to their own screens).

## Docker Compose (Production)

Six services: `db` (Postgres 17), `migrate` (one-shot migrations + seed), `app` (Next.js), `proxy` (Nginx 1.27, port 80), `import-worker`, `db-backup`. All services use healthchecks and depend chains. Persistent volumes: `postgres_data`, `db_backups`, `import_storage`.
