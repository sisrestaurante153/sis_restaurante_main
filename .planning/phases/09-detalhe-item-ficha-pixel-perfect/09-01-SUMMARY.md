---
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 01
subsystem: [engineering, catalog, schema-audit]
tags: [schema-audit, zod, prisma, ficha, item, zero-migration]
requires:
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md (D-09..D-12)
  - update/tela-item-v1.html
  - update/tela-ficha-tecnica-v2.html
  - prisma/schema.prisma
  - src/modules/engineering/server/ficha-form-schema.ts
  - src/modules/catalog/server/item-form-schema.ts
  - src/modules/engineering/server/engineering-repository.ts
  - src/modules/catalog/server/catalog-prisma-mappers.ts
provides:
  - audit-table-item-html-prisma-zod-presenter
  - audit-table-ficha-html-prisma-zod-presenter
  - zod-preparationMode-optional-default
  - 09-VERIFICATION.md §1 §2 populados
  - zero-migration-declaration (Phase 9 formal)
  - unlocks waves 2/3/4 (09-02..09-05) com contrato backend estavel
affects:
  - src/modules/engineering/server/ficha-form-schema.ts
tech-stack:
  added: []
  patterns:
    - audit-table-html-to-schema-by-field (reusavel cross-phase)
    - zod-relax-without-migration (preserve Prisma NOT NULL/default '' no app)
key-files:
  created:
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/deferred-items.md
  modified:
    - src/modules/engineering/server/ficha-form-schema.ts
decisions:
  - "Phase 9 = zero Prisma migration (auditoria 64 campos, 0 GAP)"
  - "Zod preparationMode relaxado para z.string().default('') — Prisma FichaTecnica.modoPreparo permanece String? nullable; blast radius limitado a UI opcional"
metrics:
  duration_seconds: 312
  completed_date: 2026-04-19T22:01:37Z
  tasks_total: 3
  tasks_completed: 3
  files_touched: 4
  commits: 3
---

# Phase 09 Plan 01: Schema/API Audit Summary

Auditoria formal de fidelidade HTML ↔ Prisma ↔ Zod ↔ presenter entregue sem migration: 64 campos verificados nos dois HTMLs aprovados, 0 GAP de schema, 1 DRIFT de validacao Zod (preparationMode) mitigado no proprio Zod (D-10), e declaracao formal registrada em `09-VERIFICATION.md` §Schema. Waves 2/3/4 (09-02..09-05) destravadas com contrato backend estavel.

## Tasks Completed

| Task | Name                                                                 | Commit   | Files                                                                                                                                                                   |
|------|----------------------------------------------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1    | Auditoria HTML ↔ Prisma ↔ Zod ↔ Presenter (ambas telas)              | 4449d74  | `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md`                                                                                 |
| 2    | Relaxar Zod preparationMode para optional com default '' (D-10)      | 980eff6  | `src/modules/engineering/server/ficha-form-schema.ts`, `.planning/phases/09-detalhe-item-ficha-pixel-perfect/deferred-items.md`                                          |
| 3    | 09-VERIFICATION.md §Schema + declaracao zero migration (D-12)        | e4eba2c  | `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md`                                                                                                |

## What Was Built

### 1. Tabela de auditoria pixel-precision

Arquivo entregue: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md`

- **Item (24 campos)** — cobertura 5 (Identificacao) + 9 (Fornecedor Principal) + 9 (Fornecedor 2 fixado) + 1 (Observacoes). Status por linha: 18 COBERTO + 4 DERIVADO (fator de conversao + preco de uso × 2 cards) + 0 GAP + 0 DRIFT.
- **Ficha (40 campos)** — cobertura 3 (Topbar) + 4 (g-id1) + 4 (g-id2) + 12 (Estrutura) + 5 (Montagem) + 2 (Finalizacao) + 10 (Quadro Final). Status: 24 COBERTO + 11 DERIVADO + 0 GAP + 1 DRIFT (preparationMode, mitigado Task 2) + 1 UI-only toggle.
- Cada linha cita: linha HTML, modelo Prisma.campo, schema Zod.campo, mapper presenter, status + nota.

### 2. Zod relax (D-10)

`src/modules/engineering/server/ficha-form-schema.ts:78`:

```diff
- preparationMode: nonEmptyString,
+ // D-10 (Phase 09-01): HTML marca "(opcional)" na linha 429. Relaxado para
+ // `z.string().default("")` — coluna Prisma FichaTecnica.modoPreparo permanece
+ // nullable (String?) no schema; blast radius limitado a UI opcional; zero migration.
+ preparationMode: z.string().default(""),
```

- Prisma `FichaTecnica.modoPreparo` NAO alterado — permanece `String?` (nullable no DB, prisma/schema.prisma:251).
- Presenter `mapFichaDetail.preparationMode` ja tem fallback `record.modoPreparo ?? ""` (engineering-repository.ts:799).
- E2E/unit fixtures existentes todas usam strings nao-vazias → zero regressao.

### 3. 09-VERIFICATION.md com secao §Schema

Arquivo entregue: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md`

