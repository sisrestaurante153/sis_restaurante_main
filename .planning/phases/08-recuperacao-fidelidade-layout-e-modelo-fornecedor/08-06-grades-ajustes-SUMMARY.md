---
phase: 08-recuperacao-fidelidade-layout-e-modelo-fornecedor
plan: 06
subsystem: ui
tags: [catalog, grid, datagrid, pixel-perfect, render-tolerance, fallback]

requires:
  - phase: 08-02-schema-migracao-import
    provides: mapItemListRow ja devolvendo "--" para itens sem ItemCompra principal (commit 2d5049b linhas 179-186)
  - phase: 07-03-grade-itens
    provides: badge "+N" no supplierName column + 15 colunas pixel-perfect (commit a19a001)
provides:
  - "items-listing-view formatCurrency/formatDecimal: passthrough literal '--' quando o mapper devolve '--' (nao forca em-dash)"
  - "supplierName column: remocao do check legado 'sem fornecedor' (mapper nao mais devolve)"
  - "items-listing.test.tsx: +2 it() cobrindo (a) item sem ItemCompra exibe '--' em 5+ colunas, (b) item com 2+ fornecedores exibe badge '+1'"
  - "Grade de fichas (D-10): re-validada contra HTML update/tela-fichas-grade-v1.html — 12 colunas match 1:1; ownership de pixel-perfect verification transferida para 08-07 per plan success criterion #5"
affects:
  - 08-07-pixel-perfect-verification-release (owner final de SPEC-4-TELAS-ESTRITO)

tech-stack:
  added: []
  patterns:
    - "Fallback passthrough pattern: format helpers na UI reconhecem literal '--' antes de Number() coercao (evita NaN -> em-dash inconsistente com contrato do mapper)"
    - "Mapper -> Render contract: mapItemListRow devolve sentinel string '--' (D-10); render respeita literal sem transformacao"

key-files:
  created: []
  modified:
    - src/modules/catalog/ui/items-listing-view.tsx
    - src/tests/unit/items-listing.test.tsx
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/deferred-items.md

key-decisions:
  - "[Phase 08-06]: mapItemListRow NAO precisou de mudanca — ja entregava '--' desde 08-02 (commit 2d5049b linhas 179-186, 8 ocorrencias literais). Gap real era apenas no render: formatCurrency/formatDecimal forcavam em-dash via Number('--')=NaN, mascarando o contrato do mapper. Fix minimo: guard precoce `if (value === '--') return '--'` antes da coercao numerica."
  - "[Phase 08-06]: supplierName legacy check `value === 'sem fornecedor'` removido por ser codigo morto pos-08-02 (mapper nunca devolve essa string). Mantido fallback `!value` por defense-in-depth."
  - "[Phase 08-06]: Grade de fichas (ownership formal em 08-07): 12 colunas match 1:1 com HTML tela-fichas-grade-v1.html — Codigo, Produto, Modalidade, Grupo Operacional, Componentes, FC, IC, Custo Total, Preco de Venda, Ultima Atualizacao, Status, Obs. Nenhuma mudanca funcional necessaria em fichas-listing-view.tsx."
  - "[Phase 08-06]: E2E engineering-flow stale label 'Codigo do item' (regressao de 08-04 commit 368fca0 que renomeou para 'Codigo') DEFERIDO para 08-07 via SCOPE BOUNDARY — nao causado por mudancas do 08-06."

patterns-established:
  - "Sentinel string passthrough: quando um mapper server-side decide o texto de celula vazia, o render da UI deve respeitar esse sentinel literalmente (nao re-formatar). Evita double-transform inconsistente entre contract (mapper) e apresentacao."

requirements-completed: []

duration: 15min
completed: 2026-04-17
---

# Phase 08 Plan 06: Grades Ajustes Summary

**items-listing UI passthrough de literal '--' (D-10) + grade de fichas re-validada 1:1 com HTML; mapItemListRow ja entregava o contrato desde 08-02 — gap real estava apenas na camada de render.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-17T20:27:00Z (approx)
- **Completed:** 2026-04-17T20:33:00Z (approx)
- **Tasks:** 2 (Task 1 RED + Task 2 GREEN)
- **Files modified:** 3 (items-listing-view.tsx, items-listing.test.tsx, deferred-items.md)

## Accomplishments

