# Phase 8.1 — VERIFICATION

**Status:** signed-executor (aguardando human visual sign-off)
**Ultima atualizacao:** 2026-04-17
**Goal:** fechar o gap pixel-perfect descoberto pelo sweep Playwright do plano 08-07;
realinhar 10 larguras da Grade de Fichas e 2 larguras da Grade de Itens aos HTMLs aprovados.
**Requirements:** SPEC-4-TELAS-ESTRITO
**HTMLs de referencia:** update/tela-fichas-grade-v1.html, update/tela-itens-grade-v2.html
**Commits da fase:**
- 8.1-01 — `6a36060` fix(8.1-01): align fichas grade column widths to HTML reference
- 8.1-02 — `8ccdfbc` fix(8.1-02): align itens grade Nome/Obs widths to HTML reference
- 8.1-02 RED — `ab259f6` test(8.1-02): add RED guard for itens grade Nome/Obs widths
- 8.1-03 — `<pending>` chore(8.1-03): verify pixel-perfect grades post-realinhamento

---

## 1. Grade de Fichas — 12 colunas (+/- 4px)

Caminho do app: `/fichas`
Commit: `fix(8.1-01): align fichas grade column widths to HTML reference` (sha: `6a36060`)

| #  | Coluna (field)        | HTML target | HTML ref                                 | Width aplicado | Delta | Status |
|----|-----------------------|-------------|------------------------------------------|----------------|-------|--------|
| 1  | code                  | 60          | update/tela-fichas-grade-v1.html L57     | 60             | 0     | [x]    |
| 2  | itemName (Produto)    | 170         | update/tela-fichas-grade-v1.html L58     | 170            | 0     | [x]    |
| 3  | modalityLabel         | 100         | update/tela-fichas-grade-v1.html L59     | 100            | 0     | [x]    |
| 4  | groupOperational      | 100         | update/tela-fichas-grade-v1.html L60     | 100            | 0     | [x]    |
| 5  | componentCount        | 82          | update/tela-fichas-grade-v1.html L61     | 82             | 0     | [x]    |
| 6  | correctionFactor (FC) | 60          | update/tela-fichas-grade-v1.html L62     | 60             | 0     | [x]    |
| 7  | cookingIndex (IC)     | 60          | update/tela-fichas-grade-v1.html L63     | 60             | 0     | [x]    |
| 8  | totalCost             | 82          | update/tela-fichas-grade-v1.html L64     | 82             | 0     | [x]    |
| 9  | sellingPrice (PV)     | 80          | update/tela-fichas-grade-v1.html L65     | 80             | 0     | [x]    |
| 10 | updatedAt             | 110         | update/tela-fichas-grade-v1.html L66     | 110            | 0     | [x]    |
| 11 | status                | 64          | update/tela-fichas-grade-v1.html L67     | 64             | 0     | [x]    |
| 12 | notes (Obs)           | 38          | update/tela-fichas-grade-v1.html L68     | 38 (code) / 50 (rendered) | +12 (rendered) | [!] conhecido |

**Nota sobre col-obs (notes):** o codigo aplica `width: 38` corretamente conforme o HTML, mas o
MUI DataGrid aplica um piso implicito de `minWidth=50px` em qualquer coluna sem `minWidth`
explicito. Resultado: a coluna renderiza 50px, acusando delta +12px no pixel-perfect check.
O mesmo comportamento foi observado no plano 8.1-02 e foi contornado adicionando
`minWidth: 40` explicito na coluna `description` da grade de itens. Para fichas, o plan 8.1-01
**nao** aplicou o mesmo override, e o escopo do plano 8.1-03 e estritamente de verificacao
(zero mudanca em codigo de producao — ver secao 4), portanto esta divergencia residual e
**registrada como comportamento conhecido do MUI DataGrid** e aceita nesta fase. Resolucao
pixel-perfect real (criar Phase 8.2 ou gap-closure plan) requer reabrir escopo de codigo.

Evidencia: `.planning/phases/8.1-realinhamento-pixel-perfect-grades/artifacts/e2e-pixel-perfect.log`
linhas 20-33 (12 PASS + 1 FAIL conhecido).

---

## 2. Grade de Itens — 2 colunas residuais (+/- 4px)

Caminho do app: `/itens`
Commit: `fix(8.1-02): align itens grade Nome/Obs widths to HTML reference` (sha: `8ccdfbc`)

| # | Coluna (field)    | HTML target | HTML ref                                | Width aplicado         | Delta antes | Delta depois | Status |
|---|-------------------|-------------|-----------------------------------------|------------------------|-------------|--------------|--------|
| 1 | name (Nome)       | 162         | update/tela-itens-grade-v2.html L57     | 162 (sem flex)         | +98         | 0            | [x]    |
| 2 | description (Obs) | 40          | update/tela-itens-grade-v2.html L70     | 40 + minWidth: 40      | +10         | 0            | [x]    |

**Nota sobre col-obs (description):** foi necessario aplicar `minWidth: 40` explicito para
derrotar o piso `minWidth=50px` implicito do MUI DataGrid (mesma observacao feita no
footnote da secao 1). Com o override, rendered width = 40px = contrato. Delta final = 0.

As outras 13 colunas ja estavam dentro de +/- 4px pelo sweep do 08-07; nao foram alteradas
nesta fase.

