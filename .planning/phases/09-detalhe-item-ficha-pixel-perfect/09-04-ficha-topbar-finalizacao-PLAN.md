---
plan_id: 09-04
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 04
type: execute
wave: 3
depends_on: [09-01, 09-03]
files_modified:
  - src/app/(app)/fichas/[fichaId]/page.tsx
  - src/app/(app)/fichas/nova/page.tsx
  - src/modules/engineering/ui/ficha-form.tsx
  - src/modules/engineering/ui/FichaHeaderActions.tsx
  - src/modules/platform/ui/page-header.tsx
autonomous: true
requirements:
  - SPEC-4-TELAS-ESTRITO
  - SPEC-FICHA-FIDELIDADE
tags: [ui, pixel-perfect, ficha, topbar, finalizacao]

must_haves:
  truths:
    - "Topbar Ficha exibe btn-icon Duplicar + btn-icon Exportar com SVGs exatos do HTML (estrutura visual, handler Exportar em TODO)"
    - "btn-icon tokens: padding '7px 10px', border '0.5px solid #D3D1C7', borderRadius '6px', background #fff, color #5F5E5A"
    - "Badge 'ativa' inline no page title usa tokens #EAF3DE bg, #1B6B2C text, fontSize 11, fontWeight 500, borderRadius 20px"
    - "Finalizacao usa Box sx grid 2-col 50/50 (1fr 1fr); ambos campos marcados '(opcional)'"
    - "Version badge V{n} mantem posicionamento pendencias-v3 #14 com tokens polidos (#E6F1FB / #185FA5 / #B5D4F4)"
  artifacts:
    - path: "src/app/(app)/fichas/[fichaId]/page.tsx"
      provides: "Topbar com btn-icon Duplicar/Exportar + badge ativa + tokens hex"
      contains: "Duplicar"
    - path: "src/modules/engineering/ui/ficha-form.tsx"
      provides: "Finalizacao 2-col 50/50 opcional com placeholders HTML"
      contains: "gridTemplateColumns: '1fr 1fr'"
  key_links:
    - from: "src/app/(app)/fichas/[fichaId]/page.tsx"
      to: "FichaHeaderActions"
      via: "extraActions render"
      pattern: "FichaHeaderActions"
---

<objective>
Topbar Ficha com btn-icon Duplicar + Exportar (estrutura visual sem handler real, per D-05); badge "ativa" inline pixel-perfect (D-06); version badge V{n} tokens polidos preservando posicionamento pendencias-v3 #14 (D-07); Finalizacao 2-col 50/50 opcional com placeholders HTML (D-08).

Purpose: Fechar SPEC-FICHA-FIDELIDADE + SPEC-4-TELAS-ESTRITO para topbar e Finalizacao; entregar estrutura visual dos btn-icon sem handler real (Exportar = PDFV2-FUT-01 roadmap v2).
Output: /fichas/[id]/page.tsx + /fichas/nova/page.tsx com topbar alinhado ao HTML; ficha-form.tsx Finalizacao refactorada 2-col 50/50; version badge polido; Zod preparationMode opcional ja coberto em 09-01 (D-10).

**Wave 3 sequencial apos 09-03:** ambos editam `src/modules/engineering/ui/ficha-form.tsx` (09-03 no bloco Identificacao, 09-04 na Finalizacao + version badge). Para evitar colisao de arquivo em execucao paralela, 09-04 depende explicitamente de 09-03 (alem de 09-01).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md
@.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md
@update/tela-ficha-tecnica-v2.html
@src/app/(app)/fichas/[fichaId]/page.tsx
@src/app/(app)/fichas/nova/page.tsx
@src/modules/engineering/ui/ficha-form.tsx
@src/modules/engineering/ui/FichaHeaderActions.tsx
@src/modules/platform/ui/page-header.tsx
@src/modules/catalog/ui/item-form.tsx

<interfaces>
HTML topbar Ficha (linhas 238-249): h1.page-title + span.badge "ativa" + p.page-sub + btn-icon x2 + btn-primary.

