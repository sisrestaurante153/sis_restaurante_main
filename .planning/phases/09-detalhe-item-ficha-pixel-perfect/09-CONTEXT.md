# Phase 9: Telas de detalhe Item e Ficha Tecnica pixel-perfect com HTML - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Sources:** ROADMAP.md Phase 9, REQUIREMENTS.md (SPEC-4-TELAS-ESTRITO, SPEC-ITEM-FORNECEDOR, SPEC-FICHA-FIDELIDADE, SPEC-DB-API-ALINHAMENTO), HTMLs `update/tela-item-v1.html` + `update/tela-ficha-tecnica-v2.html`, Phase 8 CONTEXT como baseline, Phase 8.1 flat pattern.

<domain>
## Phase Boundary

Esta fase entrega:

- tela interna de cadastro/edicao de Item (`/itens/[id]` + `/itens/novo`) 1:1 com `update/tela-item-v1.html` em blocos, ordem, labels, grid, spacing, tokens, estados vazios e comportamento;
- tela interna de edicao de Ficha Tecnica (`/fichas/[id]` + `/fichas/nova`) 1:1 com `update/tela-ficha-tecnica-v2.html` (Identificacao, Estrutura, Finalizacao, Quadro Final; Coccao Final, montagem, FC/IC e drag-reorder preservados sem regressao);
- auditoria formal de Schema Prisma, Zod, presenter e server actions contra todos os campos dos dois HTMLs (sem migration esperada, mas gerada se gap real aparecer);
- extensao do `tests/e2e/pixel-perfect-phase8.spec.ts` com contract-check automatizado para as duas telas de detalhe;
- VERIFICATION.md + release scaffold no padrao Phase 8.

Esta fase nao cobre:

- mudancas de logica de custo/rendimento/FC/IC (preservadas das Phases 5-8);
- adicao de capacidade nova (ex.: handler real de Duplicar/Exportar — apenas estrutura visual sem handler);
- pendencias comerciais removidas do escopo pelo usuario em Phase 8;
- export PDF da ficha (roadmap v2, PDFV2-FUT-01);
- thresholds configuraveis do badge CMV (roadmap v2, PDFV2-FUT-02);
- realinhamento adicional das grades `/itens` e `/fichas` (coberto por Phase 8.1 ja em andamento/concluido para as listagens);
- redesign das telas — o contrato pixel-perfect segue estritamente os HTMLs aprovados, nao permite divergencia criativa.

</domain>

<decisions>
## Implementation Decisions

### A. Ficha Identificacao — refactor (Area 1)

#### D-01 Substituir MUI Grid por Box sx CSS grid inline

- `ficha-form.tsx:230-362` (`<FormSection title="Identificacao">`): remover `<Grid container spacing={2}>` + `<Grid size={{ xs, md }}>` children.
- Aplicar padrao Phase 8 D-09 (identico ao `item-form.tsx:118-203`):
  - **Row 1:** `<Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 175px', gap: 1.5, mb: 1.5 }}>` — Cod | Produto | Data de criacao | Data e hora da ultima alteracao.
  - **Row 2:** `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 1fr', gap: 1.5 }}>` — Modalidade | Grupo operacional | Status | Custo atual da ficha.
- Grid templates sao testaveis via grep direto no source (nao dependem de CSS resolvido pelo MUI no jsdom — jurisprudencia Phase 8 D-09, D-03 Phase 08-05).

#### D-02 MUI TextField com sx override para match pixel

- Preservar `TextField`/`Select` MUI (acessibilidade + `getByLabelText` dos testes + integracao com `useActionState`).
- Ajustar `sx` para match dos tokens HTML `.f input`/`.f select` (linhas 52-53 do HTML):
  - `padding: '7px 10px'`, `fontSize: 13`, `border: '0.5px solid #D3D1C7'`, `borderRadius: '6px'`, `background: '#fff'`.
  - Label: `fontSize: 11`, `fontWeight: 500`, `color: '#5F5E5A'` (match `.f label`).
- Nao migrar para `<input>` nativo (quebraria muita acessibilidade + estados de erro MUI por um ganho marginal de fidelidade).

