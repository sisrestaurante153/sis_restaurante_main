---
phase: 08
plan: 07
plan_id: 08-07
description: Pixel-perfect checklists das 4 telas + regressao das 18 entregas de pendencias-v3 + VERIFICATION.md consolidado + script pack-release.sh + release notes + ZIP final (D-15, D-16, D-18, SPEC-4-TELAS-ESTRITO)
type: execute
wave: 5
depends_on:
  - 08-01
  - 08-02
  - 08-03
  - 08-04
  - 08-05
  - 08-06
files_modified:
  - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md
  - scripts/ops/pack-release.sh
  - docs/qa/2026-04-17-recuperacao-cliente.md
  - .planning/REQUIREMENTS.md
autonomous: false
requirements:
  - SPEC-4-TELAS-ESTRITO
tags:
  - verification
  - release
  - checklist
  - pixel-perfect
must_haves:
  truths:
    - "VERIFICATION.md contem 4 checklists pixel-perfect (um por HTML: tela-item-v1, tela-itens-grade-v2, tela-ficha-tecnica-v2, tela-fichas-grade-v1) com larguras/cores hex/paddings/font-weights por regra CSS."
    - "VERIFICATION.md contem checklist explicito de regressao das 18 entregas de pendencias-v3 (cada item ☐/✓/✗ + commit de re-verificacao)."
    - "scripts/ops/pack-release.sh existe e gera output/release-v1.2-phase8-YYYYMMDD.zip com .next, public, prisma, src, scripts, docs, package.json, package-lock.json, tsconfig.json, next.config.ts, docker-compose.yml — excluindo node_modules, .git, .next/cache, *.log, *.tsbuildinfo."
    - "docs/qa/2026-04-17-recuperacao-cliente.md contem: instrucoes de rodar (docker compose up -d db → migrate → seed → start), changelog por area, 4 screenshots comparativos, checklist de validacao, confirmacao testes verdes."
    - "REQUIREMENTS.md atualizado com Phase 8 requirements marcados como Complete (SPEC-ITEM-FORNECEDOR, SPEC-ITEM-LAYOUT, SPEC-FICHA-FIDELIDADE, SPEC-4-TELAS-ESTRITO, PDFV2-CRIT-03..07, PDFV2-FICHA-07, PDFV2-ITEM-05)."
    - "ZIP final empacotado e disponivel em output/ para envio ao cliente."
  artifacts:
    - path: ".planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md"
      provides: "Checklist consolidado pixel-perfect + regressao + assinatura final"
      min_lines: 200
    - path: "scripts/ops/pack-release.sh"
      provides: "Script bash que gera ZIP de release"
      min_lines: 15
    - path: "docs/qa/2026-04-17-recuperacao-cliente.md"
      provides: "Release notes do pacote enviado ao cliente"
      min_lines: 100
  key_links:
    - from: "VERIFICATION.md checklists"
      to: "update/*.html (contrato aprovado)"
      via: "referencia por linha do HTML"
      pattern: "HTML ref"
    - from: "pack-release.sh"
      to: "output/release-*.zip"
      via: "zip command"
      pattern: "release-"
    - from: "docs/qa/2026-04-17-recuperacao-cliente.md"
      to: "docker compose run --rm migrate"
      via: "instrucoes de homologacao"
      pattern: "docker compose"
---

<objective>
Fechamento da Phase 8: consolidar validacao pixel-perfect das 4 telas aprovadas contra os HTMLs
em `update/`, re-validar as 18 entregas de pendencias-v3 (D-16), empacotar o sistema em ZIP para
homologacao async do cliente (D-18), gerar release notes com screenshots comparativos e instrucoes
de execucao, e atualizar REQUIREMENTS.md.

Purpose: cumprir criterio de sucesso #4 da Phase 8 ("Validacao visual lado-a-lado das 4 telas
contra os HTMLs aprovados passa por cliente.") e #6 ("Migracoes aplicaveis via `docker compose
run --rm migrate`; typecheck, testes unitarios e E2Es continuam verdes."). Entregar SPEC-4-TELAS-ESTRITO
via checklist documentado em vez de visual regression automatizada (deferida em CONTEXT).

