# Phase 9 — Release Notes

**Tag:** v1.2-phase-9
**Date:** 2026-04-19
**Delivery:** git tag + commit SHA (NO ZIP per user scope change Phase 8-07 2026-04-17).

## Scope

Telas internas de Item e Ficha Tecnica alinhadas 1:1 com os HTMLs aprovados:

- `update/tela-item-v1.html` — Bloco Identificacao + Fornecedor Principal + Fornecedor 2 fixado + Observacoes.
- `update/tela-ficha-tecnica-v2.html` — Identificacao g-id1/g-id2 + Estrutura (preservada) + Montagem (preservada) + Finalizacao g-fin + Quadro Final (preservado).

Auditoria formal de fidelidade HTML ↔ Prisma ↔ Zod ↔ presenter registrada em `09-01-schema-api-audit-SUMMARY.md` (64 campos, 0 GAP, 0 migration).

## Plans Delivered

| Plan    | Wave | Nome                                                      | Commit SHA(s)                                                                                            |
| ------- | ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 09-01   | 1    | schema-api-audit (D-09..D-12)                             | `4449d74` (audit), `980eff6` (Zod D-10 refactor), `e4eba2c` (VERIFICATION §1/§2), `ba5d1ff` (summary)   |
| 09-02   | 2    | item-form-retoque (D-13..D-16)                            | `6ddb533` (RED D-13), `04baaf5` (GREEN D-13), `726ede9` (D-14+D-16 topbar/badge), `1d01be8` (D-15)      |
| 09-03   | 2    | ficha-identificacao-refactor (D-01..D-04, TDD RED/GREEN)  | `10fd654` (RED D-04), `14a6e68` (GREEN D-01..D-03)                                                       |
| 09-04   | 3    | ficha-topbar-finalizacao (D-05..D-08)                     | `674ae81` (D-05/06/07 topbar + version badge), `47de549` (D-08 Finalizacao 2-col)                        |
| 09-05   | 4    | pixel-perfect-tests-release (D-17..D-20)                  | `eb3722f` (spec extension), `b26789f` (VERIFICATION §3/§4/§5 consolidation), `<this>` (release notes)    |

Merge commits de worktrees (chore): `113600e` (Wave 1), `480a681` (Wave 2), `458224d` (Wave 3), `<TBD>` (Wave 4, criado pelo orquestrador).

## Decisions Implemented (D-01..D-20 from 09-CONTEXT.md)