#### D-03 Custo atual da ficha — box azul pixel-perfect

- `ficha-form.tsx:324-360`: ajustar `Box` do custo para match HTML linha 266:
  - `padding: '7px 12px'` (nao `px: 1.5, py: 1`),
  - `borderRadius: '6px'` (nao `radius-s`),
  - `border: '0.5px solid #D3D1C7'` (explicito, nao token generico),
  - `background: '#E6F1FB'` (var(--azul-l)),
  - R$ inline: `fontSize: 11, color: '#185FA5', fontWeight: 500`,
  - valor: `fontSize: 18, color: '#185FA5', fontWeight: 600` (HTML marca 600, nao 700).

#### D-04 TDD RED guard antes do refactor

- Task 1 RED (novo commit): adicionar suite unit em `ficha-form.test.tsx` que assert:
  - Row 1 grid `gridTemplateColumns: '110px 1fr 150px 175px'` via `component.container.querySelector('[style*="gridTemplateColumns"]')` ou grep do source (padrao Phase 08-05).
  - Row 2 grid `'1fr 1fr 120px 1fr'`.
  - Presenca de labels exatos: "Cod.", "Produto", "Data de criacao", "Data e hora da ultima alteracao", "Modalidade", "Grupo operacional", "Status", "Custo atual da ficha".
- Task 2 GREEN: refactor componente + atualizar testes legados que assumiam MUI Grid.
- Commits separados RED/GREEN conforme padrao Phase 8.

### B. Topbar Ficha + Version badge + Finalizacao (Area 2)

#### D-05 Duplicar + Exportar icon buttons — estrutura visual sem handler

- `/fichas/[fichaId]/page.tsx` topbar: adicionar dois `<button class="btn-icon">` com SVGs exatos do HTML (linhas 247-248):
  - **Duplicar:** `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>`
  - **Exportar:** `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10v3h10v-3M8 2v7M5 6l3-3 3 3"/></svg>`
- `btn-icon` sx: `padding: '7px 10px'`, `border: '0.5px solid #D3D1C7'`, `borderRadius: '6px'`, `background: '#fff'`, `color: '#5F5E5A'`.
- `onClick` = `() => { /* TODO Phase 10: duplicar ficha */ }` (ou no-op com aria-disabled) + comentario TODO citando Phase futura. **Sem** handler funcional nesta fase — handler de Exportar PDF cairia em roadmap v2 PDFV2-FUT-01.
- `title` attribute preservado para tooltip acessivel.

#### D-06 Badge "ativa" inline + subtitulo pixel-perfect

- Topbar Ficha ja exibe subtitulo "Edicao da ficha tecnica principal." — validar tokens contra HTML linha 244: `fontSize: 12, color: '#888780', marginTop: '3px'`.
- Badge inline no page title (linha 243): `.badge` com `padding: '2px 9px', borderRadius: '20px', background: '#EAF3DE', color: '#1B6B2C', fontSize: 11, fontWeight: 500`. Texto "ativa" (nao "Ativa" e nao "ativo" — HTML usa minuscula gender-match; na Ficha o badge da tela HTML e "ativa" enquanto item e "ativo").
- Page title: `fontSize: 22, fontWeight: 600, color: '#2C2C2A'`.

#### D-07 Version badge V{n} — manter posicionamento atual

- **Nao mexer** no posicionamento abaixo de "Data e hora da ultima alteracao" (`ficha-form.tsx:248-270`), entregue em `pendencias-v3 #14` e aceito pelo cliente.
- HTML v2 **nao contradiz** — apenas nao documenta o V{n} no cabecalho (o `.ver-badge` do HTML aparece no Quadro Final, linha 139, com sem\u00e2ntica diferente).
- Ajustar apenas tokens visuais do badge atual para match: `background: '#E6F1FB', border: '0.5px solid #B5D4F4', color: '#185FA5', fontSize: 11, fontWeight: 600, borderRadius: '4px', padding: '2px 8px'`.
- **Nao adicionar** `.ver-badge` gold no Quadro Final nesta fase (escopo creep — Quadro Final ja foi fechado em Phase 6/7/8).

