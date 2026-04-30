# Alinhamento Sistema x Especificacoes PDF v1 - Research

**Researched:** 2026-04-10
**Domain:** UI compliance audit -- 4 screens vs SIS-Restaurante-Especificacoes-v1.pdf
**Confidence:** HIGH (source code read line-by-line, PDF extracted via pdftotext)

## Summary

This research compares the current codebase against every requirement in SIS-Restaurante-Especificacoes-v1.pdf (24 pages, 4 screens). The analysis found **significant divergences** across all four screens. The most critical gaps are: (1) Grade de Itens missing Categoria Operacional filter, wrong column order, missing custom badge colors, missing Status column, and wrong column names; (2) Grade de Fichas missing Modalidade and Grupo Operacional filters, has an extraneous "Versao" separate column, wrong card label, missing Preco de Venda column, and wrong FC/IC color logic; (3) Cadastro de Item has description marked as required in schema when spec says optional, wrong block structure, missing calculated field visual styling (green); (4) Ficha Tecnica missing Codigo field, missing drag-to-reorder, missing Coccao Final as distinct block, and Quadro Final strip layout not matching spec.

**Primary recommendation:** Address all CRITICAL items first (wrong columns, missing filters, missing fields), then IMPORTANT (badge colors, formatting, layout), then MINOR (cosmetic).

---

## Secao 1: Grade de Itens (/itens) -- Divergences

### 1.1 Header and Card Label

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Title: "Itens" | `title="Itens"` (page.tsx:34) | OK | -- |
| Subtitle: "Cadastro mestre de insumos e materiais." | `description="Cadastro mestre de insumos e materiais."` (page.tsx:35) | OK | -- |
| Button: "+ Novo item" (azul, canto superior direito) | Button says "Novo item" with AddIcon (line 117) | DIVERGENCE: button text shows "Novo item" not "+ Novo item". The `+` is the AddIcon `startIcon`, so visually similar but icon-based not text-based | MINOR |
| Card label: "CADASTRO MESTRE" + dynamic count "X itens encontrados" | Card shows `Cadastro mestre` (lowercase) + "X itens encontrados com filtros de nome, tipo e status." (line 435-438) | DIVERGENCE: spec says uppercase "CADASTRO MESTRE". Also dynamic count message has extra text about filters that spec doesn't specify | IMPORTANT |

### 1.2 Columns -- Order and Completeness

**Spec defines 15 columns in this exact order:**

| # | Spec Column | Current Field | Status | Priority |
|---|---|---|---|---|
| 1 | Codigo (72px, left) | `code` (120px minWidth) | DIVERGENCE: width is 120px not 72px | IMPORTANT |
| 2 | Nome do Item (160px, left, bold) | `item` field renders name+code stacked (flex 1.5, 240px min) | DIVERGENCE: width 240px vs 160px; shows code as secondary text below name | IMPORTANT |
| 3 | Tipo (90px, badge) | `type` (120px, Chip outlined) | DIVERGENCE: width 120px vs 90px; uses generic outlined Chip, NOT custom-colored badges per spec hex colors | CRITICAL |
| 4 | Categoria Operacional (100px) | `category` (180px min, flex 1) | DIVERGENCE: width 180px vs 100px | IMPORTANT |
| 5 | Qtde Compra (72px, right, 4dec) | `purchaseQuantity` (130px, right, 4dec) | DIVERGENCE: width 130px vs 72px | IMPORTANT |
| 6 | Un. Compra (56px, left, muted) | `stockUnit` (120px) | DIVERGENCE: width 120px vs 56px; not muted styling | IMPORTANT |
| 7 | Preco Compra (72px, right, R$ 2dec, sortable) | `baseUnitCost` (140px, right, R$ 2dec) | DIVERGENCE: width 140px vs 72px; headerName is "Preco Compra" OK; sortable=false but spec says sortable | CRITICAL |
| 8 | Fator Conv. (60px, right, 4dec) | `conversionFactor` (150px, right, 4dec) | DIVERGENCE: width 150px vs 60px; headerName "Fator Conversao" vs spec "Fator Conv." | IMPORTANT |
| 9 | Qtde Uso (64px, right, calculated, 4dec) | `usageQuantity` (120px, right, 4dec) | DIVERGENCE: width 120px vs 64px | IMPORTANT |
| 10 | Un. Uso (50px, left, muted) | `usageUnit` (110px) | DIVERGENCE: width 110px vs 50px; not muted | IMPORTANT |
| 11 | Preco Uso (72px, right, calculated, green+bold, 2dec, sortable) | `usagePrice` (130px, right, green text, R$ 2dec) | DIVERGENCE: width 130px vs 72px; green via success.main (not custom hex); sortable=false but spec says sortable | CRITICAL |
| 12 | Fornecedor (110px, left, muted, smaller, "NOME +N" format) | `supplierName` (160px) after several other columns | DIVERGENCE: column ORDER is wrong -- Fornecedor is at position 14 in code, should be 12. Width 160px vs 110px. No "NOME +N" multi-supplier format | CRITICAL |
| 13 | Status (62px, center, badge) | MISSING -- no Status column in the grid | CRITICAL |
| 14 | Ult. Atualizacao (90px, left, dd/mm/aa hh:mm, muted, sortable) | `updatedAt` (170px, left) | DIVERGENCE: width 170px vs 90px; format uses toLocaleString("pt-BR") which gives dd/mm/yyyy hh:mm:ss, spec wants dd/mm/aa hh:mm; sortable=false but spec says sortable | IMPORTANT |
| 15 | Obs (40px, center, SVG icon) | `description` column (140px, "Icone Descricao" header) | DIVERGENCE: width 140px vs 40px; header "Icone Descricao" vs spec just "Obs"; tooltip should say "Ver observacao" but shows full description text | IMPORTANT |