HTML tokens:
- .btn-icon (linha 40): padding 7px 10px; border 0.5px solid #D3D1C7; background #fff; borderRadius 6px; color #5F5E5A
- .badge (linha 36): padding 2px 9px; borderRadius 20px; background #EAF3DE; color #1B6B2C; fontSize 11; fontWeight 500
- .page-title (linha 35): fontSize 22; fontWeight 600; color #2C2C2A
- .page-sub (linha 37): fontSize 12; color #888780; marginTop 3px

SVG Duplicar (HTML linha 247): width=16 height=16 viewBox="0 0 16 16" fill=none stroke=currentColor strokeWidth=1.5 — children: rect x=5 y=5 width=8 height=8 rx=1.5 + path d="M3 11V3h8"

SVG Exportar (HTML linha 248): mesmos attrs — child path d="M3 10v3h10v-3M8 2v7M5 6l3-3 3 3"

HTML Finalizacao .g-fin (linha 119 CSS + 425-432 markup): gridTemplateColumns "1fr 1fr" — 2 textareas, labels "Modo de preparo (opcional)" e "Observacoes gerais (opcional)".

Placeholders Finalizacao (HTML linhas 428-431):
"Descreva o passo a passo do preparo para o operador de cozinha..."
"Observacoes gerais, alertas ou informacoes complementares..."

Current FichaHeaderActions (src/modules/engineering/ui/FichaHeaderActions.tsx): verificar se ja renderiza Duplicar com handler real server action (engineering-actions.ts tem duplicateFichaAction linhas 64-80). Se sim: preservar handler real, so ajustar tokens visuais. Se nao: renderizar stub com TODO.

Current Finalizacao (ficha-form.tsx linhas 374-402): usa Grid container spacing=2 com Grid md=7 + Grid md=5 (nao 50/50). Substituir por Box sx 1fr 1fr.

