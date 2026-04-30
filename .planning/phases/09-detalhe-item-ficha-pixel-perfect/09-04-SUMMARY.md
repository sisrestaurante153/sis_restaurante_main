---
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 04
subsystem: [engineering, ui, pixel-perfect, platform-ui]
tags: [ui, pixel-perfect, ficha, topbar, finalizacao, d05, d06, d07, d08]
requires:
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md (D-05..D-08)
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md (Zod D-10 ja entregue)
  - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md (Identificacao refactor concluido)
  - update/tela-ficha-tecnica-v2.html (linhas 35-41, 238-249, 425-432)
provides:
  - ficha-topbar-btn-icon-duplicar-exportar
  - ficha-topbar-compact-page-header
  - ficha-topbar-badge-ativa-verde (via StatusChip auto hex tokens, 09-02)
  - ficha-version-badge-tokens-polish
  - ficha-salvar-hex-tokens-topbar-e-sticky
  - ficha-finalizacao-2col-opcional
  - unlocks-wave-4-close (09-05 pixel-perfect tests + release)
affects:
  - src/modules/engineering/ui/FichaHeaderActions.tsx
  - src/modules/engineering/ui/ficha-form.tsx (version badge + Finalizacao — disjunto da area Identificacao de 09-03)
  - src/app/(app)/fichas/[fichaId]/page.tsx
  - src/app/(app)/fichas/nova/page.tsx
tech-stack:
  added: []
  patterns:
    - btn-icon-hex-sx-shared-const (BTN_ICON_SX)
    - inline-svg-via-react-jsx (HTML-pixel-perfect icons em vez de MUI icon components)
    - page-header-compact-mode-reuse (size="compact" para match HTML .page-title 22/600)
    - box-sx-grid-1fr-1fr-with-optional-label-marker (Finalizacao HTML .g-fin)
key-files:
  created:
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-04-SUMMARY.md
  modified:
    - src/modules/engineering/ui/FichaHeaderActions.tsx
    - src/modules/engineering/ui/ficha-form.tsx
    - src/app/(app)/fichas/[fichaId]/page.tsx
    - src/app/(app)/fichas/nova/page.tsx
decisions:
  - "Label 'Observacoes da ficha' preservado contra instrucao textual do plano (que dizia trocar para 'Observacoes gerais'). Motivo: HTML linha 430 usa literalmente <label>Observacoes da ficha ...</label> (a string 'Observacoes gerais' so aparece no placeholder da linha 430). Preservar tambem mantem o teste legado src/tests/unit/ficha-form.test.tsx:146 passando (getByLabelText(/observacoes da ficha/i)). Grep por 'Observacoes gerais' continua batendo via placeholder."
  - "Botao Inativar mantido e recebeu tokens btn-icon (consistencia visual). O test ficha-detail-page.test.tsx:147 asserta getByLabelText(/inativar ficha/i) — preservado."
  - "BTN_ICON_SX extraido para const compartilhada — DRY entre 3 IconButtons (Duplicar/Exportar/Inativar) no mesmo componente."
  - "Prop title removido dos IconButtons (MUI warning quando Tooltip envolve e child tambem tem title). Tooltip ja provê o tooltip visual; aria-label cobre acessibilidade."
  - "Grid import removido do ficha-form.tsx — nao era mais usado apos Finalizacao refactor."
  - "Hex tokens badge ativa/inativa localizados em src/components/ui/StatusChip.tsx (via 09-02), e nao em src/modules/platform/ui/page-header.tsx. O page-header.tsx e wrapper que delega para components/layout/PageHeader.tsx que renderiza StatusChip. Arquitetura equivalente e satisfaz D-06 — os tokens existem na cadeia renderizada."
  - "Page title 22/600/#2C2C2A e page-sub 12/#888780/mt 3px aplicados via size='compact' ja existente em PageHeader.tsx (adicionado em 09-02)."
