---
plan_id: 09-02
phase: 09-detalhe-item-ficha-pixel-perfect
plan: 02
type: execute
wave: 2
depends_on: [09-01]
files_modified:
  - src/components/ui/FormSection.tsx
  - src/modules/catalog/ui/item-form.tsx
  - src/modules/catalog/ui/purchases-editor.tsx
  - src/app/(app)/itens/[itemId]/page.tsx
  - src/app/(app)/itens/novo/page.tsx
autonomous: true
requirements:
  - SPEC-4-TELAS-ESTRITO
  - SPEC-ITEM-FORNECEDOR
tags: [ui, pixel-perfect, item, fornecedor, topbar]

must_haves:
  truths:
    - "FormSection nao renderiza description quando prop ausente — card-label bate 1:1 com HTML linha 56"
    - "Topbar /itens/[id] usa hex tokens exatos: #F09595 (danger border), #A32D2D (danger text), #185FA5 (primary bg)"
    - "PurchasesEditor secundarios exibem placeholders 'dd/mm/aaaa' (priceUpdatedAt), '0,0000' (qtde), 'R$ 0,00' (precos)"
    - "Badge ativo/inativo usa tokens verde (#EAF3DE/#1B6B2C) ou cinza neutro (#F4F4F2/#888780) — nunca vermelho para inativo"
  artifacts:
    - path: "src/components/ui/FormSection.tsx"
      provides: "FormSection sem renderizar subtitle quando description undefined"
      contains: "description?: string"
    - path: "src/modules/catalog/ui/item-form.tsx"
      provides: "3 FormSection (Identificacao, Fornecedor via PurchasesEditor, Observacoes) sem prop description"
      contains: "title=\"Identificacao\""
    - path: "src/modules/catalog/ui/purchases-editor.tsx"
      provides: "Fornecedor 2+ placeholders pixel-perfect"
      contains: "dd/mm/aaaa"
    - path: "src/app/(app)/itens/[itemId]/page.tsx"
      provides: "Topbar com btn-danger + btn-primary hex + badge ativo/inativo verde/cinza"
      contains: "#185FA5"
  key_links:
    - from: "src/app/(app)/itens/[itemId]/page.tsx"
      to: "PageHeader"
      via: "status prop"
      pattern: "status=\\{item\\.active"
---

<objective>
Retoque pixel-perfect da tela de Item (`/itens/[id]` e `/itens/novo`) com HTML `update/tela-item-v1.html`: remover `description` dos FormSection (D-13), ajustar topbar hex tokens + paddings (D-14), validar/ajustar placeholders fornecedor 2+ (D-15), badge ativo/inativo verde/cinza (D-16).

Purpose: Fechar SPEC-4-TELAS-ESTRITO + SPEC-ITEM-FORNECEDOR do lado Item; contrato visual 1:1 com HTML.
Output: item-form.tsx + purchases-editor.tsx + page.tsx Item (detail + novo) alinhados ao HTML; FormSection.tsx aceita description opcional sem renderizar quando ausente.
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
@update/tela-item-v1.html
@src/components/ui/FormSection.tsx
@src/modules/catalog/ui/item-form.tsx
@src/modules/catalog/ui/purchases-editor.tsx
@src/app/(app)/itens/[itemId]/page.tsx
@src/app/(app)/itens/novo/page.tsx

<interfaces>
<!-- FormSection atual aceita `description?: string`; renderiza sempre que passado. -->
<!-- Target: quando undefined, NAO renderizar o bloco de subtitle (Stack de title+description vira apenas title). -->

Current FormSection render (src/components/ui/FormSection.tsx:25-34):
```tsx
<Stack spacing={0.5}>
  <Typography variant="overline" color="text.secondary">{title}</Typography>
  {description ? (
    <Typography variant="body2" color="text.secondary">{description}</Typography>
  ) : null}
</Stack>
```
Ja aceita description opcional. Task 1 apenas ajusta os CALLERS (remove prop description do item-form.tsx).

<!-- item-form.tsx linhas 113-115: FormSection title="Identificacao" description="Dados mestres..." — REMOVER description -->
<!-- item-form.tsx linha 217: FormSection title="Observacoes" (sem description ja) — OK -->

<!-- purchases-editor.tsx: PurchaseRow rows with purchaseIsPrimary=false são secundários -->
<!-- Placeholders HTML linha 310 (Atualizado em): placeholder="dd/mm/aaaa" -->
<!-- Placeholders HTML linha 335 (Quantidade): placeholder="0,0000" -->
<!-- Placeholders HTML linha 353 (Preco): placeholder="R$ 0,00" -->