- **D-01..D-04 (09-03):** Ficha Identificacao substituido MUI Grid por `<Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 175px' }}>` (Row 1) + `'1fr 1fr 120px 1fr'` (Row 2); Custo atual box azul com tokens literais `#E6F1FB`, `padding: '7px 12px'`, `fontSize: 18`, `fontWeight: 600`, `border: '0.5px solid #D3D1C7'`; novo campo Cod. readonly; TDD RED/GREEN separados em dois commits.
- **D-05..D-08 (09-04):** Ficha topbar com btn-icon Duplicar (SVG `M3 11V3h8`, handler `duplicateFichaAction` preservado) + Exportar (SVG `M3 10v3h10v-3`, `onClick` TODO PDFV2-FUT-01) + Inativar (tokens consistentes); badge ativa verde via StatusChip auto-resolve; version badge V{n} tokens polidos (posicionamento pendencias-v3 #14 preservado); Finalizacao 2-col 50/50 opcional com placeholders HTML byte-a-byte.
- **D-09..D-12 (09-01):** Auditoria formal HTML ↔ Prisma ↔ Zod ↔ presenter (64 campos); Zod `preparationMode: z.string().default('')` (sem migration Prisma); validacao de `ItemCompra.priceUpdatedAt` render; declaracao formal "Phase 9 = zero Prisma migration".
- **D-13..D-16 (09-02):** Item FormSection sem `description` prop; topbar `/itens/[itemId]` com hex tokens exatos `#185FA5`/`#F09595`/`#A32D2D`/`#0C447C` em btn-primary/btn-danger + sticky; PurchasesEditor Fornecedor 2+ placeholders `dd/mm/aaaa`, `0,0000`, `R$ 0,00`; StatusChip auto-resolve verde `#EAF3DE`/`#1B6B2C` (ativo) e cinza `#F4F4F2`/`#888780` (inativo — nao vermelho).
- **D-17..D-20 (09-05):** `tests/e2e/pixel-perfect-phase8.spec.ts` estendido com 5 novos tests em 2 describes Phase 9; estrategia `getComputedStyle` ancestor-walk compativel com MUI sx className-based CSS; Wave topology revisada (iter-2: 09-04 Wave 3 sequencial apos 09-03); E2E gates engineering-flow + importacao + pixel-perfect subset estavel ownership transferida ao orquestrador pos-merge.

## Test Evidence

- **Unit (ficha-related):** 28/28 PASS (`ficha-form` 15 + `ficha-detail-page` 1 + `ficha-form-schema` 4 + `engineering-repository` 3 + `ficha-tecnica-domain` 4 + `page-header` 1) — verificado em 09-04.
- **Unit (item-related):** 22/22 PASS (`item-form` + `item-detail-page` + `page-header` + `purchases-editor` + `catalog/ItemForm`) — verificado em 09-02.
- **Integration (Zod + repository):** 14/14 PASS em suite ficha-related pos-D-10 — verificado em 09-01.
- **Typecheck:** `npm run typecheck` exit 0 em cada plano (09-01..09-05).
- **E2E subset estavel (bootstrap + navigation + pixel-perfect-phase8 workers=1):** Baseline Phase 8 = 11/11 PASS em 33.8s; spec estendido em 09-05 adiciona 4 tests novos Phase 9 — gate final owned by orchestrator pos-merge (padrao Phase 8-07 multi-worktree).
- **pixel-perfect-phase8 com 4 tests novos Phase 9:** P9-ITEM-01/02, P9-FICHA-01/02/03, ficha topbar btn-icon presence — logging cosmetic divergences via `console.log` sem bloquear; falha so em erro de extracao (per D-17).
- **Pre-existing failures (out of scope — documentados em `deferred-items.md`):** 24 FAIL em `items-listing` + `fichas-listing` + `items-page` + `fichas-page` — pixel-perfect grade widths Phase 8.1/8-07 residuais, nao relacionados a Phase 9.

## Deferred to Roadmap v2

- **PDFV2-FUT-01:** Exportar ficha PDF real (`FichaHeaderActions.tsx` btn-icon Exportar hoje = `onClick` com TODO comentario; estrutura visual completa, handler real deferido).
- **PDFV2-FUT-02:** Thresholds configuraveis do badge CMV — fora de escopo Phase 9; roadmap v2.
- **Phase 10 candidatos:**
  - Handler real de Duplicar ficha em UI nova (se nao ja existente via `duplicateFichaAction` — server action preservada em 09-04, UI preservada).
  - Design-system refactor (`FormSection` → `<Box className="card">`) — escopo alto, Phase 10+.
  - Substituir MUI TextField por `<input>` nativo — fidelidade maxima mas blast radius massivo; roadmap v2.
  - Screenshot diff automatizado (Playwright visual regression) contra HTMLs — alto custo setup + baselines.

## Delivery

Nenhum ZIP. Cliente puxa via:

```bash
git fetch
git checkout v1.2-phase-9
```

A tag `v1.2-phase-9` NAO e criada dentro da worktree paralela (worktree-agent-a4da32d1) — worktree branches sao ephemeral e a tag apontaria para um commit que nao existira em main. A tag e criada pelo **orquestrador** pos-merge de todas as worktrees da Phase 9 para main, apontando para o commit real de main:

```bash
# Orquestrador (pos-merge main):
git tag -a v1.2-phase-9 -m "Phase 9: Telas detalhe Item + Ficha pixel-perfect com HTML" <parent-commit-sha-em-main>
git tag -l "v1.2-phase-9"
git show v1.2-phase-9 --stat
```

**Parent commit SHA placeholder:** `<TBD>` — a ser preenchido pelo orquestrador apos merge do worktree-agent-a4da32d1. Candidato: commit que cobre a merge da Wave 4 em main.

## Signature

- **Executor:** gsd-execute-phase worktree agent-a4da32d1 (Wave 4 solo, plan 09-05).
- **Date:** 2026-04-19.
- **Evidence:**
  - commit `eb3722f` — `test(09-05): extend pixel-perfect-phase8 with item + ficha detail describes (D-17)`
  - commit `b26789f` — `docs(09-05): consolidate 09-VERIFICATION.md §3-§5 (UI pixel-perfect + E2E + release)`
  - commit `<this>` — `docs(09-05): release notes + commit SHAs for Phase 9 (no ZIP)`
  - Plans 09-01..09-04 SHAs na tabela "Plans Delivered" acima.
- **User scope change ancora:** Phase 8-07 2026-04-17 (ZIP dropped, git tag + commit SHA adotado como padrao).
