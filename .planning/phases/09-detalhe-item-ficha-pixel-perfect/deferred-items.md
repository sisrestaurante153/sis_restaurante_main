# Phase 9 — Deferred items (out of scope)

## 2026-04-19 — Plan 09-01 (executor)

### Pre-existing unit-test failures (NOT caused by 09-01 changes)

Reproducido com `git stash` aplicado antes das alteracoes desta plan — falhas presentes em `HEAD~1` (commit b62948d baseline):

- `src/tests/unit/engineering/fichas-listing.test.tsx` — 14/14 testes FAIL. Suite SPEC-4-TELAS-ESTRITO verifica larguras pixel-perfect da grade de fichas. Regressao pre-existente da Phase 8-07 (tests/e2e/pixel-perfect-phase8.spec.ts ja reportou 10/12 widths divergentes do contrato em 12-70px).
- `src/tests/unit/items-listing.test.tsx` — 8 FAIL relacionados a headers/ordem de colunas + widths (`name` 162px, `description` 40px, flex). Escopo 8.1/8-07.
- `src/tests/unit/items-page.test.tsx` — 1 FAIL (listing contract).
- `src/tests/unit/fichas-page.test.tsx` — 1 FAIL (listing contract).

**Owner:** fora do escopo 09-01 (auditoria schema/API). Plans 09-02..09-05 tratam de telas de detalhe, nao grades. Se fix necessario, criar `09-06-grades-residuais` ou quick task.

**Impacto na 09-01:** nenhum. Testes focados em schema/zod (ficha-form-schema.test.ts, ficha-form.test.tsx, engineering-repository.test.ts, ficha-tecnica-domain.test.ts, ficha-detail-page.test.tsx) passam 14/14 com a relaxacao de `preparationMode` (D-10).