**Extra columns in code NOT in spec:**

| Extra Column | Status | Priority |
|---|---|---|
| `totalCost` "Custo Total" (120px) | NOT IN SPEC -- remove | CRITICAL |
| `fichaStatus` "Ficha" (100px) | NOT IN SPEC -- remove | CRITICAL |

**Column order in code vs spec:**
- Code order: code, item(name), type, category, stockUnit, purchaseQuantity, baseUnitCost, conversionFactor, usageUnit, usageQuantity, usagePrice, updatedAt, description, supplierName, totalCost, fichaStatus
- Spec order: Codigo, Nome do Item, Tipo, Categoria Op., Qtde Compra, Un. Compra, Preco Compra, Fator Conv., Qtde Uso, Un. Uso, Preco Uso, Fornecedor, Status, Ult. Atualizacao, Obs

**Key differences:** Un. Compra (6) comes before Qtde Compra (5) in code (reversed); Fornecedor is position 14 in code vs 12 in spec; updatedAt (12 in code) vs 14 in spec; description (13 in code) vs 15 in spec; two extra columns at end.

### 1.3 Badge Colors

| Spec Badge | Spec Hex (bg/text) | Current Implementation | Status | Priority |
|---|---|---|---|---|
| Insumo | #EAF3DE / #27500A (green) | Generic outlined Chip, no custom colors | MISSING | CRITICAL |
| Intermediario | #E6F1FB / #0C447C (blue) | Generic outlined Chip | MISSING | CRITICAL |
| Embalagem | #FAEEDA / #633806 (amber) | Generic outlined Chip | MISSING | CRITICAL |
| Prato | #EEEDFE / #3C3489 (purple) | Generic outlined Chip | MISSING | CRITICAL |
| Porcao | #EEEDFE / #3C3489 (purple) | Generic outlined Chip | MISSING | CRITICAL |
| Pre-preparo | #E6F1FB / #0C447C (blue) | Generic outlined Chip | MISSING | CRITICAL |
| Apoio | #F1EFE8 / #444441 (gray) | Generic outlined Chip | MISSING | CRITICAL |
| Status Ativo | #EAF3DE / #27500A (green) | No Status column at all | MISSING | CRITICAL |
| Status Inativo | #F1EFE8 / #444441 (gray) | No Status column at all | MISSING | CRITICAL |

### 1.4 Filters

| Spec Filter | Current Code | Status | Priority |
|---|---|---|---|
| Search by name (full width, lupa icon, debounce 300ms) | TextField with SearchIcon, fullWidth | OK (debounce not implemented -- uses form submit) | IMPORTANT |
| Tipo dropdown (Todos/Insumo/Intermediario/Embalagem/Prato/Porcao/Pre-preparo/Apoio) | Has dropdown but includes extra options: produto_pronto, marmita, combo | DIVERGENCE: extra type values not in spec | IMPORTANT |
| Categoria Operacional dropdown | MISSING -- no category filter | CRITICAL |
| Status dropdown (Todos/Ativo/Inativo) | Has dropdown with "ativos"/"inativos" values | OK (functionally) | -- |
| Filters combine with AND in real time | Uses form submit, not real-time | DIVERGENCE: spec says "tempo real" | IMPORTANT |

### 1.5 Sorting

| Spec Sorting | Current Code | Status | Priority |
|---|---|---|---|
| Nome (default A-Z) | No sorting enabled on Nome column (sortable not set) | DIVERGENCE: spec says sortable | IMPORTANT |
| Preco Compra sortable | `sortable: false` | DIVERGENCE | CRITICAL |
| Preco Uso sortable | `sortable: false` | DIVERGENCE | CRITICAL |
| Ult. Atualizacao sortable | `sortable: false` | DIVERGENCE | CRITICAL |

### 1.6 Layout

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| table-layout: fixed | Uses MUI DataGrid (not CSS table-layout: fixed) | DIVERGENCE: DataGrid uses flex layout | IMPORTANT |
| 1280px min width without scroll | `minWidth: 1680` (line 442) | DIVERGENCE: 1680px vs 1280px | IMPORTANT |
| Sidebar 192px fixed | Not in this component (layout concern) | NEEDS VERIFICATION | -- |
| Row height 42px min | `getRowHeight: () => 72` in DataGridListingConfig | DIVERGENCE: 72px vs 42px | IMPORTANT |
| Pagination: 10 per page, "Mostrando X-Y de Z itens" | 10 per page OK; pagination text is MUI default (not custom "Mostrando..." format) | DIVERGENCE: pagination text format | MINOR |