**IMPORTANTE (pos-09-03):** 09-03 ja refatorou o bloco Identificacao (linhas ~230-362 pre-09-03) para Box sx grid. O version badge (linhas 250-269 pre-09-03) e Finalizacao (linhas 374-402 pre-09-03) nao foram tocados por 09-03; este plano aplica os tokens restantes. Se os numeros de linha mudaram, localize via ancora de texto (`"Versao"`, `"Finalizacao"`).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Topbar Ficha btn-icon Duplicar + Exportar + badge ativa + page title tokens (D-05, D-06, D-07)</name>
  <files>src/app/(app)/fichas/[fichaId]/page.tsx, src/app/(app)/fichas/nova/page.tsx, src/modules/engineering/ui/FichaHeaderActions.tsx, src/modules/platform/ui/page-header.tsx</files>
  <read_first>
    - src/app/(app)/fichas/[fichaId]/page.tsx linhas 34-59 (topbar actions)
    - src/app/(app)/fichas/nova/page.tsx linhas 32-53 (topbar actions)
    - src/modules/engineering/ui/FichaHeaderActions.tsx (verificar estado atual — Duplicar handler real?)
    - src/modules/engineering/server/engineering-actions.ts linhas 64-90 (duplicateFichaAction existe?)
    - src/modules/platform/ui/page-header.tsx (como status prop renderiza badge; como title/description renderizam)
    - update/tela-ficha-tecnica-v2.html linhas 35-41, 238-249
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-05, D-06
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md (para confirmar estado atual de ficha-form.tsx apos Identificacao refactor)
  </read_first>
  <action>
    1. **Abrir FichaHeaderActions.tsx.** Verificar se ja renderiza botao Duplicar com handler real (form action={duplicateFichaAction}).
       - Se SIM: preservar handler real (nao regredir capacidade); apenas ajustar estilo do IconButton para tokens btn-icon.
       - Se NAO: renderizar 2 IconButtons (Duplicar + Exportar) estilo btn-icon; handler Duplicar pode ficar em TODO comentario `() => { /* TODO Phase 10: duplicar ficha — see engineering-actions.duplicateFichaAction */ }` OU invocar action existente se presente.

    2. **Substituir/adicionar Duplicar IconButton em FichaHeaderActions.tsx:**
       Usar MUI IconButton com SVG inline exato do HTML:

       ```tsx
       <IconButton
         title="Duplicar"
         aria-label="Duplicar ficha"
         type="submit"
         form="duplicate-ficha-form"
         sx={{
           padding: '7px 10px',
           border: '0.5px solid #D3D1C7',
           borderRadius: '6px',
           background: '#fff',
           color: '#5F5E5A',
           '&:hover': { background: '#F4F4F2' }
         }}
       >
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
           <rect x="5" y="5" width="8" height="8" rx="1.5" />
           <path d="M3 11V3h8" />
         </svg>
       </IconButton>
       ```

       Se handler real ja existe via form action, preservar o wrapping form.

    3. **Adicionar Exportar IconButton em FichaHeaderActions.tsx (novo — handler em TODO):**

       ```tsx
       <IconButton
         title="Exportar"
         aria-label="Exportar ficha"
         onClick={() => { /* TODO PDFV2-FUT-01: exportar PDF da ficha */ }}
         sx={{
           padding: '7px 10px',
           border: '0.5px solid #D3D1C7',
           borderRadius: '6px',
           background: '#fff',
           color: '#5F5E5A',
           '&:hover': { background: '#F4F4F2' }
         }}
       >
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
           <path d="M3 10v3h10v-3M8 2v7M5 6l3-3 3 3" />
         </svg>
       </IconButton>
       ```

    4. **Ajustar page-header.tsx para badge "ativa" pixel-perfect (D-06):**
       Localizar onde `status` prop renderiza Chip/badge. Ajustar:
       - Se status match "ativa" OR "ativo": sx `{ background: '#EAF3DE', color: '#1B6B2C', fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: '20px', border: '0.5px solid #C0DD97' }`.
       - Outros status: sx `{ background: '#F4F4F2', color: '#888780', border: '0.5px solid #D3D1C7', fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: '20px' }`.
       - Texto lowercase exato conforme status value. Ficha page passa `status={ficha.status}` (string raw); se ficha.status = "ativa", badge mostra "ativa".

    5. **Page title tokens em page-header.tsx (D-06):**
       - h1/Typography do title: `fontSize: 22, fontWeight: 600, color: '#2C2C2A'`.
       - description: `fontSize: 12, color: '#888780', marginTop: '3px'`.

    6. **Version badge V{n} tokens em ficha-form.tsx (D-07):**
       Localizar a ancora de texto `"Versao"` / bloco do version badge (linhas ~250-269 pre-09-03; numeros podem ter deslocado apos refactor Identificacao de 09-03 — usar grep para localizar). Ajustar `padding: '2px 8px'` (garantir explicit) substituindo `px: 1, py: "2px"` se necessario. Todos demais tokens ja batem HTML. NAO mover posicao (manter abaixo de "Data e hora da ultima alteracao" per pendencias-v3 #14).

    7. **Salvar ficha button tokens em ambas pages (D-06):**
       - /fichas/[fichaId]/page.tsx linhas 48-56 (Salvar ficha): `sx={{ padding: '7px 16px', backgroundColor: '#185FA5', borderColor: '#185FA5', color: '#fff', '&:hover': { backgroundColor: '#0C447C' } }}`.
       - /fichas/nova/page.tsx linhas 43-51 (Salvar ficha): mesmo sx.
       - StickyActionBar em ambas: mesmo sx.

    8. Rodar:
       ```
       npm run test:unit -- ficha-detail-page
       npm run test:unit -- page-header
       npm run typecheck
       ```

    9. E2E gate (D-20):
       ```
       npm run test:e2e -- engineering-flow --workers=1
       ```
  </action>
  <verify>
    <automated>grep -rn "Duplicar" src/modules/engineering/ui/FichaHeaderActions.tsx &amp;&amp; grep -rn "Exportar" src/modules/engineering/ui/FichaHeaderActions.tsx &amp;&amp; grep -n "padding: '7px 10px'" src/modules/engineering/ui/FichaHeaderActions.tsx &amp;&amp; grep -n "M3 11V3h8" src/modules/engineering/ui/FichaHeaderActions.tsx &amp;&amp; grep -n "M3 10v3h10v-3" src/modules/engineering/ui/FichaHeaderActions.tsx &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal `Duplicar` (grep)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal `Exportar` (grep)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal SVG path `M3 11V3h8` (Duplicar icon, grep)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal SVG path `M3 10v3h10v-3` (Exportar icon, grep)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal `padding: '7px 10px'` (grep, btn-icon tokens)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains literal `#D3D1C7` (border) AND `#5F5E5A` (color)
    - `src/modules/engineering/ui/FichaHeaderActions.tsx` contains TODO comment for Exportar: `TODO PDFV2-FUT-01` OR `TODO Phase` (grep)
    - `src/modules/platform/ui/page-header.tsx` contains literal `#EAF3DE` AND `#1B6B2C` (badge ativa)
    - `src/modules/platform/ui/page-header.tsx` contains literal `#F4F4F2` OR `#888780` (badge inativa neutra)
    - Page title tokens: `#2C2C2A` AND `fontSize: 22` AND `fontWeight: 600` present in page-header.tsx
    - `src/app/(app)/fichas/[fichaId]/page.tsx` contains literal `#185FA5` (grep, Salvar ficha button)
    - `src/modules/engineering/ui/ficha-form.tsx` bloco version badge contem `#E6F1FB` AND `#185FA5` AND `#B5D4F4` (grep all three)
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- engineering-flow --workers=1` sem regressao vs baseline
  </acceptance_criteria>
  <done>
    Topbar Ficha com btn-icon Duplicar + Exportar (SVGs exatos do HTML) + tokens btn-icon; badge ativa verde; title/sub tokens pixel-perfect; version badge polido; Salvar ficha hex tokens.
  </done>
</task>

<task type="auto">
  <name>Task 2: Finalizacao 2-col 50/50 opcional com placeholders HTML (D-08)</name>
  <files>src/modules/engineering/ui/ficha-form.tsx</files>
  <read_first>
    - src/modules/engineering/ui/ficha-form.tsx bloco FormSection Finalizacao (localizar via ancora "Finalizacao"; linhas podem ter deslocado apos 09-03)
    - src/modules/catalog/ui/item-form.tsx linhas 223-233 (padrao label ReactNode com marcador (opcional))
    - update/tela-ficha-tecnica-v2.html linhas 119, 425-432 (Finalizacao g-fin + placeholders)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-08, D-10
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-01-SUMMARY.md (confirmar Zod preparationMode ja relaxado per 09-01 Task 2)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-03-SUMMARY.md (confirmar Identificacao refactor concluido — evitar editar mesmas linhas)
  </read_first>
  <action>
    Em `src/modules/engineering/ui/ficha-form.tsx`, localizar `FormSection title="Finalizacao"` (usar ancora de texto; linhas originais ~374-402 pre-09-03 podem ter deslocado):

    **Substituir Grid container spacing=2 + Grid md=7 + Grid md=5 por Box sx grid 1fr 1fr:**

    ```tsx
    <FormSection title="Finalizacao">
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          size="small"
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
          error={Boolean(getFieldError("preparationMode"))}
          helperText={getFieldError("preparationMode") ?? " "}
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          size="small"
          label={
            <>
              Observacoes gerais{" "}
              <Box component="span" sx={{ color: '#888780', fontSize: 10, fontWeight: 400, ml: 0.5 }}>
                (opcional)
              </Box>
            </>
          }
          name="notes"
          placeholder="Observacoes gerais, alertas ou informacoes complementares..."
          defaultValue={initialValues?.notes ?? ""}
          error={Boolean(getFieldError("notes"))}
          helperText={getFieldError("notes") ?? " "}
        />
      </Box>
    </FormSection>
    ```

    **Mudancas pontuais:**
    - Remover `required` do preparationMode (D-08, alinhado com D-10 Zod relax).
    - rows mudar de 6 (preparationMode atual) e 4 (notes atual) para 4 em ambos per HTML `min-height: 80px` ~ 4 rows visual.
    - Label "Observacoes da ficha" (atual) → "Observacoes gerais" (per HTML linha 430).
    - Labels em JSX com marcador `(opcional)` inline (padrao Phase 8 D-15 / item-form.tsx:223-233).

    Rodar:
    ```
    npm run test:unit -- ficha-form
    npm run typecheck
    ```

    Ambos verdes.

    E2E gate:
    ```
    npm run test:e2e -- engineering-flow --workers=1
    ```
  </action>
  <verify>
    <automated>grep -n "gridTemplateColumns: '1fr 1fr'" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -n "Descreva o passo a passo do preparo" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -n "Observacoes gerais, alertas" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; grep -n "(opcional)" src/modules/engineering/ui/ficha-form.tsx &amp;&amp; npm run test:unit -- ficha-form &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `gridTemplateColumns: '1fr 1fr'` within Finalizacao section (grep)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal placeholder `Descreva o passo a passo do preparo para o operador de cozinha...` (grep)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal placeholder `Observacoes gerais, alertas ou informacoes complementares...` (grep)
    - `src/modules/engineering/ui/ficha-form.tsx` contains literal `Observacoes gerais` as label text (grep — substituindo antigo "Observacoes da ficha")
    - `src/modules/engineering/ui/ficha-form.tsx` contains `(opcional)` at least 2 times (grep — um por campo Finalizacao)
    - `src/modules/engineering/ui/ficha-form.tsx` Finalizacao section does NOT contain `required` on preparationMode TextField (grep-verify: `required` prop near `name="preparationMode"` should be absent — visual check OK)
    - `src/modules/engineering/ui/ficha-form.tsx` does NOT contain `<Grid container` within Finalizacao section (grep-scoped)
    - `rows={4}` present for both Finalizacao textareas (grep — count ≥ 2)
    - `npm run test:unit -- ficha-form` exits 0
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- engineering-flow --workers=1` sem regressao
  </acceptance_criteria>
  <done>
    Finalizacao 2-col 50/50 opcional com placeholders HTML + labels (opcional); preparationMode nao-obrigatorio alinhado com Zod 09-01; typecheck e unit tests verdes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Topbar btn-icon Exportar | Handler em TODO — sem nova attack surface |
| Finalizacao | preparationMode relaxado via Zod (09-01), server action ja valida com default '' |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-04-01 | — | Visual tokens only (topbar + finalizacao refactor) | accept | No new attack surface — token swaps + grid container refactor; SVG inline sem eventos; Exportar onClick = no-op TODO; Duplicar preserva handler server action existente (ou mantem deferred per D-05). |
| T-09-04-02 | Input Validation | preparationMode opcional | accept | Coberto em 09-01 Task 2 via Zod default(''); coluna Prisma NOT NULL preservada. |
</threat_model>

<verification>
- FichaHeaderActions.tsx contem Duplicar + Exportar IconButtons com SVGs exatos do HTML + tokens btn-icon
- page-header.tsx badge ativa verde (#EAF3DE/#1B6B2C), inativa cinza neutro (#F4F4F2/#888780)
- page-header.tsx page-title (fontSize 22, fontWeight 600, color #2C2C2A) + page-sub (fontSize 12, color #888780, marginTop 3px)
- ficha-form.tsx version badge mantem posicao pendencias-v3 #14 com tokens polidos
- ficha-form.tsx Finalizacao Box sx 1fr 1fr; ambos textareas (opcional); placeholders HTML; rows=4
- Salvar ficha hex #185FA5 / #0C447C hover
- npm run test:unit -- ficha-form GREEN
- npm run typecheck exit 0
- npm run test:e2e -- engineering-flow --workers=1 sem regressao (gate D-20)
</verification>

<success_criteria>
1. Topbar Ficha com btn-icon Duplicar + Exportar (SVGs exatos do HTML).
2. Badge "ativa" pixel-perfect (verde #EAF3DE/#1B6B2C).
3. Version badge V{n} tokens polidos preservando posicionamento pendencias-v3 #14.
4. Finalizacao 2-col 50/50 com labels (opcional) e placeholders HTML byte-a-byte.
5. Unit + typecheck + E2E subset estavel verdes.
6. Exportar handler em TODO (handler real deferred para roadmap v2 PDFV2-FUT-01).
</success_criteria>

<output>
After completion, create `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-04-SUMMARY.md` documenting:
- Topbar btn-icon adicionados (Duplicar + Exportar SVGs)
- Badge ativa/inativa tokens
- Version badge polish diff
- Finalizacao refactor diff (Grid 7/5 → Box 1fr 1fr)
- preparationMode nao-required (Zod ja relaxado em 09-01)
- Gates passados
</output>
</output>
