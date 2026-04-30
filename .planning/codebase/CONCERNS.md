# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Prisma/demo dual-path repositories:**
- Issue: multiple repositories silently switch between PostgreSQL and `demo-store.json`.
- Why: local bootstrap and initial delivery needed to remain usable without a live DB.
- Impact: behavior can differ between environments, especially around audit history, auth and persistence edge cases.
- Fix approach: keep demo mode behind an explicit feature flag or remove it once DB-backed bootstrap is stable everywhere.

**Broad repository catch-and-return-null behavior:**
- Issue: many Prisma calls are wrapped in `try/catch` and converted to `null`.
- Why: pages and actions stay resilient during bootstrap or partial infra failure.
- Impact: real persistence bugs can be masked and become harder to diagnose.
- Fix approach: return typed error results or log structured failures before degrading.

**Mixed UI stack:**
- Issue: the project declares Tailwind + shadcn, but real screens lean heavily on MUI and Emotion.
- Why: MUI gives grids, layout primitives and data-heavy widgets quickly.
- Impact: duplicated styling paradigms increase maintenance cost and design inconsistency risk.
- Fix approach: choose the long-term primary UI system and reduce parallel abstractions.

**Ficha tecnica usa stages[] em vez de etapa-por-linha [RESOLVIDO — 2026-04-17, commits dbf6de0/7ea2c81/e872872]:**
- Pendencia original (v3 #10, D1 = A): `ComponentsEditor` renderizava cada etapa como card; HTML aprovado pede etapa inline por linha de ingrediente.
- Resolucao: `ComponentEditorRow` estendido com `stageTypeCode`/`stageTypeLabel`/`outputWeight`/`isCoccaoFinal`; novo `FichaFlatGrid` com grid 8 colunas batendo `tela-ficha-tecnica-v2.html`; helpers `ficha-flat-rows.ts` distribuem dados ao carregar e reagrupam `stages[]` ao serializar. Backend/schema intactos. 126/126 tests verdes; smoke visual via playwright (dev-preview) confirmou paridade.

## Known Bugs or Risky Behaviors

**Default session secret fallback in runtime code [RESOLVIDO — 07-01, commit f01a522, 2026-04-17]:**
- Symptoms: auth still works even when `SESSION_SECRET` is unset because a hard-coded fallback is used.
- Trigger: starting the app without a real secret.
- Resolucao: `SESSION_SECRET` agora e obrigatorio em tempo de execucao (schema Zod sem default, runtime aborta cedo). Ver commit f01a522 "fix(07-01): require session secret in runtime".

**Repository writes can succeed without matching audit durability:**
- Symptoms: audit records may end up only in demo storage if Prisma audit insertion fails.
- Trigger: partial DB problems during `createAuditService().record()`.
- Workaround: inspect both DB and demo artifacts when debugging.
- Root cause: `src/modules/audit/server/audit-service.ts` falls back to demo persistence on write failure.

## Security Considerations

**Session secret management:**
- Risk: predictable fallback secret allows forged sessions if operators forget to configure production secrets.
- Current mitigation: schema requires minimum length 32, cookie is `httpOnly` and `sameSite=lax`.
- Recommendations: remove defaults for production code paths and fail fast when the secret is missing.

**Auth fallback demo credentials:**
- Risk: bootstrap credentials documented in `README.md` and surfaced in the login UI can leak into shared environments.
- Current mitigation: cookie is signed and routes are permission-gated.
- Recommendations: gate demo credentials behind non-production mode and avoid shipping them in production-facing docs/UI.

**Upload and artifact storage:**
- Risk: local file storage for XLSX uploads and reports can accumulate sensitive business files.
- Current mitigation: filenames are sanitized in `src/modules/import/server/import-storage.ts`.
- Recommendations: add retention policy, size quotas, access control around artifact download and at-rest protection if needed.

## Performance Bottlenecks

**Cascade recalculation path:**
- Problem: recalculation loads nodes recursively and writes snapshots row-by-row inside a transaction.
- Cause: `src/modules/engineering/server/cost-engine-service.ts` does per-item graph loading plus per-component insert loops.
- Improvement path: batch reads/writes more aggressively and separate heavy recompute from synchronous save flows if throughput grows.

**Import loader and worker:**
- Problem: import parsing and loading are file- and DB-intensive, with serialized processing through an advisory lock.
- Cause: `IMPORT_QUEUE_LOCK_SQL` in `src/modules/import/server/import-repository.ts` and the single worker model.
- Improvement path: keep one active execution by design, but optimize loader batching and artifact parsing for larger workbooks.

## Fragile Areas

**Engineering repository save flow:**
- Why fragile: ficha save touches item type, active-version switching, components, dependency closure rebuild and cascade recalc in one path.
- Common failures: versioning regressions, cycle handling mistakes, stale dependency closure or expensive recalculation during save.
- Safe modification: change `src/modules/engineering/server/engineering-repository.ts` together with `src/modules/engineering/server/cost-engine-service.ts` and domain tests.
- Test coverage: solid unit/integration coverage exists, but the path is still high risk.

**Import execution pipeline:**
- Why fragile: it spans file upload, DB state machine, Python execution, JSON artifact generation and conflict reconciliation.
- Common failures: mismatched artifact shape, worker failure state, missing files or inconsistent staging rows.
- Safe modification: update `scripts/import-worker.ts`, `scripts/load-legacy-import.ts`, `scripts/import_legacy_excel.py` and import repository/tests together.
- Test coverage: E2E and Python tests exist, but the cross-language boundary remains delicate.

## Scaling Limits

**Single-process import worker:**
- Current capacity: one active workbook execution at a time by design.
- Limit: imports queue behind the advisory lock and one worker loop.
- Symptoms at limit: delayed processing and growing pending import queue.
- Scaling path: preserve exclusivity if business rules require it, but make queue visibility and worker observability stronger.

**App shell data loading:**
- Current capacity: acceptable for current bootstrap scale.
- Limit: `src/app/(app)/layout.tsx` fetches pending conflicts on every authenticated page render.
- Symptoms at limit: extra repeated DB reads across all app pages.
- Scaling path: cache lightweight counts or move to a targeted query/streamed badge endpoint.

## Dependencies at Risk

**Committed generated Prisma client:**
- Risk: generated output in `src/generated/` can drift from schema or local engine/runtime expectations.
- Impact: confusing diffs and stale generated code if contributors forget `prisma generate`.
- Migration plan: keep it committed only if required by deployment flow; otherwise generate in CI/build and ignore source output.

**MUI plus Tailwind plus Radix stack overlap:**
- Risk: each library can evolve independently and create breaking styling or theming interactions.
- Impact: slower UI changes and more visual inconsistency.
- Migration plan: define the authoritative design system layer and gradually standardize.

## Test Coverage Gaps

**Operational scripts:**
- What's not tested: `scripts/ops/*.ts`, shell backup/restore scripts and some import maintenance commands.
- Risk: operational regressions may only surface during deployment or incident response.
- Priority: high for self-hosted environments.
- Difficulty to test: requires containerized infra and filesystem fixtures.

**Failure observability paths:**
- What's not tested: many `catch { return null; }` branches and degraded fallback decisions.
- Risk: silent failures may ship without detection.
- Priority: high.
- Difficulty to test: requires explicit error injection and logging assertions.

*Concerns audit: 2026-03-24*
*Update as risks are fixed, reduced or newly discovered*