### 1.7 Number Formatting

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| 4 decimal for quantities/factor | formatDecimal uses 4 decimals | OK | -- |
| 2 decimal for prices with R$ prefix | formatCurrency uses Intl currency | OK | -- |
| Dash (--) for empty fields | Some fields show "0" or "R$ 0,00" instead of "--" | DIVERGENCE: empty values render as R$ 0,00 not "--" | IMPORTANT |
| Date format: dd/mm/aa hh:mm | Uses toLocaleString which gives full year | DIVERGENCE: spec wants 2-digit year (aa) | MINOR |

### 1.8 Fornecedor Column Format

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| "NOME +N" for multiple suppliers | Just shows `supplierName` string as-is | DIVERGENCE: no "+N" badge for multiple suppliers | CRITICAL |
| Dash when not defined | Shows empty string | DIVERGENCE: should show "--" | MINOR |

### 1.9 Empty States

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| No results: "Nenhum item encontrado. Tente ajustar os filtros." | MUI DataGrid default empty state | DIVERGENCE: no custom message | IMPORTANT |
| No items at all: message + "Cadastrar primeiro item" button | Not implemented | MISSING | IMPORTANT |

---

## Secao 2: Grade de Fichas Tecnicas (/fichas) -- Divergences

### 2.1 Header and Card Label

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Title: "Fichas Tecnicas" (full name) | `title="Fichas tecnicas"` (lowercase "t") | DIVERGENCE: spec uses capital T "Tecnicas" | MINOR |
| Subtitle: "Receitas, montagens e composicoes do cardapio." | `description="Receitas, montagens e composicoes do cardapio."` | OK | -- |
| Button: "+ Nova ficha" | "Nova ficha" with AddIcon | OK (same pattern as items) | -- |
| Card label: "FICHAS TECNICAS" + count | Shows "Versionamento" (line 335) | DIVERGENCE: should be "FICHAS TECNICAS" | CRITICAL |

### 2.2 Columns -- Order and Completeness

**Spec defines 12 columns:**