Output: VERIFICATION.md consolidado + script pack-release.sh + docs/qa/2026-04-17-recuperacao-cliente.md
+ ZIP gerado + REQUIREMENTS.md atualizado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-01-nan-null-guards-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-02-schema-migracao-import-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-03-ui-fornecedor-bloco2-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-04-identificacao-enxuta-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-05-ficha-fidelidade-banner-SUMMARY.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-06-grades-ajustes-SUMMARY.md
@.planning/quick/20260417-pendencias-v3/SUMMARY.md
@update/tela-item-v1.html
@update/tela-itens-grade-v2.html
@update/tela-ficha-tecnica-v2.html
@update/tela-fichas-grade-v1.html
@scripts/ops/backup-db.sh
@scripts/ops/migrate-and-seed.sh
@docs/qa/homologation-checklist.md
@docker-compose.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar VERIFICATION.md com 4 checklists pixel-perfect + regressao das 18 entregas pendencias-v3</name>
  <files>.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md</files>
  <read_first>
    - update/tela-item-v1.html (integral — extrair regras CSS linha-a-linha)
    - update/tela-itens-grade-v2.html (integral)
    - update/tela-ficha-tecnica-v2.html (integral)
    - update/tela-fichas-grade-v1.html (integral)
    - .planning/quick/20260417-pendencias-v3/SUMMARY.md (18 entregas)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §9 (estrutura de checklist)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-DIVERGENCES.md (se existir — decisoes R10 e afins)
  </read_first>
  <action>
Criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md`
com 4 secoes de checklist (uma por tela) + 1 secao de regressao + 1 secao de assinatura final.

Estrutura mandatoria (skeleton — preencher):

```markdown
# Phase 8 — VERIFICATION

**Status:** pending
**Ultima atualizacao:** 2026-04-XX
**HTMLs de referencia:** update/tela-item-v1.html, update/tela-itens-grade-v2.html, update/tela-ficha-tecnica-v2.html, update/tela-fichas-grade-v1.html

---

## 1. Checklist pixel-perfect — tela-item-v1.html

Caminho do app: `/itens/[id]`

| # | Item | HTML ref | Componente app | Status | Commit |
|---|------|----------|----------------|--------|--------|
| 1 | `.main` max-width 960px, padding 28px 32px, margin-left 200px | linha 39 | `/itens/[id]/page.tsx` container | ☐ | — |
| 2 | `.card` border 0.5px #D3D1C7, border-radius 10px, padding 20px 24px, margin-bottom 16px | linha 55 | FormSection | ☐ | — |
| 3 | `.card-label` font-size 10px, letter-spacing .1em, uppercase, color #888780, margin-bottom 16px | linha 56 | FormSection.title | ☐ | — |
| 4 | `.field label` font-size 11px, font-weight 500, color #5F5E5A | linha 70 | MUI InputLabel sx | ☐ | — |
| 5 | `.field input` padding 8px 11px, font-size 13px, border 0.5px #D3D1C7, border-radius 6px | linha 73-77 | MUI TextField sx | ☐ | — |
| 6 | `.field input.calc` bg #EAF3DE, color #1B6B2C, font-weight 500, border #C0DD97 | linha 91-93 | readonly verde | ☐ | — |
| 7 | `.fornecedor-block` border 0.5px #D3D1C7, radius 6px, padding 16px, bg #FAFAF9 | linha 97 | PurchasesEditor card | ☐ | — |
| 8 | `.fornecedor-block + .fornecedor-block` bg #F0F7E8, border #C0DD97 — DIVERGENCIA R10: app atual aplica ao principal; ver 08-DIVERGENCES.md para decisao | linha 98 | PurchasesEditor isPrimary logic | ☐ | — |
| 9 | `.tag-fixado` bg #EAF3DE, color #1B6B2C, border 0.5px #C0DD97, radius 4px, padding 1px 6px, font-size 10px, margin-left 6px, font-weight 500 | linha 110 | FixadoBadge component | ☐ | — |
| 10 | `.add-btn` color #185FA5, font-size 12px, icon + text | linha 105-107 | botao Adicionar fornecedor | ☐ | — |
| 11 | Row Identificacao Row 1: `grid-template-columns: 140px 1fr 160px` (Codigo 140px | Nome flex | Status 160px) | linha 61 (classe .g-3-a) + 181 | item-form.tsx grid | ☐ | — |
| 12 | Row Identificacao Row 2: `grid-template-columns: 1fr 1fr` (Tipo | Categoria) | linha 62 (classe .g-2) + 198 | item-form.tsx grid | ☐ | — |
| 13 | Fornecedor row A: `grid-template-columns: 2fr 1fr` (Fornecedor | Atualizado em) | linha 63 (classe .g-2-a) | purchases-editor grid cabecalho | ☐ | — |
| 14 | Fornecedor row B: `grid-template-columns: 1fr 1fr 0.7fr` (Qtde compra | Qtde uso | Fator) | linha 65 (classe .g-3-b) | purchases-editor grid medidas | ☐ | — |
| 15 | Hint "Calculado automaticamente." embaixo de Fator, font-size 11px color #888780 | linha 88, 276 | MUI TextField helperText | ☐ | — |
| 16 | Hint "Calculado a partir da compra principal." embaixo de Preco de uso | linha 287 | MUI TextField helperText | ☐ | — |
| 17 | Bloco 3 Observacoes: textarea com placeholder "Ex.: Arroz marca Albaruska..." | linha 379 | item-form.tsx Bloco 3 | ☐ | — |
| 18 | Label "Descricao operacional (opcional)" com `(opcional)` em font-size 10 color #888780 font-weight 400 | linha 72, 378 | label inline | ☐ | — |
| 19 | Botao "Excluir item" com border #F09595 color #A32D2D; "Salvar alteracoes" btn-primary bg #185FA5 | linha 49-52, 173-174 | topbar buttons | ☐ | — |
| 20 | Breadcrumb "Home > Itens > Arroz branco" font-size 12px color #888780; links #185FA5 | linha 119-121, 161 | page header | ☐ | — |