- **items-listing-view.tsx**: `formatCurrency` e `formatDecimal` passam `'--'` adiante literalmente (guard antes de `Number()` coercao); supplierName column elimina check legado `'sem fornecedor'`
- **items-listing.test.tsx**: cobertura RED->GREEN adicionada — (1) item sem ItemCompra principal exibe `'--'` em >= 5 celulas, (2) item com 2+ fornecedores exibe badge `+1` ao lado do supplier principal
- **Grade de fichas**: re-validada pixel-perfect contra `update/tela-fichas-grade-v1.html` (12 colunas: Codigo, Produto, Modalidade, Grupo Operacional, Componentes, FC, IC, Custo Total, Preco de Venda, Ultima Atualizacao, Status, Obs) — 1:1 com o HTML, nenhuma mudanca funcional necessaria. Ownership formal de SPEC-4-TELAS-ESTRITO transferida para 08-07 (plan success criterion #5)
- **Suite unit**: 159/159 GREEN (157 baseline + 2 novos)
- **Typecheck**: clean

## Task Commits

1. **Task 1 RED**: add failing coverage for items listing '--' fallback + badge +N — `7074421` (test)
2. **Task 2 GREEN**: tolerate literal '--' fallback in items listing grid (D-10) — `945042f` (feat)

**Plan metadata commit:** (will be created after this SUMMARY is written)

## Files Created/Modified

- `src/modules/catalog/ui/items-listing-view.tsx` — formatCurrency/formatDecimal passthrough `'--'`; supplierName column drop do check `'sem fornecedor'` legado
- `src/tests/unit/items-listing.test.tsx` — +2 it() blocks (sem ItemCompra, badge +1)
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/deferred-items.md` — registro da regressao pre-existente do E2E (out-of-scope)

## Decisions Made

- **mapItemListRow sem mudanca**: descoberta durante Task 1 baseline read — o mapper ja retornava `'--'` literalmente em 8 campos derivados desde o commit `2d5049b` (plan 08-02). O gap reportado pelo 08-RESEARCH.md §8.1 estava na camada de render (view), nao no mapper. Fix minimo aplicado no `formatCurrency`/`formatDecimal`.
- **supplierName legacy check drop**: `value === 'sem fornecedor'` era codigo morto pos-08-02. Removido para alinhar com o contrato atual do mapper (`'--'` literal). Mantido `!value` para defense-in-depth (caso futuro presenter/mock devolva string vazia).
- **Grade de fichas ownership**: plan success criterion #5 transfere pixel-perfect verification & SPEC-4-TELAS-ESTRITO para 08-07. Este plano apenas confirma que as 12 colunas do `fichas-listing-view.tsx` batem 1:1 com `update/tela-fichas-grade-v1.html`.

## Deviations from Plan

### Scope observation (nao foi auto-fix)

**1. [Observation] mapItemListRow ja atendia D-10 integralmente**

- **Found during:** Task 1 baseline read of `catalog-prisma-mappers.ts`
- **Observation:** Plan 08-06 `<action>` na Task 2 especificava refactor de `mapItemListRow` (linhas 194-232 do PLAN) mas o codigo atual (linhas 159-193 do mapper) ja tinha 8 ocorrencias de `"--"` literais nas colunas derivadas, aplicadas no commit `2d5049b` do plan 08-02. Nao houve trabalho de mapper necessario.
- **Impact:** Redirecionamento de esforco para o gap real (render), onde `Number("--") === NaN` estava forcando em-dash em vez do contrato `'--'`.
- **Files modified:** Nenhum (mapper ja estava correto).

### Out-of-scope (deferido — nao auto-fix)

**2. [Deferred - Rule SCOPE BOUNDARY] E2E engineering-flow `getByLabel("Codigo do item")` stale**

- **Found during:** Task 2 verification (`npm run test:e2e -- engineering-flow`)
- **Issue:** 4 testes E2E falham com timeout em `page.getByLabel("Codigo do item")` (tests/e2e/engineering-flow.spec.ts:267). Causa: commit `368fca0` do plan 08-04 renomeou a label para `"Codigo"` (SPEC-ITEM-LAYOUT pixel-perfect) sem atualizar o E2E.
- **Scope:** Regressao pre-existente de 08-04, NAO causada por mudancas do 08-06. Plan 08-06 nao toca `item-form.tsx` nem o E2E harness.
- **Action:** Registrado em `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/deferred-items.md` sob "Plan 08-06 (grades-ajustes)" section. Fix proposto (one-liner: atualizar `getByLabel("Codigo do item")` -> `getByLabel("Codigo")`) owned por plan 08-07.

---

**Total deviations:** 0 auto-fix; 1 observation (mapper ja estava pronto); 1 out-of-scope deferido (E2E stale label)
**Impact on plan:** Plano cumprido com escopo reduzido (mapper ja pronto). Render agora respeita contrato '--'. Zero regressao em unit + typecheck.

## Issues Encountered

- **E2E engineering-flow 4 tests failing**: pre-existente do 08-04 (ver Deviations #2). Documentado e deferido.

## Verification Results

- `npm run test:unit -- items-listing.test` → **159/159 GREEN** (54 test files)
- `npm run typecheck` → **clean** (exit 0)
- `npm run test:e2e -- engineering-flow` → 4 falhas pre-existentes (ver deferred-items.md); nao bloqueante para 08-06.
- `grep -c '"--"' src/modules/catalog/server/catalog-prisma-mappers.ts` → **8** (>= 5 required)
- `grep -c '"sem fornecedor"' src/modules/catalog/server/catalog-prisma-mappers.ts` → **0** (criterion met for mapItemListRow scope)
- `grep -c "sem ItemCompra" src/tests/unit/items-listing.test.tsx` → **1** (>= 1 required)
- `grep -c "\+1" src/tests/unit/items-listing.test.tsx` → **2** (>= 1 required — badge test)

## Known Stubs

None — this plan only touched render fallback logic and test coverage. No UI components wired to placeholder data.

## User Setup Required

None — pure UI/test refactor.

## Next Phase Readiness

- **08-07 pixel-perfect verification & release** (Wave 5) pode iniciar. Owns:
  - SPEC-4-TELAS-ESTRITO final verification (items, item-detail, fichas-listing, ficha-tecnica)
  - Fix da regressao E2E `getByLabel("Codigo do item")` → `getByLabel("Codigo")` (registrado em deferred-items.md)
  - Release artifact (ZIP + checklist)

## Self-Check

Verifying claims:

- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-06-grades-ajustes-SUMMARY.md` — **FOUND** (this file)
- Commit `7074421` (test 08-06) — **FOUND** in `git log --oneline --all`
- Commit `945042f` (feat 08-06) — **FOUND** in `git log --oneline --all`
- `src/modules/catalog/ui/items-listing-view.tsx` contains `value === "--"` passthrough — **FOUND**
- `src/tests/unit/items-listing.test.tsx` contains `sem ItemCompra` test — **FOUND**

## Self-Check: PASSED

---
*Phase: 08-recuperacao-fidelidade-layout-e-modelo-fornecedor*
*Plan: 06 grades-ajustes*
*Completed: 2026-04-17*