- `## §1 Schema Audit` — declaracao formal "Phase 9 = zero Prisma migration" + sintese dos 64 campos.
- `## §2 Zod Contracts` — diff D-10 + gates (typecheck + 14/14 testes ficha-relacionados).
- `## §3..§5` — stubs com marcadores `Pending waves 2/3/4` para 09-02/03/04/05 preencherem.

## Gates Passados

- `npm run db:generate` → PASS (necessario para resolver `@/generated/prisma/client` depois do checkout limpo).
- `npm run typecheck` → PASS (exit 0).
- `npx vitest run src/tests/unit/ficha-form-schema.test.ts` → 4/4 PASS.
- `npx vitest run src/tests/unit/ficha-form.test.tsx src/tests/unit/engineering-repository.test.ts src/tests/unit/ficha-tecnica-domain.test.ts src/tests/unit/ficha-detail-page.test.tsx` → 10/10 PASS.
- Total 14/14 testes ficha-relacionados PASS pos-D-10.

### Pre-existing failures (out of scope)

- `src/tests/unit/engineering/fichas-listing.test.tsx` — 14/14 FAIL (grade widths Phase 8.1/8-07 residual).
- `src/tests/unit/items-listing.test.tsx` — 8 FAIL (widths + headers residuais).
- `src/tests/unit/items-page.test.tsx` — 1 FAIL.
- `src/tests/unit/fichas-page.test.tsx` — 1 FAIL.

Reproduzidos com `git stash` + re-run no baseline `b62948d` → mesma saida (FAIL). Documentados em `.planning/phases/09-detalhe-item-ficha-pixel-perfect/deferred-items.md`. Owners: nao 09-01 (escopo = schema/API). Plans 09-02..09-05 tratam de telas de detalhe, nao grades.

## Deviations from Plan

### None (plan executed exactly as written)

Unica nota operacional: foi necessario rodar `npm run db:generate` uma vez antes do primeiro `npm run typecheck` para resolver os imports de `@/generated/prisma/client` (artefato nao gerado no worktree limpo). Nao constitui deviation — e setup esperado do projeto.

## Auth Gates

Nenhuma durante execucao.

## Decisions Made

- **Phase 9 = zero Prisma migration** (D-12): auditoria encontrou 0 GAP; mitigacao do unico DRIFT (preparationMode) cabe no Zod sem tocar no DB.
- **Zod relax > migration**: preservar `FichaTecnica.modoPreparo` nullable com default `''` no lado app mantem blast radius minimo e evita risco de migration num sistema self-hosted.
- **Mitigacao de 1 DRIFT real encontrado** (preparationMode): contrato HTML linha 429 marca "(opcional)" explicitamente; Zod estava com `nonEmptyString`. Fix Task 2 bate 1:1.
- **Acompanhar 15 DERIVADOS** (fator de conversao, preco de uso, CMV, margem, ver-badge Vn): sao calculos esperados no presenter/cliente, nao GAPs.

## Next

Waves 2/3/4 destravadas:

- **Wave 2 (paralelo):**
  - `09-02-item-form-retoque-PLAN.md` — D-13/D-14/D-15/D-16 item-form + page.tsx + placeholders.
  - `09-03-ficha-identificacao-refactor-PLAN.md` — D-01/D-02/D-03/D-04 TDD RED/GREEN Identificacao ficha-form.
- **Wave 3 (sequencial apos 09-03):** `09-04-ficha-topbar-finalizacao-PLAN.md` — D-05..D-08 topbar Duplicar/Exportar + Finalizacao 2-col (podera consumir `preparationMode` opcional sem erro).
- **Wave 4 (solo):** `09-05-pixel-perfect-tests-release-PLAN.md` — D-17 extensao spec E2E + VERIFICATION.md §3/§4/§5 final.

## Self-Check: PASSED

Verificacao pos-commit (commits + arquivos):

- FOUND: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-schema-api-audit-SUMMARY.md`
- FOUND: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md`
- FOUND: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/deferred-items.md`
- FOUND: `src/modules/engineering/server/ficha-form-schema.ts` (preparationMode: z.string().default(""))
- FOUND: commit 4449d74 (docs 09-01 audit)
- FOUND: commit 980eff6 (refactor 09-01 Zod)
- FOUND: commit e4eba2c (docs 09-01 VERIFICATION.md)
