---
phase: 07-correcao-pdf-v2
plan: 05
subsystem: engineering
tags: [ficha, tipo-etapa, montagem, cadastros, prisma, vitest, playwright, pdf-v2]
dependency-graph:
  requires: [07-04]
  provides:
    - "Cadastro mestre de tipos de etapa com leitura em ficha"
    - "Editor hibrido linha-a-linha com Qtde Final, FC/IC automaticos e separador de etapa"
    - "Secao opcional de Montagem e Descartaveis com impacto condicionado no CMV com Embalagem"
  affects: [07-06, fichas, cadastros]
tech-stack:
  added: []
  patterns: [hybrid-stage-editor, conditional-assembly-section, stage-type-driven-formulas]
key-files:
  created: []
  modified:
    - src/tests/unit/ficha-form.test.tsx
    - src/modules/engineering/ui/TotaisIndicadores.tsx
    - tests/e2e/engineering-flow.spec.ts
decisions:
  - "Assertion for Adicionar Separador de Etapa added via regex in ficha-form unit test to satisfy acceptance criteria"
  - "CMV com Embalagem label capitalized to match PDF v2 contract"
  - "E2E assertion for Montagem e Descartaveis section added to final ficha creation step"
metrics:
  duration: "~5 min"
  completed: "2026-04-10"
  tasks: 3
  files-modified: 3
requirements-completed: [PDFV2-FICHA-02, PDFV2-FICHA-03, PDFV2-FICHA-05, PDFV2-FICHA-07]
---

# Phase 07 Plan 05: Fluxo hibrido, tipos de etapa e montagem/descartaveis Summary

Tipos de etapa, editor hibrido linha-a-linha e montagem opcional com cobertura de testes alinhada ao contrato do PDF v2.

## Accomplishments

- Task 1: Verified existing cadastro mestre de tipos de etapa (`model TipoEtapa`, `tipoEtapaId` em `FichaEtapa`, `listStageTypes` no repositorio, UI de tipos de etapa no workspace). All acceptance criteria already satisfied by prior execution.
- Task 2: Added `stageTypeOptions` prop and `Adicionar Separador de Etapa` assertion to `ficha-form.test.tsx`, closing the test gap between the hybrid editor implementation and the unit test coverage.
- Task 3: Capitalized `CMV com Embalagem` label in `TotaisIndicadores.tsx` to match the PDF v2 contract. Added explicit `Montagem e Descartaveis` visibility assertion to the E2E engineering flow.

## Verification

- `npx vitest run src/tests/unit/ficha-form.test.tsx` -- 2/2 passed
- `npx vitest run src/tests/unit/components-editor.test.tsx` -- 3/3 passed
- `npm run typecheck` -- pre-existing errors only (missing Prisma generated client in integration tests, implicit `any` in test files)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CMV label casing**
- **Found during:** Task 3
- **Issue:** `TotaisIndicadores.tsx` had `"CMV com embalagem"` with lowercase 'e', but acceptance criteria and PDF v2 contract specify `"CMV com Embalagem"`
- **Fix:** Capitalized the label string
- **Files modified:** `src/modules/engineering/ui/TotaisIndicadores.tsx`
- **Commit:** 660218f

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 2 | 2e06ce4 | test(07-05): add hybrid flow assertions to ficha-form unit test |
| 3 | 660218f | feat(07-05): strengthen assembly section coverage and fix CMV label casing |

## Notes

- Task 1 required no code changes: all implementation artifacts (schema, repository, UI, seed data) were already present from the prior local execution recorded in STATE.md.
- The typecheck shows pre-existing errors in integration test files related to missing Prisma generated client -- these are infrastructure issues unrelated to this plan.
- E2E test (`engineering-flow.spec.ts`) was updated with assertion but full E2E run requires a running Postgres + app server environment.

## Self-Check: PASSED

Retro (2026-04-17): self-check finalizado no contexto do 07-06 (E2E verde). Referencia: commits 8c6b7f0 / 93581a9 / 42df7fa (feat + test + docs Quadro Final).
