---
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 03
subsystem: [engineering, ui, pixel-perfect]
tags: [ui, pixel-perfect, ficha, identificacao, tdd, box-sx-grid]
requires:
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md (D-01..D-04)
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md (Wave 1 schema audit)
  - update/tela-ficha-tecnica-v2.html (linhas 60-61, 253-268)
  - src/modules/catalog/ui/item-form.tsx (padrao Phase 8 D-09)
provides:
  - ficha-form-identificacao-pixel-perfect
  - box-sx-grid-literal-110-1fr-150-175
  - box-sx-grid-literal-1fr-1fr-120-1fr
  - custo-atual-tokens-exatos (#E6F1FB, padding 7px 12px, fontSize 18, fontWeight 600)
  - field-cod-readonly (novo na Identificacao)
  - ficha-form-red-pixel-perfect-tests
affects:
  - src/modules/engineering/ui/ficha-form.tsx (bloco Identificacao, linhas 230-372)
  - src/tests/unit/ficha-form.test.tsx (+101 linhas RED guard)
tech-stack:
  added: []
  patterns:
    - box-sx-grid-template-columns-literal (replicado de Phase 8 D-09 item-form.tsx)
    - source-grep-via-fs-readFileSync (nova abordagem para este worktree; alternativa equivalente ao exported-const pattern do FichaFlatGrid)
    - tdd-red-green-separate-commits (D-04)
key-files:
  created:
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md
  modified:
    - src/modules/engineering/ui/ficha-form.tsx
    - src/tests/unit/ficha-form.test.tsx
decisions:
  - "Test location: centralizado em src/tests/unit/ (nao colocado em src/modules/engineering/ui/) para respeitar vitest include glob 'src/tests/**/*.test.tsx'; plan path colocado inviabilizaria descoberta automatica"
  - "Custo atual box azul: tokens literais inline (padding '7px 12px'; border '0.5px solid #D3D1C7'; background '#E6F1FB'; fontSize 18; fontWeight 600) — 1:1 HTML .custo-atual linha 266, nao MUI sx px/py que nao mapeia direto a 7/12px"
  - "Campo Cod. readonly derivado de initialValues?.id — HTML mostra codigo legivel (MFeijoada02.3) mas codebase Ficha usa UUID em id; seguir contrato do plano e usar id bruto como fonte de verdade (renderizacao de codigo legivel e responsabilidade futura de presenter, fora do escopo 09-03)"
  - "Finalizacao mantem MUI Grid — escopo explicito de 09-04 (D-08), nao 09-03"
metrics:
  duration_seconds: 180
  completed_date: 2026-04-19T22:10:00Z
  tasks_total: 2
  tasks_completed: 2
  files_touched: 2
  commits: 2
---

# Phase 09 Plan 03: Ficha Identificacao Pixel-Perfect Refactor Summary

Refactor pixel-perfect do bloco Identificacao do `ficha-form.tsx`: substituido MUI `<Grid container>` por `<Box sx={{ display: 'grid', gridTemplateColumns: ... }}>` literal 1:1 com HTML `update/tela-ficha-tecnica-v2.html` linhas 60-61, 253-268. Novo campo Cod. readonly; Custo atual da ficha com tokens pixel-perfect (#E6F1FB, padding 7px 12px, fontSize 18, fontWeight 600). TDD RED/GREEN separados em dois commits (D-04). 15/15 unit ficha-form PASS; 30/30 ficha-related suites PASS; typecheck clean.

## Tasks Completed

| Task | Name                                                       | Commit  | Files                                      |
| ---- | ---------------------------------------------------------- | ------- | ------------------------------------------ |
| 1    | RED: add pixel-perfect unit tests for ficha identificacao  | 10fd654 | `src/tests/unit/ficha-form.test.tsx`       |
| 2    | GREEN: refactor Identificacao to Box sx grid 1:1 HTML      | 14a6e68 | `src/modules/engineering/ui/ficha-form.tsx` |

## What Was Built

### 1. RED guard suite (Task 1 — commit 10fd654)

Novo `describe("FichaForm Identificacao pixel-perfect (Phase 09-03)")` com 13 asserts em `src/tests/unit/ficha-form.test.tsx`:

- 2 source-grep: `gridTemplateColumns: '110px 1fr 150px 175px'` (Row 1) + `'1fr 1fr 120px 1fr'` (Row 2)
- 1 render label: `Cod.` (novo campo)
- 6 render labels via `it.each`: `Produto`, `Data de criacao`, `Data e hora da ultima alteracao`, `Modalidade`, `Grupo operacional`, `Status`
- 1 render text: `Custo atual da ficha`
- 3 source-grep tokens: `#E6F1FB`, `padding: '7px 12px'`, `fontSize: 18` + `fontWeight: 600`

RED reproducao confirmada antes do GREEN: **5/15 FAIL** (2 grid literals, Cod. label, padding literal, fontSize/fontWeight pair). Os outros 10 passaram porque o codigo pre-refactor ja tinha `#E6F1FB`, `Custo atual da ficha` e os labels Produto/Data criacao/etc via MUI Grid.

### 2. Identificacao refactor (Task 2 — commit 14a6e68)

Substituicao de `<Grid container spacing={2}>` + `<Grid size={{xs,md}}>` duplo por `<Box>` duplo com `gridTemplateColumns` literal:

**Row 1 (.g-id1)** — `110px 1fr 150px 175px`:

| Col  | Campo                              | Width | Estado                                        |
| ---- | ---------------------------------- | ----- | --------------------------------------------- |
| 1    | Cod. (readonly)                    | 110px | **NOVO** — value = `initialValues?.id`        |
| 2    | Produto                            | 1fr   | required, defaultValue=displayName            |
| 3    | Data de criacao (readonly)         | 150px | value = createdAtLabel                        |
| 4    | Data e hora da ultima alteracao    | 175px | readonly + V{n} badge preservado (D-07 intacto) |

**Row 2 (.g-id2)** — `1fr 1fr 120px 1fr`:

| Col  | Campo                   | Width | Notas                                       |
| ---- | ----------------------- | ----- | ------------------------------------------- |
| 1    | Modalidade (select)     | 1fr   | value controlado (PDFV2-FICHA-07)           |
| 2    | Grupo operacional       | 1fr   | required, defaultValue=groupOperational      |
| 3    | Status (select)         | 120px | 4 MenuItem (rascunho/ativa/inativa/arquivada) |
| 4    | Custo atual da ficha    | 1fr   | Box azul — detalhado abaixo                 |

**Custo atual box azul (D-03 tokens pixel-perfect):**

```tsx
<Box sx={{
  display: "flex",
  alignItems: "baseline",
  gap: 0.75,
  padding: '7px 12px',            // HTML .custo-atual linha 266
  borderRadius: "6px",
  border: "0.5px solid #D3D1C7",  // explicito, nao token generico
  background: "#E6F1FB"           // var(--azul-l)
}}>
  <Typography sx={{ fontSize: 11, color: "#185FA5", fontWeight: 500 }}>R$</Typography>
  <Typography sx={{ fontSize: 18, color: "#185FA5", fontWeight: 600, lineHeight: 1 }}>
    {/* valor */}
  </Typography>
</Box>
```

Mudancas vs pre-refactor:
- `px: 1.5, py: 1` → `padding: '7px 12px'`
- `border: "0.5px solid", borderColor: "#B5D4F4"` → `border: "0.5px solid #D3D1C7"`
- `bgcolor: "#E6F1FB"` → `background: "#E6F1FB"` (literal, greppavel)
- valor `fontWeight: 700` → `fontWeight: 600` (HTML marca 600)

**Label "Custo atual da ficha":** migrado de `Typography color="text.secondary"` para `Typography sx={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A' }}` para match `.f label` HTML linha 49.

### 3. Preservacoes (zero regressao)

- `ComponentsEditor` props inalterados (itemOptions, stageTypeOptions, initialStages, summary, errors, currentFichaId, modalidadeId)
- Finalizacao (Modo de preparo + Observacoes) **intocado** — escopo explicito de 09-04 (D-08)
- Version badge V{n} posicionamento + tokens preservados (D-07 intact; cliente ja aceitou em pendencias-v3 #14)
- Hidden inputs (id, itemId, itemType, yieldMode, percentLoss, portions, yieldUnitCode) preservados
- `saveFichaAction` contrato inalterado (serializacao identica)
- Grid import preservado (Finalizacao ainda usa — 09-04 removera)

## Gates Passados

- `npx prisma generate` → PASS (necessario uma vez por worktree limpo para resolver `@/generated/prisma/client`)
- `npx vitest run src/tests/unit/ficha-form.test.tsx` → **15/15 PASS** (baseline 2/2 + 13 novos)
- `npx vitest run src/tests/unit/{ficha-form,ficha-form-schema,engineering-repository,ficha-tecnica-domain,ficha-detail-page,components-editor}.test.*` → **30/30 PASS** (zero regressao na suite ficha-related)
- `npx tsc --noEmit` → PASS (exit 0)

### E2E gate

E2E `engineering-flow` NAO executado no worktree — Docker daemon nao garantido e o orquestrador tipicamente roda gates agregados pos-merge. `npm run test:e2e` pipeline e owned by Wave 4 (09-05). Registro isolado neste plano: refactor e visual-only (Box sx grid swap), zero mudanca de serializacao/action contract.

### Grep-based acceptance criteria

| Criterio                                               | Esperado | Achado | Status  |
| ------------------------------------------------------ | -------- | ------ | ------- |
| `gridTemplateColumns: '110px 1fr 150px 175px'`          | 1        | 1      | PASS    |
| `gridTemplateColumns: '1fr 1fr 120px 1fr'`              | 1        | 1      | PASS    |
| `#E6F1FB`                                              | >=1      | 3      | PASS    |
| `padding: '7px 12px'`                                  | 1        | 1      | PASS    |
| `fontSize: 18`                                         | 1        | 1      | PASS    |
| `fontWeight: 600` (Identificacao)                      | >=1      | 2      | PASS    |
| `fontWeight: 700` (custo atual)                        | 0        | 0      | PASS    |
| `Grid container` em Identificacao (linhas 230-372)     | 0        | 0      | PASS    |
| `Grid container` em Finalizacao (09-04 scope)          | 1        | 1      | INTACT  |

## Deviations from Plan

### [Rule 3 - Blocking] Test file location: `src/tests/unit/` vs `src/modules/engineering/ui/`

- **Found during:** Task 1 planning
- **Issue:** O plano especifica `src/modules/engineering/ui/ficha-form.test.tsx` (colocado). Mas `vitest.config.ts:12` tem `include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"]` — um teste colocado nao seria descoberto pelo runner.
- **Fix:** Adicionar os 13 novos asserts no arquivo existente `src/tests/unit/ficha-form.test.tsx` (que ja existia com 2 tests legados). A convencao do projeto — confirmada por `09-01-SUMMARY.md:98-100` citando tests em `src/tests/unit/ficha-form.test.tsx` — e centralizada, nao colocada. Alinha com Phase 8 pattern.
- **Impact:** Zero — source-grep via `fs.readFileSync(path.resolve(process.cwd(), "src/modules/engineering/ui/ficha-form.tsx"))` funciona de qualquer location; asserts sao identicos em conteudo.
- **Commit:** 10fd654

### [Nota operacional] Prisma client generate

- **Found during:** First test run
- **Issue:** `npx vitest run` falhou com "Failed to resolve import '@/generated/prisma/client'" — artefato nao presente no worktree limpo (mesmo achado operacional do 09-01).
- **Fix:** Rodar `npx prisma generate` uma vez.
- **Nao e deviation** — e setup esperado do projeto (auto-aplicavel em qualquer worktree via `postinstall` hook em `package.json`).

### Fix attempts counter

Rule 1-3 auto-fix attempts neste plano: **1** (Rule 3 test location). Dentro do limite de 3.

## Auth Gates

Nenhum.

## Decisions Made

- **Test centralizado** (`src/tests/unit/ficha-form.test.tsx`) vs colocado (`src/modules/engineering/ui/ficha-form.test.tsx`): escolhido centralizado por compatibilidade com vitest include glob + consistencia com convencao do projeto (ver 09-01 SUMMARY).
- **Source-grep via `fs.readFileSync`** vs exported-const (FichaFlatGrid pattern): escolhido fs.readFileSync per plano explicito D-04; nao requer refactor de ficha-form.tsx para exportar `G_ID1_TEMPLATE`; asserts direto contra literais inline no source.
- **Campo Cod. usa `initialValues?.id`** (UUID): seguir contrato do plano (D-01 "Cod. readonly, 110px"); renderizacao de codigo legivel humano (ex.: "MFeijoada02.3") e responsabilidade de presenter futuro, fora do escopo 09-03. Em `/fichas/nova`, `initialValues.id` sera undefined → campo vazio (esperado).
- **Custo atual tokens literais** (`padding: '7px 12px'`, `border: '0.5px solid #D3D1C7'`) vs MUI theme-aware (`px: 1.5, py: 1`): escolhido literal per D-03 — HTML marca valores especificos que o MUI spacing scale (8px multiplos) nao reproduz exatamente; literal tambem garante grep-based acceptance.

## Next

Wave 3 destravada:

- **09-04** (`ficha-topbar-finalizacao-PLAN.md`): Topbar Duplicar/Exportar (D-05), badge "ativa" inline (D-06), version badge polish (D-07 — mantendo posicionamento aceito em pendencias-v3 #14), Finalizacao 2-col 50/50 com labels "(opcional)" (D-08), Zod preparationMode relax (D-10 ja entregue em 09-01). Depende deste 09-03 (ambos editam `ficha-form.tsx`).

Wave 2 paralelo:

- **09-02** (`item-form-retoque-PLAN.md`): executando em paralelo no worktree irmao (Wave 2 é 09-02 + 09-03).

## Self-Check: PASSED

Verificacao pos-commit:

- FOUND: `src/tests/unit/ficha-form.test.tsx` — contem 13 novos asserts Phase 09-03 (grep `Phase 09-03` OK)
- FOUND: `src/modules/engineering/ui/ficha-form.tsx` — contem `gridTemplateColumns: '110px 1fr 150px 175px'` (1), `gridTemplateColumns: '1fr 1fr 120px 1fr'` (1), `#E6F1FB` (3), `padding: '7px 12px'` (1), `fontSize: 18` (1), `fontWeight: 600` (2), `fontWeight: 700` (0)
- FOUND: commit 10fd654 (RED) em git log --oneline -5
- FOUND: commit 14a6e68 (GREEN) em git log --oneline -5
- FOUND: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md` (este arquivo)