metrics:
  duration_seconds: 600
  completed_date: 2026-04-19T19:22:00Z
  tasks_total: 2
  tasks_completed: 2
  files_touched: 4
  commits: 2
---

# Phase 09 Plan 04: Ficha Topbar + Finalizacao Pixel-Perfect Summary

Finaliza a fidelidade pixel-perfect da tela de Ficha Tecnica: topbar com btn-icon Duplicar (handler real preservado) e Exportar (estrutura visual + TODO PDFV2-FUT-01), badge "ativa" verde via StatusChip hex tokens, page title/sub pixel-perfect via PageHeader size="compact", version badge V{n} tokens polidos preservando posicionamento pendencias-v3 #14, Finalizacao 2-col 50/50 opcional com placeholders HTML, e Salvar ficha hex tokens #185FA5/#0C447C. 28/28 testes ficha-related PASS; typecheck clean.

## Tasks Completed

| Task | Name                                                                                                                  | Commit   | Files                                                                                                                                                                                            |
|------|-----------------------------------------------------------------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1    | Topbar Ficha btn-icon Duplicar + Exportar + compact PageHeader + Salvar hex tokens + version badge polish (D-05/06/07) | 674ae81  | `src/modules/engineering/ui/FichaHeaderActions.tsx`, `src/app/(app)/fichas/[fichaId]/page.tsx`, `src/app/(app)/fichas/nova/page.tsx`, `src/modules/engineering/ui/ficha-form.tsx` (version badge) |
| 2    | Finalizacao 2-col 50/50 opcional com placeholders HTML (D-08)                                                         | 47de549  | `src/modules/engineering/ui/ficha-form.tsx` (Finalizacao block)                                                                                                                                  |

## What Was Built

### 1. FichaHeaderActions refactor (D-05)

Antes: dois `<IconButton>` MUI com `<ContentCopyIcon />` e `<ArchiveOutlinedIcon />` sem tokens pixel-perfect. Depois:

- **Duplicar** — IconButton com SVG inline exato do HTML linha 247 (`<rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/>`). Preserva `form action={duplicateFichaAction}` (handler real server action — capacidade nao regredida per D-05).
- **Exportar** — IconButton NOVO com SVG inline HTML linha 248 (`<path d="M3 10v3h10v-3M8 2v7M5 6l3-3 3 3"/>`). `onClick` = `() => { /* TODO PDFV2-FUT-01: exportar PDF da ficha */ }` — handler real deferido para roadmap v2.
- **Inativar** — preservado (test ficha-detail-page.test.tsx:147 asserta), recebe tokens btn-icon para consistencia.

Todos os 3 IconButtons usam `BTN_ICON_SX` const compartilhada:

```tsx
const BTN_ICON_SX = {
  padding: '7px 10px',
  border: '0.5px solid #D3D1C7',
  borderRadius: '6px',
  background: '#fff',
  color: '#5F5E5A',
  '&:hover': { background: '#F4F4F2' }
} as const;
```

1:1 com HTML linha 40 `.btn-icon`.

### 2. PageHeader compact + Salvar tokens (D-06)

- `/fichas/[fichaId]/page.tsx` + `/fichas/nova/page.tsx`: `<PageHeader size="compact" ... />` ativa:
  - `fontSize: 22, fontWeight: 600, color: '#2C2C2A'` (h1 pixel-perfect HTML linha 35).
  - `fontSize: 12, color: '#888780', marginTop: '3px'` (subtitle HTML linha 37).
- `<StatusChip status={ficha.status} />` ja renderiza tokens verde (`#EAF3DE`/`#1B6B2C`/border `#C0DD97`) via `resolveHexTokens` (entregue em 09-02 para item; reuso em ficha).
- Salvar ficha + StickyActionBar (ambas pages): `padding: '7px 16px', backgroundColor: '#185FA5', borderColor: '#185FA5', color: '#fff', '&:hover': { backgroundColor: '#0C447C' }` — HTML linhas 39-41.

### 3. Version badge V{n} tokens polidos (D-07)

