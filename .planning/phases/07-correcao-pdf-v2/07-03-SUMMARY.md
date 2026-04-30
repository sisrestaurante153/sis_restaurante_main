---
phase: 07-correcao-pdf-v2
plan: 03
subsystem: catalog-ui
tags: [grade-itens, data-grid, badges, filters, sorting, pdf-spec-alignment]
dependency_graph:
  requires: [07-02]
  provides: [grade-itens-15-columns, hex-badges, category-filter, sorting]
  affects: [items-listing-view, data-grid-pattern, StatusChip, catalog-prisma-mappers, catalog-repository, itens-page]
tech_stack:
  added: []
  patterns: [hex-color-badges, debounced-search, server-sorting, empty-state-overlays]
key_files:
  created:
    - src/tests/unit/items-listing.test.tsx
  modified:
    - src/modules/catalog/ui/items-listing-view.tsx
    - src/modules/catalog/server/catalog-prisma-mappers.ts
    - src/modules/catalog/server/catalog-repository.ts
    - src/components/ui/StatusChip.tsx
    - src/components/ui/data-grid-pattern.tsx
    - src/app/(app)/itens/page.tsx
    - src/tests/unit/items-page.test.tsx
    - src/tests/unit/app-data-grid-pattern.test.tsx
    - src/tests/unit/fichas-page.test.tsx
decisions:
  - Kept totalCost and fichaStatus in mapper return for other consumers but removed from ItemRow UI interface
  - Used client-side sort for price columns since server sort on derived/joined values is complex and page size is small
  - Removed produto_pronto, marmita and combo from type filter options per PDF spec
requirements-completed: [SPEC-GRADE-ITENS, PDFV2-ITEM-01]
metrics:
  duration: 655s
  completed: 2026-04-10T18:49:00Z
  tasks: 2/2
  files: 10
---

# Phase 07 Plan 03: Grade de Itens - 15 colunas, badges hex, filtros, sorting e layout conforme PDF

Grade de Itens reescrita com 15 colunas na ordem exata do PDF, badges hex-colored por tipo e status, filtro Categoria Operacional, 4 colunas sortaveis, valores zero como em-dash, Fornecedor +N, row height 42px, min-width 1280px e empty states.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Infraestrutura: mapper supplierCount, StatusChip hexColors, DataGrid 42px, page com filtro categoria | 925f654 | catalog-prisma-mappers.ts, StatusChip.tsx, data-grid-pattern.tsx, itens/page.tsx, catalog-repository.ts |
| 2 | Reescrever items-listing-view com 15 colunas, badges, filtros, sorting, layout e empty states | a19a001 | items-listing-view.tsx, items-listing.test.tsx, items-page.test.tsx, app-data-grid-pattern.test.tsx, fichas-page.test.tsx |

## Decisions Made

1. **Keep mapper fields for other consumers**: `totalCost` and `fichaStatus` remain in `mapItemListRow` return because they are used by other parts of the system (demo data, fichas, etc.), but the `ItemRow` UI interface in `items-listing-view.tsx` no longer includes them.

2. **Client-side sort for price columns**: Since `Preco Compra` and `Preco Uso` are derived/joined values from the purchases relation, full server-side sorting would require complex Prisma queries. With page size of 10 rows, client-side sorting is acceptable. Only `name` and `updatedAt` trigger server-side sort via URL params.

3. **Removed extra type options**: `produto_pronto`, `marmita`, and `combo` were removed from the type filter dropdown per PDF spec, keeping only the 7 types defined in the specification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated data-grid-pattern test for new row height**
- **Found during:** Task 2
- **Issue:** `app-data-grid-pattern.test.tsx` asserted `getRowHeight` returns 72 and `minHeight: "72px"` -- broke after changing to 42px
- **Fix:** Updated assertions to expect 42 and `"42px"`
- **Files modified:** src/tests/unit/app-data-grid-pattern.test.tsx
- **Commit:** a19a001

**2. [Rule 1 - Bug] Updated fichas-page test for new row height**
- **Found during:** Task 2
- **Issue:** `fichas-page.test.tsx` asserted `data-row-height` attribute as "72" -- broke after shared config change
- **Fix:** Updated assertion to expect "42"
- **Files modified:** src/tests/unit/fichas-page.test.tsx
- **Commit:** a19a001

## Verification Results

- `npx tsc --noEmit`: PASS (zero errors)
- `npx vitest run src/tests/unit/items-listing.test.tsx`: PASS (7/7 tests)
- `npx vitest run src/tests/unit/items-page.test.tsx`: PASS (1/1 test)
- `npx vitest run src/tests/unit/app-data-grid-pattern.test.tsx`: PASS (1/1 test)
- `npx vitest run src/tests/unit/fichas-page.test.tsx`: PASS (1/1 test)
- No references to `totalCost` or `fichaStatus` columns in items-listing-view.tsx: CONFIRMED

## Self-Check: PASSED

- All 10 files created/modified verified on disk
- Commits 925f654 and a19a001 verified in git log
- TypeScript compiles with zero errors
- All 10 unit tests pass across 4 test files