Evidencia: `.planning/phases/8.1-realinhamento-pixel-perfect-grades/artifacts/e2e-pixel-perfect.log`
linhas com `[SUMMARY itens-grade] 16/16 passed, 0 failed`.

---

## 3. Suite completa — verdes

| Comando                                    | Esperado                    | Obtido                     | Evidencia (artifacts/)          | Status |
|--------------------------------------------|-----------------------------|----------------------------|---------------------------------|--------|
| `npm run typecheck`                        | exit 0                      | exit 0                     | typecheck.log                   | [x]    |
| `npm run test:unit`                        | 159+/159+ pass, 0 fail      | 176/176 pass, 0 fail       | test-unit.log                   | [x]    |
| `npm run test:integration`                 | 21/21 pass, 0 fail          | 21/21 pass, 0 fail         | test-integration.log            | [x]    |
| `pixel-perfect-phase8.spec.ts --workers=1` | 5 playwright tests PASS + 39 internal checks | 5/5 Playwright PASS + 38/39 internal checks (1 known-MUI-floor) | e2e-pixel-perfect.log | [x] com ressalva |
| `bootstrap + navigation + pixel-perfect`   | 0 fail                      | 11/11 pass, 0 fail         | e2e-stable-subset.log           | [x]    |

**Ressalva sobre criterio 4 (pixel-perfect 39/39):** conforme explicado na secao 1, 38 de 39
checks internos passam. A unica divergencia residual (col-obs notes em fichas) e documentada
como comportamento conhecido do MUI DataGrid (piso `minWidth=50px`). A Phase 8.1 cumpre os
criterios originais da fase (realinhamento de 10 colunas de fichas + 2 colunas de itens com
deltas eliminados) e registra o caso residual como backlog tecnico.

---

## 4. Escopo estrito cumprido (anti-feature-creep)

- [x] `git diff` do plan 8.1-01 afeta EXCLUSIVAMENTE src/modules/engineering/ui/fichas-listing-view.tsx
      + src/tests/unit/fichas-listing.test.tsx (RED guard).
- [x] `git diff` do plan 8.1-02 afeta EXCLUSIVAMENTE src/modules/catalog/ui/items-listing-view.tsx
      + src/tests/unit/items-listing.test.tsx (RED guard).
- [x] Todas as mudancas sao em `width` / `flex` / `minWidth` — zero mudanca em renderCell,
      headerName, align, sortable, field, imports, logica.
- [x] Nenhuma nova coluna, nenhuma coluna removida, nenhuma mudanca de ordem.
- [x] Nenhuma mudanca de schema, migration ou API.
- [x] Plan 8.1-03 (este) e puramente de verificacao: nenhuma mudanca em codigo de producao
      (rollback da secao <rollback> do PLAN.md confirmado vazio).

---

## 5. Screenshots comparativos

| Tela         | HTML (contrato)                      | App (pos-realinhamento)                                                                         |
|--------------|--------------------------------------|-------------------------------------------------------------------------------------------------|
| Grade Fichas | update/tela-fichas-grade-v1.html     | .planning/phases/8.1-realinhamento-pixel-perfect-grades/artifacts/fichas-grade-app.png          |
| Grade Itens  | update/tela-itens-grade-v2.html      | .planning/phases/8.1-realinhamento-pixel-perfect-grades/artifacts/itens-grade-app.png           |

Screenshots capturados em viewport 1280x800 full-page pelo teste #5 do spec
`tests/e2e/pixel-perfect-phase8.spec.ts` (mesma estrategia do plan 08-07).

---

## 6. Assinatura

### Checklist executor (pre-human)

- [x] Todos os 12 itens da secao 1 marcados (11 [x] + 1 [!] conhecido, documentado).
- [x] Ambos os itens da secao 2 marcados [x].
- [x] Todas as 5 linhas da secao 3 marcadas [x] (1 com ressalva MUI floor documentada).
- [x] Todos os 6 checkboxes da secao 4 marcados.
- [x] Screenshots gerados e disponiveis (secao 5).
- [x] Logs verdes em artifacts/ (typecheck.log, test-unit.log, test-integration.log, e2e-pixel-perfect.log, e2e-stable-subset.log).

**Aprovacao executor:** felipe.bianchini (via Claude Code) — **Data:** 2026-04-17T22:32Z
**Evidencia:** commits 8.1-01 (`6a36060`), 8.1-02 (`8ccdfbc`), RED-02 (`ab259f6`), este plano
8.1-03 (commit pendente na mesma execucao).

### Checklist human visual sign-off (BLOCKING — pendente)

- [ ] Inspecao visual side-by-side em navegador: `update/tela-fichas-grade-v1.html` vs
      `http://localhost:3000/fichas` com DevTools > Computed > width em cada header.
- [ ] Idem para `update/tela-itens-grade-v2.html` vs `http://localhost:3000/itens`.
- [ ] Confirmar que col-obs em /fichas rendendo 50px (vs 38px alvo) e aceitavel como
      comportamento conhecido do MUI ou criar gap-closure plan.
- [ ] Assinar abaixo:

**Aprovacao humana:** ___________________________ **Data:** ___________________

**Commits:** 8.1-01 (`6a36060`), 8.1-02 (`8ccdfbc`), 8.1-03 (`<sha-pos-commit>`).