<!-- page.tsx /itens/[id] topbar usa Button MUI color="error" variant="outlined" -> precisa bater HTML btn-danger -->
<!-- HTML .btn-danger: padding:8px 18px; border-color:#F09595; color:#A32D2D -->
<!-- HTML .btn-primary: background:#185FA5; border:0.5px solid #185FA5; color:#fff; hover:#0C447C -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: FormSection sem description + item-form.tsx drop description props (D-13)</name>
  <files>src/components/ui/FormSection.tsx, src/modules/catalog/ui/item-form.tsx</files>
  <read_first>
    - src/components/ui/FormSection.tsx (confirmar que `description?: string` ja e opcional — provavel que so callers precisem de ajuste)
    - src/modules/catalog/ui/item-form.tsx linhas 113-117 (FormSection Identificacao) e 217 (FormSection Observacoes)
    - update/tela-item-v1.html linha 56 (`.card-label` tokens — margin-bottom: 16px apos o label, sem subtitulo)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-13
  </read_first>
  <behavior>
    - FormSection renderizado com `description` undefined NAO deve renderizar `<Typography variant="body2">` no DOM.
    - item-form.tsx nao deve mais passar prop `description` em nenhum FormSection.
    - `.card-label` visual: margem inferior de ~16px apos o label, sem subtitulo — igual ao HTML linha 56.
  </behavior>
  <action>
    1. **FormSection.tsx (verificar, ajustar se necessario):**
       - Confirmar que a prop `description?: string` é opcional (ja é, linha 9).
       - Confirmar que o render usa `{description ? (<Typography>...) : null}` — ja usa, linha 29-33.
       - Nenhum change estrutural esperado, MAS: se Stack outer tiver `spacing={0.5}` forcando gap indesejado quando description ausente, ajustar para usar `spacing={description ? 0.5 : 0}` para fidelidade pixel. Caso contrario, deixar.

    2. **item-form.tsx — remover prop `description` de todos os FormSection:**
       - Linha 113-116: `<FormSection title="Identificacao" description="Dados mestres...">` → `<FormSection title="Identificacao">`.
       - Linha 217: `<FormSection title="Observacoes">` — ja nao tem description, manter.
       - Nao existe FormSection adicional no item-form hoje (Bloco 2 e PurchasesEditor, que tem seu proprio FormSection).

    3. **Adicionar test unit:**
       - Arquivo: `src/modules/catalog/ui/item-form.test.tsx` (criar se nao existir).
       - Test 1 (RED primeiro, GREEN depois): render `<ItemForm />` sem `initialValues` → assert que NAO existe string `"Dados mestres para identificar"` no DOM (`expect(screen.queryByText(/Dados mestres para identificar/)).toBeNull()`).
       - Test 2: render → assert label `"Identificacao"` existe como overline (`screen.getByText("Identificacao")`).
       - Test 3: render → assert label `"Observacoes"` existe (`screen.getByText("Observacoes")`).

    4. Rodar unit:
       ```bash
       npm run test:unit -- item-form
       ```
       Todos PASS.

    5. Rodar typecheck:
       ```bash
       npm run typecheck
       ```
       Exit 0.

    6. E2E gate (D-20):
       ```bash
       npm run test:e2e -- engineering-flow --workers=1
       ```
       Sem regressao vs baseline (engineering-flow flakes pre-existentes aceitos per Phase 8 D-16).
  </action>
  <verify>
    <automated>grep -n "description=\"Dados mestres" src/modules/catalog/ui/item-form.tsx | wc -l | awk '{ if ($1 == 0) exit 0; else exit 1 }' &amp;&amp; npm run test:unit -- item-form &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/catalog/ui/item-form.tsx` does NOT contain `description="Dados mestres` (grep — zero matches)
    - `src/modules/catalog/ui/item-form.tsx` does NOT contain any `description=` prop on `<FormSection` (grep multiline — zero matches)
    - `src/components/ui/FormSection.tsx` keeps `description?: string` optional (grep literal)
    - `src/modules/catalog/ui/item-form.test.tsx` exists and contains `queryByText(/Dados mestres/)` assertion (grep)
    - `npm run test:unit -- item-form` exits 0
    - `npm run typecheck` exits 0
  </acceptance_criteria>
  <done>
    FormSection sem description nao renderiza subtitle; item-form.tsx nao usa mais prop description; testes verdes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Topbar Item + badge ativo/inativo pixel-perfect (D-14 + D-16)</name>
  <files>src/app/(app)/itens/[itemId]/page.tsx, src/app/(app)/itens/novo/page.tsx</files>
  <read_first>
    - src/app/(app)/itens/[itemId]/page.tsx (linhas 49-78 — PageHeader + actions)
    - src/app/(app)/itens/novo/page.tsx (linhas 15-34 — PageHeader + action Salvar)
    - src/modules/platform/ui/page-header.tsx (entender como `status` prop renderiza badge)
    - update/tela-item-v1.html linhas 44-52 (tokens .badge, .btn, .btn-danger, .btn-primary)
    - update/tela-item-v1.html linha 170 (subtitulo "Edicao do item mestre.")
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-14 e D-16
  </read_first>
  <action>
    1. **Abrir `src/modules/platform/ui/page-header.tsx`** para entender como `status` prop renderiza badge. Provavel: Chip MUI com cores derivadas do status string.

    2. **Ajustar badge ativo/inativo no PageHeader OU no page.tsx [itemId]:**
       - Status `"ativo"`: `background: '#EAF3DE', color: '#1B6B2C', border: '0.5px solid #C0DD97'`, `fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: '20px'`.
       - Status `"inativo"`: `background: '#F4F4F2', color: '#888780', border: '0.5px solid #D3D1C7'` — NAO usar vermelho (reservado para erros).
       - Se PageHeader nao suporta custom sx por status, passar via `sx` prop inline no Chip gerado, OU adicionar `statusColorMap` interno no component.

    3. **Ajustar botoes do topbar em /itens/[itemId]/page.tsx (linhas 61-75):**
       - Botao "Excluir item" (color="error" variant="outlined"):
         - Adicionar `sx={{ padding: '8px 18px', borderColor: '#F09595', color: '#A32D2D', '&:hover': { backgroundColor: '#FCEBEB' } }}` no `<Button>`.
       - Botao "Salvar alteracoes" (variant="contained"):
         - Adicionar `sx={{ padding: '8px 18px', backgroundColor: '#185FA5', borderColor: '#185FA5', color: '#fff', '&:hover': { backgroundColor: '#0C447C' } }}`.

    4. **Ajustar botao "Salvar item" em /itens/novo/page.tsx (linhas 24-32):**
       - Mesmo sx de #185FA5 / #0C447C do item acima.

    5. **Validar subtitulo "Edicao do item mestre.":**
       - PageHeader prop `description="Edicao do item mestre."` ja existe (linha 56). Validar tokens no component: `fontSize: 12, color: '#888780', marginTop: '3px'`.
       - Se o PageHeader hoje usa outro tamanho/cor, ajustar em `src/modules/platform/ui/page-header.tsx` para match HTML linha 170.

    6. **StickyActionBar buttons (linhas 106-123):** aplicar mesmos hex tokens.

    7. Rodar unit tests:
       ```bash
       npm run test:unit -- item-detail-page
       npm run test:unit -- page-header
       npm run typecheck
       ```

    8. E2E gate (D-20):
       ```bash
       npm run test:e2e -- engineering-flow --workers=1
       npm run test:e2e -- importacao --workers=1
       ```
  </action>
  <verify>
    <automated>grep -n "#185FA5" src/app/\(app\)/itens/\[itemId\]/page.tsx &amp;&amp; grep -n "#F09595\\|#A32D2D" src/app/\(app\)/itens/\[itemId\]/page.tsx &amp;&amp; grep -n "#185FA5" src/app/\(app\)/itens/novo/page.tsx &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/(app)/itens/[itemId]/page.tsx` contains literal `#185FA5` (grep)
    - `src/app/(app)/itens/[itemId]/page.tsx` contains literal `#0C447C` (grep — hover state)
    - `src/app/(app)/itens/[itemId]/page.tsx` contains literal `#F09595` (grep — border danger)
    - `src/app/(app)/itens/[itemId]/page.tsx` contains literal `#A32D2D` (grep — text danger)
    - `src/app/(app)/itens/[itemId]/page.tsx` contains literal `padding: '8px 18px'` OR `padding: "8px 18px"` (grep)
    - `src/app/(app)/itens/novo/page.tsx` contains literal `#185FA5` (grep)
    - Badge ativo tokens: PageHeader ou page.tsx contem `#EAF3DE` E `#1B6B2C` (grep ambos)
    - Badge inativo tokens: contem `#F4F4F2` OU `#888780` (grep)
    - NAO contem `color="error"` sem override de hex (se persistir, acceptable desde que sx override prevaleca)
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- engineering-flow --workers=1` nao regrede vs baseline (4 flakes pre-existentes aceitos)
  </acceptance_criteria>
  <done>
    Topbar das duas paginas Item usa hex tokens do HTML; badge ativo verde, inativo cinza; typecheck clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: Placeholders Fornecedor 2+ (D-15)</name>
  <files>src/modules/catalog/ui/purchases-editor.tsx</files>
  <read_first>
    - src/modules/catalog/ui/purchases-editor.tsx (localizar inputs de fornecedor secundario — priceUpdatedAt DatePicker, purchaseQuantity TextField, purchaseCost TextField, usageQuantity TextField)
    - update/tela-item-v1.html linhas 302-372 (fornecedor 2 block com placeholders)
    - .planning/phases/09-detalhe-item-ficha-pixel-perfect/09-CONTEXT.md D-15 e D-11
  </read_first>
  <action>
    1. **Localizar inputs de fornecedor secundario** em `purchases-editor.tsx`. Para cada row com `purchaseIsPrimary=false`:
       - `priceUpdatedAt` (DatePicker MUI): adicionar prop `slotProps={{ textField: { placeholder: 'dd/mm/aaaa' } }}`.
       - `purchaseQuantity` (TextField): adicionar `placeholder="0,0000"`.
       - `purchaseCost` (TextField): adicionar `placeholder="R$ 0,00"`.
       - `usageQuantity` (TextField, se aplicavel ao secundario, readonly derivado): placeholder irrelevante (valor derivado) — pular.

    2. **Validar fornecedor 1 principal:** em `/novo`, defaults atuais sao `"1.0000"` (qtde) e `"0.0000"` (preco). Nao alterar — sao valores pre-preenchidos sensatos, nao placeholders (D-15 explicitamente permite).

    3. **Descricao operacional placeholder em item-form.tsx linha 235:**
       - String atual: `"Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg."`
       - HTML v1 tem a mesma string (linha 378 do HTML). Validar match byte-a-byte; nao mexer se ja match.

    4. **priceUpdatedAt render quando null (D-11):**
       - No presenter (`mapItemDetail` em catalog-repository.ts), quando `priceUpdatedAt === null`, passar string vazia `""` para a UI (ja e o padrao).
       - No componente, quando o valor e vazio, o DatePicker mostra placeholder `"dd/mm/aaaa"` naturalmente. Validar.

    5. Rodar unit tests:
       ```bash
       npm run test:unit -- purchases-editor
       npm run typecheck
       ```

    6. E2E gate:
       ```bash
       npm run test:e2e -- importacao --workers=1
       ```
  </action>
  <verify>
    <automated>grep -n "dd/mm/aaaa" src/modules/catalog/ui/purchases-editor.tsx &amp;&amp; grep -n "0,0000\\|R\\$ 0,00" src/modules/catalog/ui/purchases-editor.tsx &amp;&amp; npm run test:unit -- purchases-editor &amp;&amp; npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/modules/catalog/ui/purchases-editor.tsx` contains literal `dd/mm/aaaa` (grep, at least 1 match — priceUpdatedAt placeholder)
    - `src/modules/catalog/ui/purchases-editor.tsx` contains literal `0,0000` (grep, as placeholder string)
    - `src/modules/catalog/ui/purchases-editor.tsx` contains literal `R$ 0,00` (grep, as placeholder string)
    - `src/modules/catalog/ui/item-form.tsx` linha 235 contains `Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg.` (grep literal — ja existe, confirmar match)
    - `npm run test:unit -- purchases-editor` exits 0
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- importacao --workers=1` nao regrede vs baseline
  </acceptance_criteria>
  <done>
    Fornecedor 2+ com placeholders pixel-perfect; descricao operacional match byte-a-byte; typecheck clean.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| UI tokens (visual-only) | Nenhuma nova entrada de dados / endpoint |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-02-01 | — | Visual tokens only | accept | No new attack surface — pure visual token changes; no new form fields; no new endpoints; no serialization of new values. |
</threat_model>

<verification>
- item-form.tsx não contem mais `description=` em FormSection
- Topbar Item usa hex literal `#185FA5`, `#F09595`, `#A32D2D`, `#EAF3DE`, `#1B6B2C`, `#F4F4F2`, `#888780`
- PurchasesEditor fornecedor 2+ com placeholders `dd/mm/aaaa`, `0,0000`, `R$ 0,00`
- npm run test:unit verde (item-form, purchases-editor, item-detail-page)
- npm run typecheck exit 0
- npm run test:e2e -- engineering-flow --workers=1 (gate D-20) sem regressao
- npm run test:e2e -- importacao --workers=1 (gate D-20) sem regressao
</verification>

<success_criteria>
1. FormSection sem description prop nao renderiza subtitulo; item-form.tsx nao usa mais description.
2. Topbar /itens/[itemId] + /itens/novo com hex tokens exatos do HTML linhas 44-52.
3. PurchasesEditor secundarios com placeholders do HTML linhas 310, 335, 353.
4. Badge ativo verde / inativo cinza (nao vermelho).
5. Unit + typecheck + E2E subset estavel verdes.
</success_criteria>

<output>
After completion, create `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-02-SUMMARY.md` documenting:
- FormSection callers ajustados
- Hex tokens aplicados no topbar (diffs)
- Placeholders Fornecedor 2+ adicionados (diffs)
- Badge ativo/inativo tokens
- Gates passados (unit, typecheck, E2E subset)
</output>