#### D-08 Finalizacao — 2-col 50/50, ambos opcionais

- `ficha-form.tsx:374-402`: substituir `<Grid container spacing={2}><Grid md={7}><Grid md={5}>` por `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>` (`g-fin` do HTML linha 119).
- Remover `required` de `preparationMode`.
- Marcar ambos labels com "(opcional)" usando o mesmo padrao inline do `description` do item (Phase 8 D-15): `<>Modo de preparo <span style={{color:'#888780',fontSize:10,fontWeight:400}}>(opcional)</span></>`.
- `rows` de ambos textareas = 4 (HTML `.f textarea { min-height: 80px }` + linha 429 sem rows explicitos — 4 rows visual equivalente).
- Placeholders do HTML: "Descreva o passo a passo do preparo para o operador de cozinha..." e "Observacoes gerais, alertas ou informacoes complementares...".

### C. Schema / API / Zod gap audit (Area 3)

#### D-09 Auditoria formal sem migration obrigatoria

- Plano 09-01 produz uma tabela HTML-field \u2194 Prisma-field \u2194 Zod-field \u2194 presenter-output para:
  - `tela-item-v1.html` (Identificacao + Fornecedor 1 Principal + Fornecedor 2 fixado + Observacoes)
  - `tela-ficha-tecnica-v2.html` (Identificacao + Estrutura + Montagem + Finalizacao + Quadro Final)
- Cada linha: status COBERTO / GAP / DRIFT. Scout preliminar sugere **zero gap novo** pos Phase 8 — auditoria valida formalmente.
- Se auditoria encontrar **gap real**, gerar migration Prisma idempotente (pattern Phase 8 D-04: `ADD COLUMN IF NOT EXISTS` + CTE backfill + `docker compose run --rm migrate`). Caso contrario, **zero migration**.
- Resultado registrado em `09-VERIFICATION.md` + tabela embutida no plano 09-01-SUMMARY.md.

#### D-10 Zod preparationMode: optional com default ''

- `engineering/server/engineering-actions.ts` Zod: `preparationMode: z.string().min(1)` → `preparationMode: z.string().default('')`.
- **Nao** tornar coluna Prisma nullable — preserva NOT NULL com default `''` no lado app (menor blast radius + zero migration).
- Tests de Zod legados que assumiam obrigatoriedade: ajustar para aceitar string vazia.

#### D-11 ItemCompra.priceUpdatedAt — validar render, nao persist