| # | Spec Column | Current Field | Status | Priority |
|---|---|---|---|---|
| 1 | Codigo (60px, left, gray, smaller) | `code` (120px, bold font) | DIVERGENCE: width 120px vs 60px; font is bold not gray/smaller | IMPORTANT |
| 2 | Produto (170px, bold name + version badge V1/V2 inline + modalidade/grupo below) | `itemName` (240px min, flex 1.3) shows name + "type . vN" below | DIVERGENCE: version badge should be inline next to name with specific blue styling (#E6F1FB bg, #185FA5 text), not in the secondary line. Currently shows type in secondary, spec says modalidade and grupo below | CRITICAL |
| 3 | Modalidade (100px) | `modalityLabel` (130px) | DIVERGENCE: width | MINOR |
| 4 | Grupo Operacional (100px) | `groupOperational` (170px) | DIVERGENCE: width | MINOR |
| 5 | Componentes (82px, center, badge with count) | `componentCount` (130px, "X itens" chip) | DIVERGENCE: width 130px vs 82px | MINOR |
| 6 | FC (60px, right, calculated, color rules) | `correctionFactor` (90px, center) | DIVERGENCE: width, alignment (center vs right), NO color rules (green >=100%, red <100%, gray when N/A) | CRITICAL |
| 7 | IC (60px, right, calculated, color rules) | `cookingIndex` (90px, center) | DIVERGENCE: same as FC -- missing color rules | CRITICAL |
| 8 | Custo Total (82px, right, R$, green+bold, sortable) | `totalCost` (130px, right, currency, custom.custo color) | DIVERGENCE: width; uses custom.custo not green; column name matches | IMPORTANT |
| 9 | Preco de Venda (80px, right, R$, sortable) | MISSING -- no Preco de Venda column | CRITICAL |
| 10 | Ult. Atualizacao (110px, left, dd/mm/aa hh:mm, muted, sortable) | `updatedAt` (160px, relative date format "ha X dias") | DIVERGENCE: spec says absolute date format dd/mm/aa hh:mm, code uses relative time | CRITICAL |
| 11 | Status (64px, center, badge) | `status` (120px) with StatusChip | DIVERGENCE: width; StatusChip uses MUI palette colors not spec hex colors (#EAF3DE/#27500A for Ativa, #F1EFE8/#444441 for Inativa) | IMPORTANT |
| 12 | Obs (38px, center, SVG icon) | `notes` (130px, "Icone Observacao" header) | DIVERGENCE: width 130px vs 38px; header name wrong; tooltip should say "Ver observacao" | IMPORTANT |

**Extra column in code NOT in spec:**

| Extra Column | Status | Priority |
|---|---|---|
| `version` "Versao" (90px) -- separate column | NOT IN SPEC -- version should be inline badge in Produto column, NOT separate column | CRITICAL |

### 2.3 FC/IC Color Rules

| Condition | Spec Color | Spec Hex | Current | Status | Priority |
|---|---|---|---|---|---|
| >= 100% | Green | #1B6B2C | No color applied | MISSING | CRITICAL |
| < 100% | Red | #A32D2D | No color applied | MISSING | CRITICAL |
| N/A (no limpeza/coccao) | Gray | #888780 | Shows "--" no color | MISSING | IMPORTANT |

### 2.4 Version Badge Spec

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Badge inline next to product name | Shows as separate column AND in secondary text | DIVERGENCE: should be badge next to name in Produto column | CRITICAL |
| Style: bg #E6F1FB, text #185FA5, 10px bold, border-radius 4px, padding 1px 5px | Not implemented | MISSING | CRITICAL |
| Auto-increment on save | Version field exists | NEEDS VERIFICATION in save logic | -- |

### 2.5 Filters

| Spec Filter | Current Code | Status | Priority |
|---|---|---|---|
| Search by name | OK | OK | -- |
| Filtro Modalidade (dropdown with all + "Todas as modalidades") | MISSING | CRITICAL |
| Filtro Grupo Operacional (dropdown with all + "Todos os grupos") | MISSING | CRITICAL |
| Filtro Status (Todos/Ativa/Inativa) | Has dropdown but with extra options: rascunho, arquivada | DIVERGENCE: spec only defines Ativa/Inativa, code has rascunho/arquivada extras | IMPORTANT |

### 2.6 Sorting

| Spec Sorting | Current Code | Status | Priority |
|---|---|---|---|
| Produto (default A-Z) | Not enabled | MISSING | IMPORTANT |
| Custo Total sortable | Not enabled | MISSING | IMPORTANT |
| Preco de Venda sortable | Column missing entirely | MISSING | CRITICAL |
| Ult. Atualizacao sortable | Not enabled | MISSING | IMPORTANT |

### 2.7 Layout

| Spec Requirement | Current | Status | Priority |
|---|---|---|---|
| 1280px min without scroll | `minWidth: 1320` (line 342) | Close but not exact (1320 vs 1280) | MINOR |
| 10 per page | Default 10 | OK | -- |

---

## Secao 3: Cadastro de Item -- Divergences

### 3.1 Block Structure

| Spec Block | Current Code | Status | Priority |
|---|---|---|---|
| BLOCO 1: Identificacao (Codigo, Nome, Status, Tipo, Cat. Op.) | FormSection "Identificacao" -- has all fields PLUS Description field inside this block | DIVERGENCE: Description should be in BLOCO 3, not BLOCO 1. Also Status is inside Identificacao but spec says Tipo and Cat. Op. are in same row as Codigo/Nome/Status | IMPORTANT |
| BLOCO 2: Detalhamento Compras/Fornecedor | FormSection "Descricao e detalhamento operacional" + PurchasesEditor | DIVERGENCE: section title wrong, should be "Detalhamento de Compras / Fornecedor". Conversion fields (Un. Compra, Un. Uso, Fator) are in a separate section from purchases | IMPORTANT |
| BLOCO 3: Observacoes (Descricao Operacional only) | Description is inside Bloco 1 | DIVERGENCE: should be separate third block at bottom | IMPORTANT |

### 3.2 Field Behavior

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Codigo: auto-generated, editable, unique validated | Code field exists, required; uniqueness validated in repository | OK (uniqueness validation exists) | -- |
| Status: pre-loaded as "Ativo" | Default is `active ? "true" : "false"`, initial not explicitly "true" for new | DIVERGENCE: for new items, initialValues?.active defaults to undefined, needs explicit true default | IMPORTANT |
| Description: OPTIONAL, does NOT block save | Schema has `description: z.string().trim().min(1, "Descricao obrigatoria.")` -- REQUIRED | CRITICAL: spec says optional, code requires it | CRITICAL |
| Fator de Conversao: calculated (Qtde Compra / Qtde Uso), readonly, green | Editable text field, not calculated | CRITICAL: spec says Fator = Qtde Compra / Qtde Uso (readonly), code has it as editable input | CRITICAL |
| Fator and Preco Uso displayed in GREEN | No green styling on calculated fields in item form | MISSING | IMPORTANT |
| Qtde Uso: calculated field | Currently calculated but formula may differ; spec says Qtde Uso is a separate required numeric field | NEEDS VERIFICATION | IMPORTANT |
| Preco Uso: Preco Compra / Fator, 2dec display, 4dec storage, green | Calculated correctly, but display uses formatOperationalMetric (4dec), not 2dec | DIVERGENCE: display should be 2 decimal | IMPORTANT |

### 3.3 Multiple Suppliers

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| First supplier = principal, determines base values | `purchaseIsPrimary` on first row | OK | -- |
| Delete first: second auto-promoted to principal | removeRow promotes next to primary | OK | -- |
| Cannot delete if only supplier | Resets to default row | OK | -- |
| Duplicate supplier warning | Not implemented | MISSING | IMPORTANT |
| Un. Uso / Qtde Uso fixed (green, readonly) in suppliers 2+ | Purchase unit is disabled for all rows | PARTIAL: unit disabled but Un. Uso/Qtde Uso green visual not shown | IMPORTANT |

### 3.4 Supplier Row Fields per Spec

| Spec Field | Current PurchasesEditor | Status | Priority |
|---|---|---|---|
| Fornecedor (dropdown from cadastro) | Autocomplete freeSolo with options | OK | -- |
| Data "Atualizado em" (pre-loaded with today) | DatePicker | OK | -- |
| Un. Compra | Disabled TextField showing purchaseUnit | OK | -- |
| Un. Uso (readonly, green, same for all suppliers) | NOT shown in purchase row | MISSING | IMPORTANT |
| Qtde Compra (4 decimals) | TextField type number, step 0.0001 | OK | -- |
| Qtde Uso (readonly, green) | NOT shown in purchase row | MISSING | IMPORTANT |
| Fator Conv. (calculated, readonly, green) | NOT shown in purchase row | MISSING (spec implies it should appear per-supplier too) | IMPORTANT |
| Preco Compra (2dec display, 4dec storage) | TextField type number step 0.0001 | OK (no explicit 2dec formatting in input) | MINOR |
| Preco Uso (calculated, readonly, green) | NOT shown in purchase row | MISSING | IMPORTANT |

### 3.5 Save Behavior

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Required field empty: block save, red border, specific message, focus on field, preserve data | Uses Zod validation + Alert, field-level errors shown | PARTIAL: errors shown but auto-focus on first error not implemented | IMPORTANT |
| Duplicate code: "Este codigo ja esta em uso..." | Validated in repository with fieldErrors | OK | -- |
| Save success: toast/snackbar | Not visible in form component | NEEDS VERIFICATION in action redirect | MINOR |

---

## Secao 4: Ficha Tecnica -- Divergences

### 4.1 Bloco 1: Identificacao

| Spec Field | Current Code | Status | Priority |
|---|---|---|---|
| Cod. (auto-generated, editable, unique) | NO code field in ficha-form.tsx | CRITICAL: missing Codigo field | CRITICAL |
| Produto (text livre, campo mais largo) | `displayName` TextField | OK | -- |
| Data de Criacao (readonly, fixed on first save) | ReadonlyTextField "Data de criacao" | OK | -- |
| Data/Hora Ultima Alteracao (readonly, updates each save) | ReadonlyTextField "Data e hora da ultima alteracao" | OK | -- |
| Versao (below Data Ultima Alteracao, V1/V2/V3, auto-increment) | NOT displayed in the form | CRITICAL: missing version display | CRITICAL |
| Modalidade (dropdown from cadastro) | TextField select with modalityOptions | OK | -- |
| Grupo Operacional (dropdown from cadastro) | TextField for groupOperational but it's a free text field, not dropdown | DIVERGENCE: spec says dropdown from cadastro de grupos | IMPORTANT |
| Status (Ativa/Inativa, pre-loaded as Ativa) | Dropdown with rascunho/ativa/inativa/arquivada | DIVERGENCE: spec only defines Ativa/Inativa, code has extra statuses | IMPORTANT |
| Custo Atual da Ficha (readonly, blue, R$ large) | ReadonlyTextField "Custo atual da ficha" with formatCurrency | DIVERGENCE: no blue/large visual styling | IMPORTANT |

### 4.2 Bloco 2: Estrutura (Ingredient Grid)

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Drag handle (6 dots, grab cursor) for reorder | NOT implemented -- no drag and drop | CRITICAL | CRITICAL |
| Item/Produto dropdown (excludes circular refs) | Select dropdown with all itemOptions | DIVERGENCE: no circular reference filtering in the dropdown | CRITICAL |
| N1/N2/N3 level labels below item name | `levelLabel` field exists, shown in "Camada" column | OK (partially -- shown as separate column not below name) | MINOR |
| Qtde usada (4 decimals) | TextField type number step 0.0001 | OK | -- |
| Unidade (readonly from item cadastro) | TextField editable for usageUnit | DIVERGENCE: spec says readonly (from item), code allows editing | IMPORTANT |
| Etapa (Limpeza/Pre-Preparo or Coccao/Preparo) per ingredient line | Etapa is at STAGE level, not per-ingredient line | DIVERGENCE: spec describes etapa as optional per ingredient line with dropdown, code uses stage-level architecture | IMPORTANT (architectural difference but functionally similar) |
| Peso Limpo (when Limpeza etapa) | Stage outputQuantity serves this purpose | OK (at stage level) | -- |
| Peso Pos-coccao (when Coccao etapa) | Stage outputQuantity | OK (at stage level) | -- |
| FC per line (Qtde Usada / Peso Limpo) | Computed at stage level | OK (at stage level) | -- |
| IC per line (Qtde Usada / Peso Pos-coccao) | Computed at stage level | OK (at stage level) | -- |
| Custo unitario (preco de uso, readonly) | "Custo Unit." column from itemOptions.currentCost | OK | -- |
| Custo Insumo (custo unit x qtde, shows "--" when etapa active but no Qtde Final) | Calculated subtotal | DIVERGENCE: always shows calculated value, doesn't show "--" when etapa has no output | IMPORTANT |
| Warning icon for items used in other fichas | `relatedFichaWarnings` Alert at top of structure, not per-line icon | DIVERGENCE: spec says inline icon per line with tooltip, code shows global Alert | IMPORTANT |
| Delete button per line | IconButton delete exists | OK | -- |
| Disable "Adicionar Etapa" for ficha intermediaria ingredients | Not implemented | MISSING | IMPORTANT |

### 4.3 Coccao / Preparo Final

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Separate optional block below grid | Not a distinct block -- cocao is just another stage type | DIVERGENCE: spec wants a dedicated "Coccao Final" block with specific behavior (only one per ficha, fixed type, not editable), code uses generic stages | IMPORTANT |
| Button "Adicionar Coccao Final" next to "+ Adicionar Itens" | No dedicated Coccao Final button | MISSING | IMPORTANT |
| Rendimento da Porcao syncs bidirectionally with Quadro Final strip | `portions` field in Identificacao, no bidirectional sync | MISSING: no bidirectional sync between Coccao Final rendimento and Quadro Final strip | IMPORTANT |
| Only one Coccao Final per ficha | Code allows multiple stages of coccao_preparo type | DIVERGENCE | IMPORTANT |
| Button disappears after activation, reappears on removal | Not implemented (no dedicated button) | MISSING | MINOR |

### 4.4 Montagem e Descartaveis

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Toggle button "Ativar Montagem e Descartaveis" | Button exists: "Ativar Montagem e Descartaveis" / "Ocultar montagem e descartaveis" | OK | -- |
| Grid: handle, Item, Qtde, Unidade, Custo Unit, Custo Insumo, Delete | IngredienteDataGrid renders Item, Tipo, Qtde, Unidade, Custo Unit, Custo Insumo, Camada, Delete | DIVERGENCE: has extra "Tipo" and "Camada" columns, missing drag handle | IMPORTANT |
| No FC/IC columns | No etapa for assembly rows | OK | -- |
| Impact on Quadro Final with toggle | Toggle switches CMV calculations | OK | -- |

### 4.5 Bloco 3: Finalizacao

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Modo de Preparo (optional) | TextField multiline, name "preparationMode" | OK | -- |
| Observacoes da Ficha (optional) | TextField multiline, name "notes" | OK | -- |

### 4.6 Bloco 4: Quadro Final

#### Strip superior (4 cells)

| Spec Field | Current Code | Status | Priority |
|---|---|---|---|
| Rendimento da Porcao (syncs with Coccao Final) | "Peso final" in TotaisIndicadores as readonly metric row | DIVERGENCE: spec wants editable Rendimento in strip that syncs with Coccao Final; code has it as readonly metric | CRITICAL |
| Unidade de Rendimento (dropdown: kg, un, porcao, litro, editable) | Not in strip -- shown as metric "Total de peso" | MISSING in Quadro Final | CRITICAL |
| FC (media ponderada, green/red color) | "Fator coccao BRUTO" metric row, no color rules | DIVERGENCE: no green/red color based on value | IMPORTANT |
| IC (derived from Coccao Final or media ponderada, green/red) | "Fator coccao LIMPO" metric row, no color rules | DIVERGENCE: no green/red color | IMPORTANT |

**Note:** The spec describes a horizontal "strip" (4 cells side by side). Current implementation uses vertical metric rows in a card called "Pesos e rendimento". This is a layout divergence.

#### Card Custos e CMV

| Spec Field | Current Code | Status | Priority |
|---|---|---|---|
| Toggle Montagem | Button in header action | OK | -- |
| Custo total da ficha (ambar/dourado) | "Custo total da ficha" metric row with custom.custo color | OK | -- |
| CMV sem embalagem (per kg) | "CMV sem embalagem" row | OK | -- |
| Custo embalagens (muted when toggle off) | "Custo de embalagens e descartaveis" with muted opacity | OK | -- |
| CMV com embalagem (muted when toggle off) | "CMV com embalagem" with muted opacity | OK | -- |
| CMV final aplicado (highlighted) | "CMV final aplicado" with highlight | OK | -- |

#### Card Venda e Margem

| Spec Field | Current Code | Status | Priority |
|---|---|---|---|
| Preco de venda (editable input R$) | TextField with AttachMoneyIcon | OK | -- |
| Despesa variavel (%PV, editable) | TextField with PercentIcon | OK | -- |
| CMV do kg (%PV) | "CMV do kg (%PV)" row | OK | -- |
| Despesa variavel aplicada | "Despesa variavel aplicada" row | OK | -- |
| Margem de contribuicao R$ (green) | "Margem de contribuicao R$" row | OK (but no explicit green color) | MINOR |
| Margem de contribuicao % (green) | "Margem de contribuicao %" row | OK (but no explicit green color) | MINOR |
| Barra visual de margem (green >60%, ambar 35-60%, red <35%) | LinearProgress health bar | DIVERGENCE: progress bar exists but thresholds use CMV health (<=30/31-40/>40) not margin (>60/35-60/<35) | IMPORTANT |
| Badge Saude do CMV (<=30 green, 31-40 ambar, >40 red) | Chip with cmvHealthStatus | OK (thresholds match: <=30 Saudavel, 31-40 Atencao, >40 Critico) | OK |

#### Card Leitura Operacional (4 columns justified)

| Spec Field | Current Code | Status | Priority |
|---|---|---|---|
| Preco de Referencia (dourado) | "Preco de Referencia" metric row | OK | -- |
| Custo Real da Ficha (green) | "Custo Real da Ficha" highlighted | OK | -- |
| Despesa Variavel (%) | "Despesa Variavel" row | OK | -- |
| Margem de Contribuicao (R$ + %, green) | "Margem de Contribuicao" row | DIVERGENCE: spec wants combined format "R$52,70 - 59,95%", code shows only R$ value | IMPORTANT |
| Diagnostico automatico (full width, ambar bg) | "Diagnostico automatico" text below | DIVERGENCE: spec says ambar background (#FFF3CD-like), code has no special background | IMPORTANT |
| Layout: 4 columns justified | Vertical metric rows | DIVERGENCE: spec says 4 columns side by side, code uses vertical list | IMPORTANT |

### 4.7 Technical Blocks

| Spec Requirement | Current Code | Status | Priority |
|---|---|---|---|
| Circular reference prevention (direct) | Not verified in dropdown filtering | NEEDS VERIFICATION in repository | CRITICAL |
| Circular reference prevention (indirect/recursive) | assertNoCyclesBeforeSaving exists in engineering repository | OK (backend check exists) | -- |
| Cascade recalculation | recalculateCascade exists | OK | -- |
| Zero/negative rendimento prevention | Not explicitly checked in ficha-form-schema | NEEDS VERIFICATION | IMPORTANT |
| Version auto-increment on save | NEEDS VERIFICATION in save action | IMPORTANT |

---

## Priority Summary

### CRITICAL (must fix -- features missing or fundamentally wrong)

1. **Grade Itens: Missing Status column** -- spec column #13
2. **Grade Itens: Extra columns (Custo Total, Ficha)** -- not in spec
3. **Grade Itens: No custom badge hex colors for Tipo** -- spec defines 7 types with specific hex
4. **Grade Itens: Fornecedor column wrong position and no "+N" format**
5. **Grade Itens: Sorting disabled on 4 spec-sortable columns** (Nome, Preco Compra, Preco Uso, Ult. Atualizacao)
6. **Grade Itens: Missing Categoria Operacional filter**
7. **Grade Fichas: Card label "Versionamento" should be "FICHAS TECNICAS"**
8. **Grade Fichas: Missing Preco de Venda column**
9. **Grade Fichas: Separate Version column -- should be inline badge in Produto**
10. **Grade Fichas: No FC/IC color rules** (green/red/gray)
11. **Grade Fichas: Missing Modalidade and Grupo Operacional filters**
12. **Grade Fichas: Ult. Atualizacao uses relative time instead of dd/mm/aa hh:mm**
13. **Cadastro Item: Description field REQUIRED in schema but spec says OPTIONAL**
14. **Cadastro Item: Fator de Conversao is editable but spec says calculated (readonly)**
15. **Ficha Tecnica: Missing Codigo field**
16. **Ficha Tecnica: Missing version display (V1/V2/V3)**
17. **Ficha Tecnica: No drag-and-drop reorder on ingredient grid**
18. **Ficha Tecnica: Quadro Final strip missing editable Rendimento and Unidade dropdown**
19. **Ficha Tecnica: Circular reference not filtered in dropdown** (only backend check)

### IMPORTANT (behavior exists but doesn't match spec)

1. Grade Itens: All column widths wrong (much wider than spec)
2. Grade Itens: Column order differs from spec
3. Grade Itens: Card label lowercase vs uppercase
4. Grade Itens: Row height 72px vs spec 42px
5. Grade Itens: Min table width 1680px vs spec 1280px
6. Grade Itens: Real-time filtering not implemented (form submit)
7. Grade Itens: Empty/zero values show "R$ 0,00" not "--"
8. Grade Itens: No empty state messages
9. Grade Fichas: Badge colors use MUI palette not spec hex
10. Grade Fichas: Width and layout differences
11. Cadastro Item: Block structure wrong (description in block 1, should be block 3)
12. Cadastro Item: Section titles don't match spec
13. Cadastro Item: No green styling on calculated fields
14. Cadastro Item: Missing fields per purchase row (Un. Uso, Qtde Uso, Fator, Preco Uso)
15. Cadastro Item: No duplicate supplier warning
16. Ficha Tecnica: Grupo Operacional is free text, spec says dropdown
17. Ficha Tecnica: Extra statuses (rascunho, arquivada) beyond spec's Ativa/Inativa
18. Ficha Tecnica: No dedicated Coccao Final block (uses generic stages)
19. Ficha Tecnica: Quadro Final Leitura Operacional vertical vs spec 4-column layout
20. Ficha Tecnica: Diagnostico without ambar background
21. Ficha Tecnica: Margem format should combine R$ + %
22. Ficha Tecnica: Warning icon for reused items is global Alert not per-line icon
23. Ficha Tecnica: Unidade on ingredient grid is editable, spec says readonly

### MINOR (cosmetic)

1. Grade Itens: Button "Novo item" vs "+ Novo item" (icon covers the +)
2. Grade Itens: Date format uses full year not 2-digit
3. Grade Itens: Pagination text format
4. Grade Fichas: Title "Fichas tecnicas" lowercase t
5. Grade Fichas: Column width differences
6. Ficha Tecnica: Margem contribution missing green color
7. Ficha Tecnica: Assembly grid has extra columns (Tipo, Camada)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The PDF spec text extracted via pdftotext is complete and accurate | All | Columns/rules could be misread from PDF formatting |
| A2 | The "Fator de Conversao" in item form spec means calculated (Qtde Compra / Qtde Uso) | Secao 3.2 | If spec means editable, current code is correct |
| A3 | Extra statuses (rascunho, arquivada) in fichas are intentional project additions beyond spec | Secao 2.5, 4.1 | If spec intended to limit to Ativa/Inativa only, these need removal |
| A4 | The spec "Qtde de Uso" is a required editable field (not Qtde Compra / Fator as currently coded) | Secao 3.2 | Changes the calculated field direction |

**Important note on A2/A4:** The spec says in the Compras block:
- "Qtde de compra: Obrigatorio, Numero, Quantidade da embalagem/unidade de compra"
- "Qtde de uso: Obrigatorio, Numero, Quantidade equivalente na unidade de uso"
- "Fator de conversao: Somente leitura, Calculado: Qtde de Compra / Qtde de Uso"

This means BOTH Qtde Compra AND Qtde Uso are user-entered, and Fator = Compra/Uso is auto-calculated. Current code has Fator as user-entered and Qtde Uso as calculated. **This is inverted from the spec.**

## Open Questions

1. **Extra type values (produto_pronto, marmita, combo):** The spec only lists Insumo, Intermediario, Embalagem, Prato, Porcao, Pre-preparo, Apoio as badge types. Are the additional types (produto_pronto, marmita, combo) kept from earlier development and need removal, or are they valid but just don't have badge colors?

2. **Extra ficha statuses (rascunho, arquivada):** Spec defines only Ativa/Inativa for fichas. The code has rascunho and arquivada. Should these be kept or removed?

3. **Column widths:** Spec defines very tight widths (e.g., Qtde Compra at 72px, Un. Compra at 56px) that may be impractical for actual data display at typical font sizes. Should we match exactly or allow reasonable minimums?

4. **Fator de Conversao direction:** Spec says Fator = Qtde Compra / Qtde Uso (both user-entered, fator calculated). Current code has Fator user-entered and Qtde Uso calculated. This is a fundamental data entry flow difference. Confirm which direction is correct.

## Sources

### Primary (HIGH confidence)
- SIS-Restaurante-Especificacoes-v1.pdf -- full text extracted via pdftotext, all 4 sections analyzed
- Source code files read directly:
  - `src/modules/catalog/ui/items-listing-view.tsx`
  - `src/modules/engineering/ui/fichas-listing-view.tsx`
  - `src/modules/catalog/ui/item-form.tsx`
  - `src/modules/catalog/ui/purchases-editor.tsx`
  - `src/modules/engineering/ui/ficha-form.tsx`
  - `src/modules/engineering/ui/components-editor.tsx`
  - `src/modules/engineering/ui/IngredienteDataGrid.tsx`
  - `src/modules/engineering/ui/TotaisIndicadores.tsx`
  - `src/components/ui/data-grid-pattern.tsx`
  - `src/components/ui/StatusChip.tsx`
  - `src/modules/catalog/server/catalog-repository.ts`
  - `src/modules/catalog/server/item-form-schema.ts`
  - `src/app/(app)/itens/page.tsx`
  - `src/app/(app)/fichas/page.tsx`

## Metadata

**Confidence breakdown:**
- Grade de Itens gaps: HIGH -- every column compared line by line
- Grade de Fichas gaps: HIGH -- every column compared
- Cadastro de Item gaps: HIGH -- fields and schema verified
- Ficha Tecnica gaps: HIGH -- all blocks compared, Quadro Final verified

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable spec, changes only if PDF is updated)