---

## 2. Checklist pixel-perfect — tela-itens-grade-v2.html

Caminho do app: `/itens`

(Extrair analogamente todas as 15 colunas + larguras + badges Tipo hex + filtros + ordenacao +
row height + min-width.)

| # | Item | HTML ref | Componente app | Status | Commit |
|---|------|----------|----------------|--------|--------|
| 1 | 15 colunas na ordem do PDF | linha ... | items-listing-view | ☐ | — |
| 2 | Coluna Codigo largura 60px | linha ... | dataGrid column def | ☐ | — |
| ... | ... | ... | ... | ☐ | — |

---

## 3. Checklist pixel-perfect — tela-ficha-tecnica-v2.html

Caminho do app: `/fichas/[id]`

| # | Item | HTML ref | Componente app | Status | Commit |
|---|------|----------|----------------|--------|--------|
| 1 | FichaFlatGrid grid-template-columns: 22px minmax(240px, 1fr) 80px 60px 240px 96px 96px 32px | linha ~230 | FichaFlatGrid GRID_TEMPLATE | ☐ | — |
| 2 | CF grid-template-columns: 22px minmax(160px, auto) 128px 128px 96px 1fr 32px | linha ~358 | FichaFlatGrid CF_GRID_TEMPLATE | ☐ | — |
| 3 | FC verde >=100%, vermelho <100%, cinza vazio (pendencias-v3 #4) | linha ... | TotaisIndicadores resolveFactorColor | ☐ | — |
| 4 | Botao "Adicionar Coccao Final" aparece quando CF ausente; esconde quando visivel | linha 378-379 | FichaFlatGrid / components-editor | ☐ | — |
| 5 | Quadro Final: CMV sem/com embalagem exibem "Calcular peso" quando peso ausente (Plan 08-01) | — | TotaisIndicadores costsAndCmv | ☐ | — |
| 6 | Margem de contribuicao R$ exibe "Informe o valor" quando salePriceInput invalido (Plan 08-01) | — | TotaisIndicadores marginRow | ☐ | — |
| 7 | Banner "Este ingrediente ja aparece em: X" (PDFV2-FICHA-07, Plan 08-05) | — | SimilarFichasBanner | ☐ | — |
| ... | ... | ... | ... | ☐ | — |

---

## 4. Checklist pixel-perfect — tela-fichas-grade-v1.html

Caminho do app: `/fichas`

| # | Item | HTML ref | Componente app | Status | Commit |
|---|------|----------|----------------|--------|--------|
| 1 | 12 colunas na ordem do PDF | linha ... | fichas-listing-view | ☐ | — |
| 2 | Badge V{n} inline no Produto (pendencias-v3 #1) | linha ... | renderCell Produto | ☐ | — |
| 3 | FC/IC coloridos (pendencias-v3 #4) | linha ... | renderCell FC/IC | ☐ | — |
| 4 | Coluna Preco de Venda (pendencias-v3 #2) | linha ... | DataGrid column | ☐ | — |
| 5 | Header "Obs" largura 38px (pendencias-v3 #3) | linha ... | DataGrid column width | ☐ | — |
| 6 | Codigo largura 60 (pendencias-v3 #5) | linha ... | DataGrid column width | ☐ | — |
| 7 | Sortable + default Produto A-Z (pendencias-v3 #6) | linha ... | DataGrid sort | ☐ | — |
| ... | ... | ... | ... | ☐ | — |

---

## 5. Regressao das 18 entregas de pendencias-v3 (D-16)

| # | Prioridade | Descricao | Commit original | Re-verificacao | Status |
|---|---|---|---|---|---|
| 1 | P1 | Badge V{n} inline em Produto; coluna Versao removida | abbcb63 | Inspecao visual grade fichas + snapshot DataGrid columns | ☐ |
| 2 | P1 | Coluna Preco de Venda | abbcb63 | `npm run test:e2e -- engineering-flow` + inspecao | ☐ |
| 3 | P1 | Header "Obs" largura 38px | abbcb63 | Inspecao visual (DataGrid column width) | ☐ |
| 4 | P2 | FC/IC coloridos na grade | abbcb63 | Inspecao + unit test TotaisIndicadores | ☐ |
| 5 | P2 | Codigo largura 60 | abbcb63 | Inspecao visual | ☐ |
| 6 | P2 | Sortable + default A-Z | abbcb63 | E2E click coluna | ☐ |
| 7 | P2 | Bloco 2 em cards de fornecedor | 592d0c8 | `npm run test:unit -- purchases-editor` | ☐ |
| 8 | P2 | Custo Atual com destaque azul | 41dc3eb | Inspecao visual | ☐ |
| 9 | P3 | Descricao Operacional opcional (sem asterisco) | c372bd4 | `npm run test:unit -- ItemForm` | ☐ |
| 10 | P1 | FichaFlatGrid + helpers flatten/group | dbf6de0/7ea2c81/e872872 | `npm run test:unit -- FichaFlatGrid` (Plan 08-05) | ☐ |
| 11 | P1 | Drag-to-reorder com handle 6 pontos | 0a4b9f1 | E2E + inspecao | ☐ |
| 12 | P1 | FC/IC coloridos no strip do Quadro Final | a3e6446 | Unit + inspecao | ☐ |
| 13 | P2 | Header limpo (Rendimento/Unidade/FC/IC/Peso Final removidos) | 41dc3eb | Inspecao visual | ☐ |
| 14 | P2 | Badge V{n} abaixo de Data Ultima Alteracao | 41dc3eb | Inspecao visual | ☐ |
| 15 | P2 | Botao "Adicionar Coccao Final" separado | c372bd4 | Unit Plan 08-05 + E2E | ☐ |
| 16 | P2 | Labels "Fator de Correcao (FC)" / "Indice de Coccao (IC)" | a3e6446 | Inspecao | ☐ |
| 17 | P3 | LinearProgress 6px; cor dirigida por MC% | a3e6446 | Inspecao | ☐ |
| 18 | P3 | Diagnostico simplificado | a3e6446 | Inspecao | ☐ |

**Execucao:** rodar `npm run test:e2e -- engineering-flow` uma vez no fechamento, + percorrer
cada item manualmente no navegador com screenshot lado-a-lado do PDF `update/pendencias-sis-restaurante-v3.pdf`.

---

## 6. Assinatura final

- [ ] Todos os 4 checklists pixel-perfect marcados (☐ → ✓) ou justificados (☐ → ✗ com nota)
- [ ] Todos os 18 itens da regressao pendencias-v3 marcados
- [ ] `npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` todos verdes
- [ ] `docker compose run --rm migrate` aplica sem erro em clean DB (smoke do ZIP)
- [ ] 4 screenshots comparativos (HTML vs app) gerados em `docs/qa/screenshots-phase8/`
- [ ] ZIP gerado em `output/release-v1.2-phase8-YYYYMMDD.zip`
- [ ] `docs/qa/2026-04-17-recuperacao-cliente.md` finalizado
- [ ] REQUIREMENTS.md atualizado

**Aprovacao executor:** ___________  **Data:** __________
**Aprovacao cliente (async):** ___________  **Data:** __________
```

Preencher todos os `...` com regras REAIS extraidas dos HTMLs (ler cada arquivo linha-a-linha;
cada HTML tem ~400 linhas, dos quais ~100-150 sao regras CSS relevantes). Meta: >= 15 linhas de
checklist por tela + 18 linhas de regressao.
  </action>
  <verify>
    <automated>test -f .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md && wc -l .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` existe
    - `wc -l VERIFICATION.md` >= 200 linhas
    - `grep -c 'Checklist pixel-perfect' VERIFICATION.md` >= 4 (um por tela)
    - `grep -c 'pendencias-v3' VERIFICATION.md` >= 1 (secao regressao)
    - `grep -c '| 1 |' VERIFICATION.md` >= 4 (primeira linha de cada checklist)
    - `grep -c '☐' VERIFICATION.md` >= 40 (pelo menos 40 itens pendentes)
    - Cada checklist referencia linha do HTML (`grep -c "linha"` >= 20)
    - Secao regressao tem exatamente 18 linhas numeradas 1-18
    - N-04: zero reticencias placeholder — `grep -c '\.\.\.' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` == 0 (todos os "..." foram preenchidos com regras REAIS extraidas dos HTMLs)
  </acceptance_criteria>
  <done>VERIFICATION.md consolidado com 4 checklists pixel-perfect + regressao 18 itens + secao assinatura.</done>
</task>

<task type="auto">
  <name>Task 2: Criar scripts/ops/pack-release.sh + docs/qa/2026-04-17-recuperacao-cliente.md + gerar ZIP</name>
  <files>scripts/ops/pack-release.sh, docs/qa/2026-04-17-recuperacao-cliente.md</files>
  <read_first>
    - scripts/ops/backup-db.sh (analog — shebang, set, permissao exec)
    - scripts/ops/migrate-and-seed.sh (analog)
    - docs/qa/homologation-checklist.md (analog release notes)
    - docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md (analog release notes)
    - package.json (confirmar build script name)
    - docker-compose.yml (W-06: inspecionar definicao do service `migrate` — confirmar se usa bind-mount `.:/app` ou build containerizado para definir ordering correto em release notes)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §9.3
  </read_first>
  <action>
**A) Criar `scripts/ops/pack-release.sh`** (permissao 0755):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Phase 8 — Pack release ZIP para homologacao async do cliente (D-18)
# Uso: bash scripts/ops/pack-release.sh

VERSION_TAG="${1:-v1.2-phase8-$(date +%Y%m%d)}"
OUT_DIR="output"
OUT_ZIP="${OUT_DIR}/release-${VERSION_TAG}.zip"

mkdir -p "${OUT_DIR}"

echo "==> Running production build"
npm run build

echo "==> Packaging ${OUT_ZIP}"
zip -r "${OUT_ZIP}" \
  .next \
  public \
  prisma \
  src \
  scripts \
  docs \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.ts \
  docker-compose.yml \
  -x "*.log" \
  -x "*.tsbuildinfo" \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".next/cache/*" \
  -x "output/*"

echo "==> Release ZIP generated: ${OUT_ZIP}"
echo "==> Size: $(du -h "${OUT_ZIP}" | cut -f1)"
```

Tornar executavel: `chmod +x scripts/ops/pack-release.sh`.

Confirmar que o comando `npm run build` existe em `package.json`. Se usar `next build` diretamente,
ajustar.

**B) Criar `docs/qa/2026-04-17-recuperacao-cliente.md`**

```markdown
# SIS Restaurante — Recuperacao de fidelidade e modelo fornecedor

**Data:** 2026-04-XX
**Versao:** v1.2-phase8
**Escopo:** Phase 8 conforme `.planning/ROADMAP.md §Phase 8`

## Resumo executivo

Apos a rejeicao da entrega v1.2 em 2026-04-17, esta entrega consolida:

1. **NaN/null guards** no Quadro Final — zero ocorrencia de `R$ NaN`, `-- / kg`, `null`, `undefined`.
2. **Refatoracao do modelo de item** — unidade/qtde/preco agora vivem POR fornecedor em `ItemCompra`,
   com unidade de uso + qtde de uso + fator derivados client-side para secundarios.
3. **4 telas pixel-perfect** contra HTMLs aprovados (`update/*.html`).
4. **Banner PDFV2-FICHA-07** — aviso quando ingrediente ja aparece em ficha semelhante.
5. **Re-validacao das 18 entregas de pendencias-v3** — nada regrediu.

## Como rodar (homologacao local)

Pre-requisitos: Docker, Docker Compose, Node.js 20+, npm.

1. Extrair ZIP:
   ```
   unzip release-v1.2-phase8-YYYYMMDD.zip -d sis-restaurante-v1.2-phase8
   cd sis-restaurante-v1.2-phase8
   ```

2. Subir banco:
   ```
   docker compose up -d db
   ```

3. **Backup antes de migrar (IMPORTANTE):**
   ```
   ./scripts/ops/backup-db.sh
   ```

4. Aplicar migrations:
   ```
   docker compose run --rm migrate
   ```

5. Seed minimo (primeira rodada):
   ```
   npm run db:seed
   ```

6. Instalar deps (primeira rodada):
   ```
   npm ci
   ```

7. Rodar:
   ```
   npm start
   ```
   App disponivel em `http://localhost:3000`.

## Changelog por area

### Plano 08-01 — NaN/null guards (PDFV2-CRIT-03..07)
- `TotaisIndicadores.tsx`: helpers `weightMissing` e `salePriceValid` controlam fallbacks.
- CMV sem/com embalagem e CMV final aplicado exibem "Calcular peso" quando peso ausente.
- Margem de contribuicao R$ exibe "Informe o valor" quando preco invalido.
- `env.ts`: confirmado throw explicito sem fallback hardcoded para SESSION_SECRET.

### Plano 08-02 — Schema + migracao + import
- `ItemCompra` ganhou `unidade_uso_id` (nullable) e `quantidade_uso` (nullable).
- Migration `202604172100_phase8_item_compra_fornecedor` idempotente; backfill automatico.
- Presenter deriva campos fixados dos secundarios a partir do principal.
- Zod `superRefine` valida principal obrigatorio.
- Import CSV cria ItemCompra principal com defaults sensatos.

### Plano 08-03 — UI fornecedor (Bloco 2)
- `purchases-editor.tsx` estendido com Unidade de uso + Qtde de uso + badges "fixado do 1o fornecedor"
  + readonly verde nos secundarios.
- Toggle principal emite aviso transitorio "Campos fixados atualizados a partir de X".

### Plano 08-04 — Identificacao enxuta (SPEC-ITEM-LAYOUT, PDFV2-ITEM-05)
- Removida secao "Descricao e detalhamento operacional" do item-form.
- Descricao migrada para Bloco 3 Observacoes.
- Grid Row 1 da Identificacao = `140px 1fr 160px` conforme HTML.
- Cards laterais de rastreabilidade removidos.

### Plano 08-05 — Ficha fidelidade + banner
- `FichaFlatGrid` GRID_TEMPLATE re-confirmado contra HTML.
- Server action `findFichasUsingItem` implementada (mesma modalidade + mesmo item).
- Componente `SimilarFichasBanner` renderiza Alert inline.

### Plano 08-06 — Grades
- `mapItemListRow` retorna "--" para itens sem ItemCompra principal.

### Plano 08-07 — Pixel-perfect + release
- VERIFICATION.md consolidado.
- ZIP empacotado.

## Migrations Prisma aplicadas

- `202604172100_phase8_item_compra_fornecedor` — adiciona unidade_uso_id, quantidade_uso + backfill

**Rollback manual** (caso necessario):
```sql
ALTER TABLE item_compra DROP COLUMN unidade_uso_id;
ALTER TABLE item_compra DROP COLUMN quantidade_uso;
```

## Screenshots comparativos

| Tela | HTML (contrato) | App (entrega) |
|------|-----------------|---------------|
| Item | `update/tela-item-v1.html` | `docs/qa/screenshots-phase8/item-app.png` |
| Grade Itens | `update/tela-itens-grade-v2.html` | `docs/qa/screenshots-phase8/itens-grade-app.png` |
| Ficha | `update/tela-ficha-tecnica-v2.html` | `docs/qa/screenshots-phase8/ficha-app.png` |
| Grade Fichas | `update/tela-fichas-grade-v1.html` | `docs/qa/screenshots-phase8/fichas-grade-app.png` |

## Confirmacao de testes verdes

Cole aqui o output abreviado da suite:

```
npm run typecheck  → OK
npm run test:unit → XX passed, 0 failed
npm run test:integration → XX passed, 0 failed
npm run test:e2e → XX passed, 0 failed
```

## Checklist de validacao

Ver `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` para
detalhamento pixel-perfect das 4 telas + regressao das 18 entregas de pendencias-v3.

## Assinatura

- **Preparado por:** ___________
- **Aprovacao cliente (async):** ___________
- **Data de envio do ZIP:** ___________
```

**W-06 — ordering das instrucoes de rodar (release notes):** antes de finalizar a secao "Como rodar", inspecionar `docker-compose.yml` service `migrate`:
- **Caso A — service `migrate` usa build containerizado (target: ops) sem bind-mount de `.:/app` (CONFIRMADO no projeto atual — ver docker-compose.yml linhas 25-45):** ordem canonica ja esta correta: `docker compose up -d db` → `./scripts/ops/backup-db.sh` → `docker compose run --rm migrate` → `npm ci` (apenas para rodar `npm start` local) → `npm start`. Migrate roda DENTRO do container com dependencias propias (npm ci NAO e requerido para migrate funcionar).
- **Caso B — se no futuro o compose mudar para bind-mount `.:/app`:** release notes MUST reordenar: `npm ci` → `docker compose up -d db` → `./scripts/ops/backup-db.sh` → `docker compose run --rm migrate` → `npm run build` → `npm start`.

Atualizar a secao "Como rodar" de `docs/qa/2026-04-17-recuperacao-cliente.md` explicitamente para Caso A (estado atual do projeto), citando a linha do docker-compose.yml (target: ops).

Capturar screenshots comparativos via Playwright manual (navegar para cada rota, screenshot + referencia ao HTML em `update/`) ou via `scripts/ops/capture-ficha-layout.ts` se o script existe.

**C) Gerar ZIP** (apos aprovacao do usuario na Task 3):
```
bash scripts/ops/pack-release.sh
```

Nao gerar ZIP autonomamente — a build production pode consumir muito tempo; Task 3 e checkpoint.
  </action>
  <verify>
    <automated>test -x scripts/ops/pack-release.sh && test -f docs/qa/2026-04-17-recuperacao-cliente.md && grep -c 'docker compose run --rm migrate' docs/qa/2026-04-17-recuperacao-cliente.md</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/ops/pack-release.sh` existe e e executavel (`test -x`)
    - `grep -c '#!/usr/bin/env bash' scripts/ops/pack-release.sh` == 1
    - `grep -c 'set -euo pipefail' scripts/ops/pack-release.sh` == 1
    - `grep -c 'node_modules' scripts/ops/pack-release.sh` >= 1 (exclusao)
    - `grep -c '.env' scripts/ops/pack-release.sh` returns 0 (zero secret leak — NAO inclui .env)
    - `docs/qa/2026-04-17-recuperacao-cliente.md` existe
    - `wc -l docs/qa/2026-04-17-recuperacao-cliente.md` >= 100
    - `grep -c 'docker compose run --rm migrate' docs/qa/2026-04-17-recuperacao-cliente.md` >= 1
    - `grep -c 'backup-db.sh' docs/qa/2026-04-17-recuperacao-cliente.md` >= 1
    - `grep -c 'Rollback' docs/qa/2026-04-17-recuperacao-cliente.md` >= 1
  </acceptance_criteria>
  <done>Script + release notes criados; ZIP pendente de aprovacao do checkpoint Task 3.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>[BLOCKING] Task 3: Rodar suite completa + percorrer VERIFICATION.md checklists + gerar ZIP + capturar screenshots</name>
  <what-built>Todos os 6 planos de codigo (08-01..08-06) entregaram. Task 1 criou VERIFICATION.md e Task 2 criou o script de release + release notes. Este checkpoint e a execucao humana do checklist pixel-perfect + suite de testes + empacotamento final.</what-built>
  <how-to-verify>
    Checklist sequencial (executar em ordem; seguir VERIFICATION.md para detalhes):

    1. **Suite completa verde**
       ```
       npm run typecheck
       npm run test:unit
       npm run test:integration
       npm run test:e2e
       ```
       Cole output abreviado em `docs/qa/2026-04-17-recuperacao-cliente.md` secao "Confirmacao de testes verdes". Todos devem sair com exit 0.

    2. **Percorrer VERIFICATION.md** 
       Abrir `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md`. Para cada item das 4 checklists pixel-perfect:
       - Abrir HTML em um navegador: `update/tela-item-v1.html` etc.
       - Abrir app em outra janela: `http://localhost:3000/itens/{id}` etc.
       - Comparar item-a-item a regra CSS com o render real (DevTools do browser -> Computed Style).
       - Marcar ☐ -> ✓ se passa; ☐ -> ✗ + nota se diverge.

    3. **Regressao pendencias-v3** (18 itens em VERIFICATION.md secao 5)
       Para cada item, executar o passo "Re-verificacao" da tabela (E2E ou inspecao visual). Marcar status.

    4. **Capturar screenshots comparativos**
       Usar script existente `scripts/ops/capture-ficha-layout.ts` ou Playwright/navegador manual para capturar:
       - `docs/qa/screenshots-phase8/item-app.png`
       - `docs/qa/screenshots-phase8/itens-grade-app.png`
       - `docs/qa/screenshots-phase8/ficha-app.png`
       - `docs/qa/screenshots-phase8/fichas-grade-app.png`
       Idealmente, ao lado dos HTMLs renderizados (side-by-side screenshot). Mkdir `docs/qa/screenshots-phase8/` primeiro.

    5. **Atualizar REQUIREMENTS.md** marcando Phase 8 requirements como Complete:
       - SPEC-ITEM-FORNECEDOR, SPEC-ITEM-LAYOUT, SPEC-FICHA-FIDELIDADE, SPEC-4-TELAS-ESTRITO (adicionar a tabela Traceability se ausente)
       - PDFV2-CRIT-03..07, PDFV2-FICHA-07, PDFV2-ITEM-05 → Status: Complete, Phase: 8

    6. **Gerar ZIP final:**
       ```
       bash scripts/ops/pack-release.sh
       ```
       Confirmar geracao de `output/release-v1.2-phase8-YYYYMMDD.zip`. Verificar tamanho (<200MB esperado; se maior investigar).

    7. **Smoke do ZIP (W-06 — verificacao de auto-contencao do migrate):**
       ```
       mkdir /tmp/sis-release-test && cd /tmp/sis-release-test
       unzip <path-to-zip>
       # W-06: NAO rodar npm ci antes do migrate — confirmar que migrate funciona em clean host sem dependencias Node instaladas
       docker compose up -d db
       docker compose run --rm migrate   # deve aplicar sem erro usando APENAS o container ops (dependencias bundled na imagem)
       docker compose run --rm migrate   # segunda execucao: idempotencia (0 pending migrations)
       # Apenas DEPOIS instalar deps para rodar o app local:
       npm ci
       npm start
       ```
       Se `docker compose run --rm migrate` falhar sem `npm ci` previo, o docker-compose.yml mudou entre planejamento e release — fail smoke + corrigir release notes ANTES de enviar ZIP.
       Confirma que o pacote esta auto-contido e migrate roda sem dependencias do host.

    8. **Preencher assinaturas em VERIFICATION.md** (secao 6) e `docs/qa/2026-04-17-recuperacao-cliente.md`.
  </how-to-verify>
  <resume-signal>
    Responda com:
    (a) "approved + zip-ready" se todos os 8 passos estao verdes e ZIP pronto para envio ao cliente
    (b) "blocked: <detalhe>" descrevendo qualquer falha (teste nao-green, pixel divergencia criticas, erro no migrate do smoke)
    (c) "review <lista>" listando itens do checklist marcados como ✗ que precisam de novo plano de correcao (gap-closure)
  </resume-signal>
  <acceptance_criteria>
    - Suite completa verde (typecheck + unit + integration + e2e)
    - Todos os 4 checklists pixel-perfect com pelo menos 90% ✓ (divergencias justificadas com nota)
    - Todos os 18 itens da regressao marcados ✓
    - 4 screenshots em `docs/qa/screenshots-phase8/`
    - `.planning/REQUIREMENTS.md` tem Phase 8 requirements marcados Complete
    - `output/release-v1.2-phase8-YYYYMMDD.zip` gerado
    - Smoke ZIP passa (migrate clean + docker compose up funciona)
    - VERIFICATION.md secao 6 assinada pelo executor
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ZIP artifact -> cliente | Pacote enviado para ambiente do cliente, fora do controle do dev |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-07-01 | Info Disclosure | `.env` ou `credentials.json` empacotados no ZIP | mitigate | `pack-release.sh` lista explicita de pastas/arquivos; NAO inclui `.env*` (pattern -x nao precisa — sem match no include). `grep -c '.env' scripts/ops/pack-release.sh` returns 0. |
| T-08-07-02 | Info Disclosure | `.git/` com historico privado vazando no ZIP | mitigate | Exclusao explicita `-x ".git/*"` no pack-release.sh |
| T-08-07-03 | Info Disclosure | Logs com dados sensiveis empacotados | mitigate | Exclusao `-x "*.log"` no pack-release.sh |
| T-08-07-04 | Tampering | Cliente altera codigo do ZIP antes de reportar | accept | Cliente tem direito a auditar o codigo; rastreio via commits git no projeto + hash SHA-256 do ZIP enviado pode ser gerado como addendum nas release notes se cliente pedir |
| T-08-07-05 | Repudiation | Aprovacao async sem assinatura formal | mitigate | `docs/qa/2026-04-17-recuperacao-cliente.md` tem secao "Assinatura" com campo para approval escrito do cliente; cadencia da aprovacao registrada em STATE.md apos resposta |
| T-08-07-06 | DoS | Cliente roda migrate sem backup e perde dados | mitigate | Instrucoes explicitas na release notes passo 3 (`./scripts/ops/backup-db.sh` ANTES de migrate); R8 de RESEARCH.md |
</threat_model>

<verification>
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` existe com 4 checklists + regressao
- `scripts/ops/pack-release.sh` executavel e nao vaza secrets
- `docs/qa/2026-04-17-recuperacao-cliente.md` >= 100 linhas, instrucoes de rodar + changelog + screenshots
- `output/release-v1.2-phase8-YYYYMMDD.zip` gerado
- Smoke: migrate aplica em clean DB via `docker compose run --rm migrate`
- `.planning/REQUIREMENTS.md` Phase 8 requirements Complete
- Suite completa verde (typecheck + unit + integration + e2e)
</verification>

<success_criteria>
1. VERIFICATION.md com >= 200 linhas e 4 checklists pixel-perfect + regressao 18 itens.
2. scripts/ops/pack-release.sh executavel, exclui node_modules/.git/.env/*.log/.tsbuildinfo.
3. docs/qa/2026-04-17-recuperacao-cliente.md com instrucoes + changelog + screenshots + assinatura.
4. ZIP output/release-v1.2-phase8-YYYYMMDD.zip gerado e testado em clean env.
5. REQUIREMENTS.md atualizado marcando Phase 8 requirements Complete.
6. Suite completa verde (typecheck + unit + integration + e2e).
7. Aprovacao do executor assinada em VERIFICATION.md secao 6.
8. ZIP pronto para envio ao cliente; aprovacao async e proximo gate fora da fase.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-07-pixel-perfect-verification-release-SUMMARY.md`
</output>
</content>
</invoke>