- Coluna ja existe (entregue em pendencias-v3 #1 + Phase 8-02).
- Plano de item retoque (09-02) valida apenas **render**: formato "dd/mm/yyyy" via `Intl.DateTimeFormat('pt-BR')` ou equivalente; placeholder "dd/mm/aaaa" quando null (Fornecedor 2 no HTML linha 310).
- **Nao** adicionar trigger auto-update de `priceUpdatedAt` quando preco/qtde mudarem — fora de escopo (ideia capturada em Deferred).

#### D-12 Declarar explicitamente "zero migration Phase 9"

- `09-VERIFICATION.md` §Schema registra:
  - Resultado da auditoria D-09 (zero gap esperado);
  - Declaracao formal "Phase 9 = zero Prisma migration; auditoria HTML\u2194modelo passou sem divergencia" — satisfaz goal #3 trivialmente;
  - Caso gap aparecer, registra migration gerada + evidencia `docker compose run --rm migrate` 2x (idempotencia).

### D. Item form retoque + topbar `/itens/[id]` (Area 4)

#### D-13 FormSection — remover description, preservar title

- `item-form.tsx:113-117` e `:217`: remover prop `description="Dados mestres para identificar..."` das tres FormSection (Identificacao, Bloco 2 — se tiver, Observacoes).
- Se `FormSection` component nao suporta `description?: string` opcional, refator minor em `src/components/ui/FormSection.tsx` para aceitar `undefined` e nao renderizar o subtitle.
- Resultado: `.card-label` bate 1:1 com HTML linha 56 (`font-size: 10px; font-weight: 600; letter-spacing: .1em; color: #888780; text-transform: uppercase; margin-bottom: 16px`).

#### D-14 Topbar Item — pixel-perfect hex + padding

- `/itens/[itemId]/page.tsx:56-76` e `:116-120`: validar TopBar component renderiza:
  - Subtitulo "Edicao do item mestre." — `fontSize: 12, color: '#888780', marginTop: '3px'` (HTML linha 170).
  - `btn-danger "Excluir item"` — `padding: '8px 18px', border: '0.5px solid #F09595', color: '#A32D2D', background: '#fff'`; hover `background: '#FCEBEB'` (HTML linhas 49-50).
  - `btn-primary "Salvar alteracoes"` — `padding: '8px 18px', background: '#185FA5', border: '0.5px solid #185FA5', color: '#fff'`; hover `background: '#0C447C'` (HTML linhas 51-52).
- Registra em VERIFICATION pixel-perfect checklist.

#### D-15 Placeholders do HTML em `/itens/novo`

- `PurchasesEditor` (reusa Phase 8): fornecedor 2+ (adicional) — inputs de "Atualizado em" placeholder `"dd/mm/aaaa"`, quantidades placeholder `"0,0000"`, precos placeholder `"R$ 0,00"` (HTML linhas 310, 335, 353).
- `item-form.tsx:235`: textarea "Descricao operacional" placeholder "Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg." — **ja esta no codigo** (linha 235), validar match byte-a-byte no plano 09-02.
- Fornecedor 1 (principal) em `/novo`: mantem valores defaults atuais (kg, 1,0000) — nao sao placeholders, sao valores pre-preenchidos sensatos.

#### D-16 Badge ativo/inativo — verde/cinza neutro

- `/itens/[itemId]/page.tsx:57`: status badge usa tokens:
  - **Ativo:** `background: '#EAF3DE', color: '#1B6B2C', border: '0.5px solid #C0DD97'` (HTML linha 44 `.badge`).
  - **Inativo:** `background: '#F4F4F2', color: '#888780', border: '0.5px solid #D3D1C7'` (neutro bg + border).
- **Nao usar** vermelho (`--verm`) para "inativo" — reservado para estados de erro (consistent com Ficha badge "ativa/inativa" e com tokens HTML).

### E. Testes pixel-perfect + ordem dos planos (Area 5)

#### D-17 Estender `tests/e2e/pixel-perfect-phase8.spec.ts`

- Adicionar no mesmo arquivo:
  - `describe('item detail pixel-perfect')` — carrega `file://.../update/tela-item-v1.html`, extrai CSS rules (`.card`, `.g-3-a`, `.g-2`, `.fornecedor-block`, `.forn-label`, `.tag-fixado`), compara com DOM vivo de `/itens/[id]` e `/itens/novo` com tolerance +/- 4px.
  - `describe('ficha detail pixel-perfect')` — carrega `file://.../update/tela-ficha-tecnica-v2.html`, extrai `.g-id1`, `.g-id2`, `.grade-header`, `.item-row`, `.cf-row`, `.hs`, `.qf-cols`, `.lo-grid`, compara com DOM vivo de `/fichas/[id]` e `/fichas/nova`.
- Reusa helpers de extracao de CSS rules ja escritos em Phase 8.
- Workers=1 no Windows (padrao Phase 8); meta: PASS para todos os contratos extraidos. Divergencias cosmeticas **reportadas** (nao bloqueiam) — gate automatico so falha em erro de extracao.

#### D-18 Ordem wave-based dos 5 planos

- **Wave 1 (solo):** `09-01-schema-api-audit-PLAN.md` — audit HTML\u2194Prisma\u2194Zod\u2194presenter; bloqueia UI se gap real aparecer; no caso base (zero gap) = documental + VERIFICATION entry.
- **Wave 2 (paralelo, 2 planos — revised 2026-04-19 por checker dependency_correctness):**
  - `09-02-item-form-retoque-PLAN.md` — D-13/D-14/D-15/D-16 + item-form.tsx FormSection + page.tsx /itens/[id] + PurchasesEditor placeholders.
  - `09-03-ficha-identificacao-refactor-PLAN.md` — D-01/D-02/D-03/D-04 TDD RED→GREEN do bloco Identificacao da ficha-form.tsx.
- **Wave 3 (sequencial apos 09-03):** `09-04-ficha-topbar-finalizacao-PLAN.md` — D-05/D-06/D-07/D-08 topbar Duplicar+Exportar + badge ativa + version badge polish + Finalizacao 2-col + Zod D-10. Depende de 09-03 porque ambos editam `src/modules/engineering/ui/ficha-form.tsx` (09-03 bloco Identificacao, 09-04 version badge + Finalizacao).
- **Wave 4 (solo):** `09-05-pixel-perfect-tests-release-PLAN.md` — D-17 spec extension + VERIFICATION.md consolidada + release scaffold (git tag + commit SHA, sem ZIP per Phase 8 D-18/8-07 user override).

#### D-19 5 planos total (granularidade balanceada)

- Cada plano tem escopo < 4 tasks tipicamente.
- `09-01` e grande em auditoria mas pequeno em codigo (zero impl se sem gap).
- `09-03` e o de maior blast radius (Ficha Identificacao refactor TDD) mas bem delimitado.
- `09-02` e `09-03` tem overlap zero em arquivos (catalog/ui/* vs engineering/ui/ficha-form.tsx) — safe paralelo em Wave 2. `09-04` move-se para Wave 3 porque tambem edita `ficha-form.tsx` (checker revision 2026-04-19).

#### D-20 E2E gates apos cada plano + final

- `npm run test:e2e -- engineering-flow` + `npm run test:e2e -- importacao` no close de cada plano.
- Gate final no plano 09-05: subset estavel (bootstrap + navigation + pixel-perfect-phase8) + pixel-perfect das detail pages + engineering-flow + importacao. `workers=1` no Windows.
- Se algum E2E flakar por reasons pre-existentes (ex.: login flake importacao em Phase 8-07), registra em deferred-items.md e segue (padrao Phase 8 D-16).

### Claude's Discretion

- Nome exato dos FormSections/title strings — planejador decide se mantem "Identificacao", "Detalhamento de Compras / Fornecedor", "Observacoes", "Estrutura da Ficha", "Finalizacao" (todos ja batem HTML) ou refina microcopy. Contrato esta em D-13 + HTML.
- Posicionamento do `gap` exato no Box sx (1.5 = 12px MUI default ~ HTML `gap:14px`) — planejador ajusta para match visual (gap: 14/8 = 1.75 ja em uso em `item-form.tsx:123`). Criterio: render equivalente ao HTML `.row { gap: 14px }`.
- Ordem interna do TDD no plano 09-03: RED pode ser 1 commit unico ou 2 (grid asserts + label asserts) — executor decide.
- Handler visual placeholder de Duplicar/Exportar: `onClick={() => undefined}` vs `onClick={() => { /* TODO */ }}` com comentario TODO — estilistico.
- Mecanismo de `title` vs `aria-label` nos btn-icon — ambos aceitaveis.
- Formato exato da tabela HTML\u2194Prisma do D-09 (markdown table vs CSV vs JSON) — planejador do 09-01 decide.

### Folded Todos

(Nenhum todo foi folded — cross_reference_todos nao surfou matches; backlog parking lot n/a nesta fase.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### HTMLs aprovados (contrato de fidelidade pixel-perfect — MANDATORIO ler linha-a-linha)

- `update/tela-item-v1.html` — contrato completo da tela de item: Bloco 1 Identificacao (linhas 178-220), Bloco 2 Detalhamento de Compras/Fornecedor (linhas 222-372, cards Principal + Fornecedor 2 com badges fixado), Bloco 3 Observacoes (linhas 374-381).
- `update/tela-ficha-tecnica-v2.html` — contrato completo da ficha tecnica: Identificacao g-id1/g-id2 (linhas 253-268), Estrutura da Ficha grade + item-row + cf-row (linhas 270-384), Montagem (linhas 387-422), Finalizacao g-fin (linhas 425-432), Quadro Final qf-wrap (linhas 435-578).
- `update/tela-fichas-grade-v1.html` — referencia listagem (cobertura Phase 8.1), incluido para contexto cross-cutting.
- `update/tela-itens-grade-v2.html` — referencia listagem (cobertura Phase 8.1), incluido para contexto cross-cutting.

### Documentos de origem da fase

- `.planning/ROADMAP.md` §Phase 9 — goal, requirements, success criteria, agentes esperados.
- `.planning/REQUIREMENTS.md` — SPEC-4-TELAS-ESTRITO, SPEC-ITEM-FORNECEDOR, SPEC-FICHA-FIDELIDADE, SPEC-DB-API-ALINHAMENTO (todas pendentes para Phase 9).
- `update/pendencias-sis-restaurante-v3.pdf` — 18 itens baseline aceitos em pendencias-v3; goal #6 Phase 9 exige nao regredir.

### Contexto de fases anteriores (baseline, nao regredir)

- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md` — D-01..D-19 Phase 8: ItemCompra schema, derivacao fixado, identificacao enxuta (D-09), pixel-perfect granularity (D-15), ZIP removido (D-18 substituido por git tag + commit SHA).
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` — 4 checklists pixel-perfect existentes + 18 regressoes pendencias-v3.
- `.planning/phases/8.1-realinhamento-pixel-perfect-grades/` — flat table pattern (DataGrid→native) + widths pixel-perfect das listagens (Nome/Obs/Modalidade/Grupo/Componentes/FC/IC/Custo/Data/Status/Obs).

### Regras de produto e arquitetura

- `AGENTS.md` — stack obrigatoria (Next.js 15, React 19, Prisma, Postgres self-hosted), dominio canonico (item mestre + ficha recursiva), restricoes self-hosted.
- `docs/adr/001-modular-monolith.md` — decisao de monolito modular (catalog, engineering, import modules).
- `docs/domain/er-model.md` — entidades centrais, invariantes relacionais (Item ↔ ItemCompra ↔ UnidadeMedida ↔ Fornecedor; Ficha ↔ FichaEtapa ↔ FichaComponente).

### Codebase maps (Phase 7/8 deliverables)

- `.planning/codebase/STACK.md` — Next.js 15 App Router, Prisma, MUI, Playwright.
- `.planning/codebase/ARCHITECTURE.md` — modular monolith, server actions + Zod.
- `.planning/codebase/CONVENTIONS.md` — patterns para form + derivation + TDD.
- `.planning/codebase/TESTING.md` — Jest unit + Playwright E2E workers=1 Windows; subset estavel.
- `.planning/codebase/CONCERNS.md` — SESSION_SECRET resolvido, dual-path Prisma/demo.

### Arquivos atuais mais impactados (Phase 9 alvos)

- `src/modules/catalog/ui/item-form.tsx` — Bloco 1 + 3; drop `description` dos FormSection (D-13). Linhas 113-117, 217, 235.
- `src/modules/catalog/ui/purchases-editor.tsx` — validar placeholders Fornecedor 2+ (D-15). Preservar derivacao Phase 8.
- `src/modules/engineering/ui/ficha-form.tsx` — refactor Identificacao Row 1 (110/1fr/150/175) + Row 2 (1fr/1fr/120/1fr); Finalizacao 2-col 50/50 opcional; Custo atual box azul (D-01..D-04 + D-08).
- `src/modules/engineering/server/engineering-actions.ts` — Zod preparationMode: string().default('') (D-10).
- `src/app/(app)/itens/[itemId]/page.tsx` + `src/app/(app)/itens/novo/page.tsx` — topbar pixel-perfect hex + badge ativo/inativo verde/cinza (D-14 + D-16).
- `src/app/(app)/fichas/[fichaId]/page.tsx` + `src/app/(app)/fichas/nova/page.tsx` — topbar Duplicar + Exportar btn-icon (D-05), badge ativa + subtitulo (D-06).
- `src/components/ui/FormSection.tsx` — possivel refactor minor para aceitar `description?: string | undefined` nao renderizado (D-13).
- `prisma/schema.prisma` — auditoria contra HTML (D-09); migration so se gap real (D-12).
- `tests/e2e/pixel-perfect-phase8.spec.ts` — estender com describe('item detail') + describe('ficha detail') (D-17).

### Testes existentes a manter verdes

- `src/modules/engineering/ui/ficha-form.test.tsx` — refactor D-01 atualiza com RED guard novo.
- `src/modules/engineering/ui/components-editor.test.tsx` — nao deve ser afetado (fora do escopo Identificacao).
- `src/modules/catalog/ui/item-form.test.tsx` — D-13 FormSection description drop pode quebrar — adaptar.
- `src/modules/catalog/ui/purchases-editor.test.tsx` — nao deve ser afetado (D-15 valida placeholders existentes).
- `tests/e2e/engineering-flow.spec.ts`, `tests/e2e/importacao.spec.ts` — gates apos cada plano (D-20).
- `tests/e2e/pixel-perfect-phase8.spec.ts` — estendido em D-17 sem quebrar existentes (26 PASS atuais preservados).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **FormSection** (`src/components/ui/FormSection.tsx`): componente compartilhado usado em item-form e ficha-form. Refactor minor em D-13 para aceitar description opcional.
- **PurchasesEditor** (Phase 8 D-11): ja renderiza Fornecedor 1 Principal + N adicionais com badges fixado, derivacao client-side, toggle principal, validacao. D-15 so valida placeholders — zero refactor.
- **FichaFlatGrid** (Phase 8 D-13): grade inline 8 colunas `22px 1fr 80px 60px 240px 90px 96px 28px` + CF_GRID_TEMPLATE `22px auto 120px 110px 90px 1fr 28px`. **Nao mexer** — Phase 9 nao toca Estrutura.
- **TotaisIndicadores** (Quadro Final): Phase 8 D-14 fechou NaN/null guards. **Nao mexer** em Phase 9.
- **ComponentsEditor** (Phase 8 D-13): inclui SimilarFichasBanner (PDFV2-FICHA-07). **Nao mexer**.
- **Pixel-perfect spec helpers** (Phase 8 D-15 / 08-07): file:// URL load + CSS rule extraction + tolerance +/- 4px. Template aplicavel direto a detail pages (D-17).
- **Box sx grid-template-columns pattern** (Phase 8 D-09 / `item-form.tsx:118-203`): solucao canonica para layouts pixel-perfect. **Aplicar no refactor Ficha Identificacao (D-01)**.
- **Label como ReactNode com marcador inline** (Phase 8 D-15 / `item-form.tsx:223-233`): `<>Descricao operacional <span>(opcional)</span></>`. **Aplicar no Finalizacao D-08**.

### Established Patterns

- **TDD RED→GREEN com commits separados** (Phase 8 D-16, 08-01..08-07 executions): garante cobertura de contrato novo. Aplicar em 09-03 (D-04).
- **Pixel-perfect via contract-check Playwright** (Phase 8 D-15): file:// load + CSS extraction + tolerance. Estender em 09-05 (D-17).
- **Dual-path Prisma/demo repositories** (`.planning/codebase/CONCERNS.md`): Phase 9 so altera Zod (D-10); repositorios intactos.
- **Wave-based ordering com blast radius crescente** (Phase 8 D-19): Wave 1 audit, Wave 2 paralelo UI, Wave 3 testes. Aplicar em 09 (D-18).
- **VERIFICATION.md checklist pixel-perfect** (Phase 8 D-15): Phase 9 adiciona secao Item detail + Ficha detail + Schema audit.
- **Release via git tag + commit SHA, sem ZIP** (Phase 8-07 user scope change 2026-04-17): padrao para entregas Phase 9+. Release notes registram tag + SHA + 4 screenshots comparativos (app vs HTML).

### Integration Points

- **`ficha-form.tsx` \u2194 `components-editor.tsx`**: Phase 9 refactora o primeiro (Identificacao + Finalizacao), preserva o segundo. `<ComponentsEditor>` continua recebendo mesmas props (D-18 plano 09-03 gate).
- **`item-form.tsx` \u2194 `purchases-editor.tsx`**: Phase 9 so ajusta FormSection wrapper no pai (D-13); filho intacto.
- **page.tsx (Item e Ficha) \u2194 TopBar component**: Phase 9 adiciona btn-icon Duplicar/Exportar no Ficha (D-05) + ajusta tokens Item (D-14). Refactor minor em TopBar se necessario para suportar `extraActions?: ReactNode` prop.
- **Zod engineering-actions \u2194 FormState**: D-10 relaxa preparationMode — valida que `useActionState` nao expecta erro obrigatorio.
- **`pixel-perfect-phase8.spec.ts` \u2194 update/*.html**: D-17 estende sem quebrar existentes. Novo describes sao aditivos.

</code_context>

<specifics>
## Specific Ideas

- Phase 8.1 ja provou que HTML-like flat tables (substituindo DataGrid) funcionam bem para listagens. Aplicar o **mesmo principio** em Ficha Identificacao: substituir MUI Grid por Box sx com grid-template-columns literal (D-01) — **nao** migrar para `<input>` nativo (D-02), que seria um passo agressivo demais fora do escopo de pixel-perfect.
- Phase 8 D-09 no item-form.tsx ja usa `gridTemplateColumns: '140px 1fr 160px'` e `'1fr 1fr'` — replicar o padrao exato no ficha-form.tsx (D-01) da coesao de estilo entre as duas telas.
- Duplicar e Exportar no topbar da Ficha (D-05) sao a unica adicao **nova** visualmente — todos os outros ajustes sao refactor/polimento. Nao ter handler funcional evita escopo-creep para roadmap v2 PDF export.
- Version badge V{n} (D-07) ilustra trade-off entre HTML literal e aceitacao do cliente: o HTML v2 nao inclui, mas pendencias-v3 #14 foi aceito com V{n} visivel. **Nao regredir acceptance ganho** prevalece sobre "HTML diz nao".
- Schema audit formal (D-09) com zero migration esperada mas checklist obrigatorio e forma de **satisfazer goal #2 ('todos os campos nos HTMLs existem no schema')** sem forcar trabalho desnecessario.
- Placeholders do HTML em /novo (D-15) sao detalhe pequeno mas visivel — e a primeira tela que um usuario ve criando item; importa para UX (e nao custa quase nada).

</specifics>

<deferred>
## Deferred Ideas

- Handler real de **Duplicar ficha** — criar Phase 10 ou ticket separado (server action saveFicha com id novo + copy stages + copy components).
- Handler real de **Exportar ficha** — PDF export (PDFV2-FUT-01, roadmap v2). Nao implementar em Phase 9.
- **Mover V{n}** para dentro do Quadro Final como `.ver-badge` gold (HTML linha 139) — conflita com pendencias-v3 #14; reabrir so se cliente pedir explicitamente.
- **Substituir FormSection por `<Box className="card">`** em toda a app — blast radius alto (3 Item + 3 Ficha + outros cards em Cadastros e Import). Phase 10+ candidato a refactor design system.
- **Trigger auto-update de ItemCompra.priceUpdatedAt** quando preco/qtde mudarem — fora de escopo; pode ser requisito futuro de rastreabilidade.
- **Migrar todos os inputs para native** (substituir MUI TextField por `<input>`) — fidelidade maxima mas blast radius massivo + acessibilidade + testes. Roadmap v2 se cliente pedir.
- **Screenshot diff automatizado (Playwright visual regression)** contra os HTMLs — alto custo de setup + baselines; Phase 8 Deferred ja mencionou; mantido.
- **Drop fisico das colunas legadas** `item.unidade_uso_padrao_id` / `item.unidade_estoque_id` (Phase 8 D-03) — fase posterior apos estabilizacao em producao.
- **Renomear `ItemCompra` para `ItemFornecedor`** (Phase 8 D-01) — refactor futuro grande.

### Reviewed Todos (not folded)

(Nenhum todo cross-referenced — backlog parking lot nao surfou matches para Phase 9.)

</deferred>

---

*Phase: 09-detalhe-item-ficha-pixel-perfect*
*Context gathered: 2026-04-19 via /gsd-discuss-phase 9 (5 areas interativas)*