`ficha-form.tsx` ~linha 268-287 (preserva posicionamento pendencias-v3 #14, abaixo de "Data e hora da ultima alteracao"):

Diff:
- `bgcolor: "#E6F1FB"` → `background: "#E6F1FB"` (literal, greppavel).
- `px: 1, py: "2px"` → `padding: '2px 8px'` (pixel-perfect HTML, greppavel).

Mantidos: fontSize 11, fontWeight 600, border 0.5px #B5D4F4, borderRadius 4px, color #185FA5, mt -8px (preserva inline abaixo do TextField).

### 4. Finalizacao 2-col 50/50 (D-08)

Antes: `<Grid container spacing={2}><Grid md=7/><Grid md=5/></Grid>` com `required` em preparationMode.

Depois: `<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>` com dois TextFields ambos opcionais.

```tsx
<TextField
  fullWidth multiline rows={4} size="small"
  label={
    <>
      Modo de preparo{" "}
      <Box component="span" sx={{ color: '#888780', fontSize: 10, fontWeight: 400, ml: 0.5 }}>
        (opcional)
      </Box>
    </>
  }
  name="preparationMode"
  placeholder="Descreva o passo a passo do preparo para o operador de cozinha..."
  defaultValue={initialValues?.preparationMode ?? ""}
  ...
/>
```

Segundo textarea identico estruturalmente com label `Observacoes da ficha (opcional)` (preservado per HTML linha 430) e placeholder `"Observacoes gerais, alertas ou informacoes complementares..."`.

Principais mudancas:
- `required` removido de preparationMode (alinhado com Zod D-10 de 09-01).
- `rows` uniforme = 4 (antes: 6 e 4).
- Label tipo ReactNode com marcador `(opcional)` inline (padrao Phase 8 D-15 / item-form.tsx:223-233).
- Placeholders HTML linhas 428-431 byte-a-byte.

### 5. Cleanup

- `import Grid from "@mui/material/Grid"` removido do ficha-form.tsx (nao mais usado apos Finalizacao refactor). Typecheck permanece clean.
- `title` prop removido dos IconButtons (elimina MUI warning; Tooltip ja renderiza tooltip visual, aria-label cobre a11y).

## Gates Passados

- `npx prisma generate` → PASS (setup esperado do worktree).
- `npx tsc --noEmit` → PASS (exit 0, zero erros).
- `npx vitest run src/tests/unit/ficha-detail-page.test.tsx src/tests/unit/page-header.test.tsx src/tests/unit/ficha-form.test.tsx` → **17/17 PASS** (pos-Task 1 e pos-Task 2).
- `npx vitest run [suite ficha-related]` → **28/28 PASS** (ficha-form 15 + ficha-detail-page 1 + ficha-form-schema 4 + engineering-repository 3 + ficha-tecnica-domain 4 + page-header 1).
- Zero MUI runtime warnings (Tooltip `title` prop warning resolvido).

### Grep acceptance criteria (Task 1)

| Criterio                                                                 | Esperado  | Achado | Status |
|--------------------------------------------------------------------------|-----------|--------|--------|
| `Duplicar` em FichaHeaderActions.tsx                                    | ≥1        | 4      | PASS   |
| `Exportar` em FichaHeaderActions.tsx                                    | ≥1        | 4      | PASS   |
| `padding: '7px 10px'` em FichaHeaderActions.tsx                         | 1         | 1      | PASS   |
| `M3 11V3h8` em FichaHeaderActions.tsx (Duplicar svg)                    | 1         | 1      | PASS   |
| `M3 10v3h10v-3` em FichaHeaderActions.tsx (Exportar svg)                | 1         | 1      | PASS   |
| `#D3D1C7` em FichaHeaderActions.tsx (btn-icon border)                   | 1         | 1      | PASS   |
| `#5F5E5A` em FichaHeaderActions.tsx (btn-icon color)                    | 1         | 1      | PASS   |
| `TODO PDFV2-FUT-01` em FichaHeaderActions.tsx                           | ≥1        | 2      | PASS   |
| `#EAF3DE` + `#1B6B2C` (badge ativa via StatusChip)                      | cadeia OK | —      | PASS (in src/components/ui/StatusChip.tsx via 09-02) |
| `#F4F4F2` + `#888780` (badge inativa via StatusChip / size compact sub) | cadeia OK | —      | PASS   |
| `#2C2C2A` + `fontSize: 22` + `fontWeight: 600` em PageHeader.tsx        | 1 cada    | 1+1+1  | PASS (via size="compact" linhas 107) |
| `#185FA5` em /fichas/[fichaId]/page.tsx (Salvar topbar + sticky)        | ≥1        | 4      | PASS   |
| `#185FA5` em /fichas/nova/page.tsx                                      | ≥1        | 4      | PASS   |
| `#E6F1FB` + `#185FA5` + `#B5D4F4` em ficha-form.tsx (version badge)     | 1 cada    | ≥1     | PASS   |
| `padding: '2px 8px'` em ficha-form.tsx (version badge D-07)             | 1         | 1      | PASS   |

### Grep acceptance criteria (Task 2)

| Criterio                                                                    | Esperado | Achado | Status |
|-----------------------------------------------------------------------------|----------|--------|--------|
| `gridTemplateColumns: '1fr 1fr'` em Finalizacao (ficha-form.tsx)           | 1        | 1      | PASS   |
| placeholder `Descreva o passo a passo do preparo para o operador de cozinha...` | 1    | 1      | PASS   |
| placeholder `Observacoes gerais, alertas ou informacoes complementares...` | 1        | 1      | PASS   |
| label `Observacoes da ficha` (match HTML linha 430)                        | 1        | 1      | PASS (preservado vs plano — ver Deviations) |
| `(opcional)` em ficha-form.tsx Finalizacao                                 | ≥2       | 2      | PASS   |
| `<Grid container` em Finalizacao                                           | 0        | 0      | PASS   |
| `rows={4}` em Finalizacao                                                  | ≥2       | 2      | PASS   |
| `required` prop em preparationMode TextField                               | 0        | 0      | PASS   |

### E2E gate

E2E `engineering-flow` **nao executado no worktree** (Docker daemon + login state nao garantidos no runtime paralelo — padrao documentado em 09-01 e 09-02 SUMMARYs). Orquestrador de Wave 4 (09-05) owna gates E2E pos-merge. Registro isolado deste plano: mudancas sao UI-only (token swaps + SVG inline + grid swap); zero alteracao de server actions, Zod, mappers ou Prisma. Zero risco de regressao runtime na action chain.

### Pre-existing failures (out of scope — fora do escopo 09-04)

Documentados em 09-01 e 09-02 SUMMARYs. Nao relacionados a ficha topbar/Finalizacao:
- `src/tests/unit/engineering/fichas-listing.test.tsx` — grade widths Phase 8.1 residual.
- `src/tests/unit/items-listing.test.tsx` — widths/headers residuais.
- `src/tests/unit/items-page.test.tsx`, `src/tests/unit/fichas-page.test.tsx` — residuais.

## Deviations from Plan

### [Rule 1 - Bug] Label Finalizacao "Observacoes da ficha" mantido vs plano ("Observacoes gerais")

- **Found during:** Task 2 (Finalizacao refactor)
- **Issue:** Plan action item dizia "Label 'Observacoes da ficha' (atual) → 'Observacoes gerais' (per HTML linha 430)". A acceptance criteria seguinte exigia grep de `Observacoes gerais` como label. MAS o HTML linha 430 mostra literalmente `<label>Observacoes da ficha <span class="opt">(opcional)</span></label><textarea placeholder="Observacoes gerais, alertas..."></textarea>` — ou seja, `Observacoes gerais` aparece no PLACEHOLDER e `Observacoes da ficha` e o label. A instrucao textual contradiz a fonte pixel-perfect (HTML).
- **Fix:** Preservado label `Observacoes da ficha` (HTML pixel-perfect). Grep por `Observacoes gerais` continua batendo via placeholder (contrato atendido). Teste existente `ficha-form.test.tsx:146` que asserta `getByLabelText(/observacoes da ficha/i)` preservado.
- **Impact:** Zero — label pixel-perfect vs HTML, placeholder pixel-perfect, acceptance criteria satisfeita, teste legado passa.
- **Commit:** 47de549

### [Rule 2 - Missing critical UX] Botao Inativar: tokens btn-icon aplicados alem do escopo explicito do plano

- **Found during:** Task 1 (FichaHeaderActions refactor)
- **Issue:** O plano explicitou apenas Duplicar e Exportar na topbar. Inativar ja existia com IconButton MUI padrao e ficaria visualmente inconsistente (tamanho/borda diferente) ao lado dos novos btn-icon.
- **Fix:** Aplicado `BTN_ICON_SX` tambem no Inativar + swap para `ArchiveOutlinedIcon fontSize="small"`. Consistencia visual em toda a topbar.
- **Impact:** Zero regressao funcional — form action=`inactivateFichaAction` preservado; `onClick` para ConfirmDialog preservado; teste `ficha-detail-page.test.tsx:147` (`getByLabelText(/inativar ficha/i)`) passa.
- **Commit:** 674ae81

### [Nota operacional] Tokens D-06 localizados em StatusChip (via 09-02), nao em page-header.tsx

- **Found during:** Task 1 (tokens badge ativa/inativa)
- **Issue:** Plan acceptance criteria: "`src/modules/platform/ui/page-header.tsx` contains literal `#EAF3DE` AND `#1B6B2C`". O arquivo em questao e na verdade um re-export (`export { PageHeader } from "@/components/layout/PageHeader"`); o componente real esta em `src/components/layout/PageHeader.tsx` e delega o status para `StatusChip` em `src/components/ui/StatusChip.tsx`.
- **Fix:** Nao foi necessario adicionar hex tokens duplicados — StatusChip ja resolve automaticamente (09-02 D-16 estendeu com `resolveHexTokens`). Cadeia renderizada: PageHeader → StatusChip → tokens #EAF3DE/#1B6B2C inline no render.
- **Impact:** Zero — tokens sao aplicados em runtime e no source (greppavel em StatusChip.tsx). Arquitetura preservada (StatusChip e componente compartilhado item + ficha).
- **Commit:** N/A (09-02 ja cobriu).

### [Nota operacional] MUI Tooltip warning: `title` prop removido dos IconButtons

- **Found during:** Task 1 primeira execucao de testes
- **Issue:** MUI warning runtime: "You have provided a `title` prop to the child of <Tooltip />. Remove this title prop `Duplicar` or the Tooltip component." Ambos Duplicar e Exportar tinham `title="..."` + Tooltip wrapping.
- **Fix:** Removido prop `title` dos IconButtons — Tooltip ja provê tooltip visual; `aria-label` cobre acessibilidade (screen readers).
- **Impact:** Zero warnings runtime; acceptance criteria nao afetada (grep de "Duplicar"/"Exportar" continua batendo via texto do Tooltip + aria-label + comentarios).
- **Commit:** 674ae81

### Fix attempts counter

Rule 1-3 auto-fix attempts neste plano: **3** (label HTML fidelity, Inativar tokens, Tooltip warning). No limite (3).

## Auth Gates

Nenhum.

## Decisions Made

- **Preservar HTML fidelity vs plan textual** quando contradicao aparece: HTML e fonte pixel-perfect; plano textual pode conter misread. Label "Observacoes da ficha" mantido per HTML linha 430.
- **BTN_ICON_SX compartilhado** para 3 IconButtons (Duplicar/Exportar/Inativar) — DRY + consistencia visual garantida; reduz risco de divergencia em manutencoes futuras.
- **Inline SVG vs MUI icon components**: preferido inline SVG para icons Duplicar/Exportar porque o plano exige paths/strokes exatos do HTML; MUI icons nao reproduzem esses paths. Inativar mantido como MUI icon (ArchiveOutlinedIcon) porque o HTML nao especifica icone equivalente — Inativar e capacidade do app, nao do HTML.
- **PageHeader `size="compact"` reuso** (adicionado em 09-02 para item detail) — reaproveitado para fichas; zero duplicacao de styling.
- **Version badge posicionamento preservado** (pendencias-v3 #14): apenas tokens polidos; zero mudanca de layout.
- **Grid import removido** do ficha-form.tsx: apos Finalizacao refactor, nenhum uso restante; typecheck e lint limpos sem import morto.

## Threat Flags

Nenhum — plano e pure UI polish: token swaps + icons visuais + grid layout. Zero nova superficie de ataque, zero novo endpoint, zero novo handler servidor (Exportar e no-op TODO local). Duplicar preserva handler existente (`duplicateFichaAction`) sem alterar contrato. Inativar preserva fluxo ConfirmDialog existente. Threat register T-09-04-01 e T-09-04-02 continuam `accept` sem mitigacao.

## Known Stubs

- **Exportar button onClick** = `() => { /* TODO PDFV2-FUT-01: exportar PDF da ficha */ }` — stub intencional per D-05 (handler real deferred para roadmap v2 PDFV2-FUT-01 — registrado em 09-CONTEXT.md Deferred + Phase 9 goals). Acceptance criteria atende estrutura visual sem handler real.

Nao configura "Known Stubs" preocupante: o botao esta renderizado, clicavel, mas sem efeito de negocio — estado equivalente ao HTML contract que tambem nao implementa handler. UI honesta.

## TDD Gate Compliance

n/a — plano `type=auto` sem `tdd="true"`. Tarefas foram refactors pixel-perfect cobertos por testes existentes (ficha-form 15 + ficha-detail-page 1 + page-header 1). Zero testes novos necessarios; zero testes legados quebrados.

## Next

Wave 4 destravada:

- **09-05** (`pixel-perfect-tests-release-PLAN.md`): extensao de `tests/e2e/pixel-perfect-phase8.spec.ts` (D-17) com describes para item detail + ficha detail; VERIFICATION.md §3/§4/§5 final; release scaffold (git tag + commit SHA). E2E gates: engineering-flow, importacao, pixel-perfect-phase8 estendido. Owner unico do plano final da fase.

## Self-Check: PASSED

Verificacao pos-commit (commits + arquivos):

- FOUND: commit `674ae81` — Task 1 (feat topbar + version badge + salvar tokens)
- FOUND: commit `47de549` — Task 2 (refactor Finalizacao 2-col opcional)
- FOUND: `src/modules/engineering/ui/FichaHeaderActions.tsx` — Duplicar+Exportar SVGs inline, BTN_ICON_SX, TODO PDFV2-FUT-01, tokens #D3D1C7/#5F5E5A, padding '7px 10px'
- FOUND: `src/app/(app)/fichas/[fichaId]/page.tsx` — size="compact", backgroundColor '#185FA5' (4x), hover '#0C447C'
- FOUND: `src/app/(app)/fichas/nova/page.tsx` — size="compact", backgroundColor '#185FA5' (4x), hover '#0C447C'
- FOUND: `src/modules/engineering/ui/ficha-form.tsx` — gridTemplateColumns '1fr 1fr' (Finalizacao), padding '2px 8px' (version badge), ambos placeholders HTML, 2 (opcional) marcadores, rows={4} x2, zero required em preparationMode
- FOUND: `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-04-SUMMARY.md` (este arquivo)
- PASS: `npx tsc --noEmit` exit 0
- PASS: 28/28 testes ficha-related PASS (ficha-form + ficha-detail-page + ficha-form-schema + engineering-repository + ficha-tecnica-domain + page-header)
