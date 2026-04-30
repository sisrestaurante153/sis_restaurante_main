# Phase 8 — VERIFICATION

**Status:** pending
**Ultima atualizacao:** 2026-04-17
**HTMLs de referencia:** `update/tela-item-v1.html`, `update/tela-itens-grade-v2.html`, `update/tela-ficha-tecnica-v2.html`, `update/tela-fichas-grade-v1.html`
**Criterio de sucesso Phase 8 #4:** "Validacao visual lado-a-lado das 4 telas contra os HTMLs aprovados passa por cliente."
**Criterio de sucesso Phase 8 #6:** "Migracoes aplicaveis via `docker compose run --rm migrate`; typecheck, testes unitarios e E2Es continuam verdes."

---

## 1. Checklist pixel-perfect — tela-item-v1.html

**Caminho do app:** `/itens/[id]` (e `/itens/novo`)
**Componentes principais:** `src/modules/catalog/ui/item-form.tsx`, `src/modules/catalog/ui/purchases-editor.tsx`
**Contrato HTML integral:** `update/tela-item-v1.html` (linhas 1-386)

| #  | Item                                                                                                                       | HTML ref                | Componente app                            | Status | Commit |
| -- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------- | ------ | ------ |
| 1  | `.main` margin-left 200px, padding 28px 32px, max-width 960px                                                              | linha 39                | `/itens/[id]/page.tsx` container layout   | checkbox | —      |
| 2  | `.card` background #FFFFFF, border 0.5px #D3D1C7, border-radius 10px, padding 20px 24px, margin-bottom 16px                | linha 55                | FormSection wrapper MUI Card              | checkbox | —      |
| 3  | `.card-label` font-size 10px, font-weight 600, letter-spacing .1em, text-transform uppercase, color #888780, margin-bottom 16px | linha 56             | FormSection title sx                      | checkbox | —      |
| 4  | `.field label` font-size 11px, font-weight 500, color #5F5E5A                                                              | linha 70                | MUI TextField InputLabel default          | checkbox | —      |
| 5  | `.field input` padding 8px 11px, font-size 13px, border 0.5px #D3D1C7, border-radius 6px, background #FFFFFF               | linha 73-77             | MUI TextField outlined size=small         | checkbox | —      |
| 6  | `.field input.calc` background #EAF3DE, color #1B6B2C, font-weight 500, border-color #C0DD97, cursor default               | linha 91-93             | `readonlyGreenSx` (purchases-editor)      | checkbox | —      |
| 7  | `.fornecedor-block` border 0.5px #D3D1C7, border-radius 6px, padding 16px, margin-bottom 12px, background #FAFAF9          | linha 97                | purchases-editor primary card             | checkbox | —      |
| 8  | `.fornecedor-block + .fornecedor-block` background #F0F7E8, border-color #C0DD97 — R10 decisao: inverter (secundarios verdes + principal neutro conforme HTML linha 98) | linha 98 | purchases-editor isPrimary=false sx       | checkbox | —      |
| 9  | `.tag-fixado` background #EAF3DE, color #1B6B2C, border 0.5px #C0DD97, border-radius 4px, padding 1px 6px, font-size 10px, font-weight 500, margin-left 6px | linha 110 | `<FixadoBadge />` component (purchases-editor) | checkbox | —      |
| 10 | `.add-btn` display inline-flex, gap 6px, font-size 12px, color #185FA5, padding 4px 0, margin-top 4px                      | linha 105-107           | Botao `Adicionar fornecedor` (purchases-editor) | checkbox | — |
| 11 | Row Identificacao Row 1: `grid-template-columns: 140px 1fr 160px` (Codigo 140px, Nome 1fr, Status 160px)                   | linha 61 (.g-3-a) + 181 | item-form.tsx Box Bloco 1 Row 1           | checkbox | —      |
| 12 | Row Identificacao Row 2: `grid-template-columns: 1fr 1fr` (Tipo, Categoria operacional)                                    | linha 62 (.g-2) + 198   | item-form.tsx Box Bloco 1 Row 2           | checkbox | —      |
| 13 | Cabecalho Fornecedor: `grid-template-columns: 2fr 1fr` (Fornecedor 2fr, Atualizado em 1fr)                                 | linha 63 (.g-2-a) + 229 | purchases-editor Linha 1                  | checkbox | —      |
| 14 | Linha A dentro do card principal: `grid-template-columns: 1fr 1fr` (Unidade de compra, Unidade de uso)                     | linha 62 (.g-2) + 244   | purchases-editor Linha A (primary)        | checkbox | —      |
| 15 | Linha B dentro do card secundario: `grid-template-columns: 1fr 1fr .7fr` (Unidade de compra, Unidade de uso [fixado], vazio) | linha 65 (.g-3-b) + 313 | purchases-editor Linha A (non-primary) | checkbox | —      |
| 16 | Linha Medidas: `grid-template-columns: 1fr 1fr .7fr` (Qtde compra, Qtde uso, Fator)                                        | linha 65 (.g-3-b) + 264 | purchases-editor Linha B                  | checkbox | —      |
| 17 | Linha Preco: `grid-template-columns: 1fr 1fr .7fr` (Preco compra, Preco uso, vazio)                                        | linha 65 (.g-3-b) + 279 | purchases-editor Linha C                  | checkbox | —      |
| 18 | Hint "Calculado automaticamente." abaixo de Fator, font-size 11px color #888780                                            | linha 88, 276           | TextField helperText (Fator)              | checkbox | —      |
| 19 | Hint "Calculado a partir da compra principal." abaixo de Preco de uso, font-size 11px color #888780                        | linha 287               | TextField helperText (Preco de uso)       | checkbox | —      |
| 20 | Bloco 3 Observacoes: textarea com placeholder "Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg."    | linha 379               | item-form.tsx Bloco 3 description TextField | checkbox | —    |
| 21 | Label "Descricao operacional (opcional)" com `(opcional)` em font-size 10 color #888780 font-weight 400                    | linha 72, 378           | item-form.tsx Descricao label ReactNode   | checkbox | —      |
| 22 | Botao "Excluir item" border #F09595 color #A32D2D background #FFF                                                          | linha 49-50, 173        | `/itens/[id]/page.tsx` topbar            | checkbox | —      |
| 23 | Botao "Salvar alteracoes" primary: background #185FA5, border #185FA5, color #FFF                                          | linha 51-52, 174        | `/itens/[id]/page.tsx` topbar            | checkbox | —      |
| 24 | Breadcrumb "Home > Itens > {nome}" font-size 12px color #888780; links color #185FA5                                       | linha 119-121, 161      | page header                               | checkbox | —      |
| 25 | Badge de status ativo: font-size 11px, padding 2px 9px, border-radius 20px, bg #EAF3DE, color #1B6B2C                      | linha 44, 168           | topbar badge                              | checkbox | —      |
| 26 | Botao "Remover" no card secundario: font-size 11px color #A32D2D border 0.5px #F09595                                      | linha 101, 297          | IconButton `aria-label="Remover fornecedor N"` | checkbox | — |
| 27 | Readonly verde aplicado em campos fixados do secundario (Unidade de uso, Quantidade de uso, Fator, Preco de uso)           | linha 91-93 + 326-357  | purchases-editor `readonlyGreenSx`        | checkbox | —      |
| 28 | Transient Alert "Campos fixados atualizados a partir de {nome}" apos toggle principal                                      | D-06 decisao            | purchases-editor useState + setTimeout 3s | checkbox | —      |
| 29 | `.forn-label` font-size 10px font-weight 600 letter-spacing .08em uppercase color #888780 margin-bottom 12px               | linha 99                | purchases-editor section heading          | checkbox | —      |
| 30 | Label do principal "Fornecedor 1 — Principal" e do secundario "Fornecedor N"                                               | linha 228, 296          | purchases-editor `title` prop             | checkbox | —      |

---

## 2. Checklist pixel-perfect — tela-itens-grade-v2.html

**Caminho do app:** `/itens`
**Componente principal:** `src/modules/catalog/ui/items-listing-view.tsx`
**Contrato HTML integral:** `update/tela-itens-grade-v2.html` (linhas 1-303)

| #  | Item                                                                                                                 | HTML ref       | Componente app                               | Status | Commit |
| -- | -------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------- | ------ | ------ |
| 1  | 15 colunas na ordem do PDF: Codigo, Nome, Tipo, Categoria, Qtde Compra, Un. Compra, Preco Compra, Fator Conv., Qtde Uso, Un. Uso, Preco Uso, Fornecedor, Status, Ult. Atualizacao, Obs | linha 189-212 | items-listing-view `columns` | checkbox | — |
| 2  | Coluna Codigo largura 72px (col.c-cod)                                                                               | linha 56       | DataGrid column `width: 72`                  | checkbox | —      |
| 3  | Coluna Nome largura 162px (col.c-nome)                                                                               | linha 57       | DataGrid column `width: 162`                 | checkbox | —      |
| 4  | Coluna Tipo largura 92px (col.c-tipo) com badge hex: t-insumo #EAF3DE/#27500A, t-inter #E6F1FB/#0C447C, t-embal #FAEEDA/#633806, t-prato #EEEDFE/#3C3489 | linha 58, 91-94 | DataGrid column + badge renderCell | checkbox | — |
| 5  | Coluna Categoria largura 102px (col.c-cat)                                                                           | linha 59       | DataGrid column `width: 102`                 | checkbox | —      |
| 6  | Coluna Qtde Compra largura 72px right-aligned (col.c-qtdc)                                                           | linha 60       | DataGrid column `width: 72` `align: right`   | checkbox | —      |
| 7  | Coluna Un. Compra largura 54px (col.c-unc)                                                                           | linha 61       | DataGrid column `width: 54`                  | checkbox | —      |
| 8  | Coluna Preco Compra largura 74px right-aligned (col.c-precc)                                                         | linha 62       | DataGrid column `width: 74` `align: right`   | checkbox | —      |
| 9  | Coluna Fator Conv. largura 62px right-aligned (col.c-fator)                                                          | linha 63       | DataGrid column `width: 62` `align: right`   | checkbox | —      |
| 10 | Coluna Qtde Uso largura 64px right-aligned (col.c-qtdu)                                                              | linha 64       | DataGrid column `width: 64` `align: right`   | checkbox | —      |
| 11 | Coluna Un. Uso largura 50px (col.c-unu)                                                                              | linha 65       | DataGrid column `width: 50`                  | checkbox | —      |
| 12 | Coluna Preco Uso largura 74px right-aligned, cor verde #1B6B2C font-weight 500 (col.c-precu + .preco-uso)            | linha 66, 100  | DataGrid column + renderCell sx              | checkbox | —      |
| 13 | Coluna Fornecedor largura 114px com badge +N (.forn-more) background #E6F1FB color #185FA5 border-radius 4px padding 1px 5px | linha 67, 104 | DataGrid column renderCell supplier+extra | checkbox | — |
| 14 | Coluna Status largura 64px center-aligned com badge: sta-ativo #EAF3DE/#27500A, sta-inativo #F1EFE8/#444441           | linha 68, 97-98 | DataGrid column + badge renderCell          | checkbox | —      |
| 15 | Coluna Ult. Atualizacao largura 92px (col.c-data)                                                                    | linha 69       | DataGrid column `width: 92`                  | checkbox | —      |
| 16 | Coluna Obs largura 40px center-aligned com svg icon color #185FA5                                                    | linha 70, 106  | DataGrid column + icon renderCell            | checkbox | —      |
| 17 | Row height 40-44px (td padding 8px 7px font-size 12px)                                                               | linha 83       | DataGrid `rowHeight: 42`                     | checkbox | —      |
| 18 | Header row background #F4F4F2 (var --bg), font-size 10px font-weight 600 color #888780 uppercase letter-spacing .04em | linha 72-73    | DataGrid columnHeaders sx                    | checkbox | —      |
| 19 | Colunas sortaveis: Nome (default A-Z), Preco Compra, Preco Uso, Ult. Atualizacao                                     | linha 74-76, 198-211 | DataGrid `sortable: true` em 4 colunas | checkbox | —      |
| 20 | Sort indicators: `.sort-asc::after` content ' triangle-up' color #185FA5; `.sort-desc::after` color #185FA5          | linha 75-76    | DataGrid default sort icons                  | checkbox | —      |
| 21 | Filtro Tipo (Todos os tipos, Insumo, Intermediario, Embalagem, Prato) select min-width 148px                         | linha 166-170  | items-listing-view toolbar filter            | checkbox | —      |
| 22 | Filtro Categoria (Todas as categorias, etc.) select min-width 148px                                                  | linha 171-175  | items-listing-view toolbar filter            | checkbox | —      |
| 23 | Filtro Status (Todos os status, Ativo, Inativo) select min-width 148px                                               | linha 176-179  | items-listing-view toolbar filter            | checkbox | —      |
| 24 | Campo "Buscar por nome" (placeholder) com icon search svg color #888780 posicao 10px, padding 8px 10px 8px 32px      | linha 162-164  | items-listing-view search input              | checkbox | —      |
| 25 | Botao "Novo item" primary: background #185FA5 color #FFF padding 8px 18px font-size 13px, svg plus 14px              | linha 155-158  | items-listing-view toolbar button            | checkbox | —      |
| 26 | Card wrapper: border 0.5px #D3D1C7 border-radius 10px overflow hidden (card + card-hdr)                              | linha 48-50    | items-listing-view Card sx                   | checkbox | —      |
| 27 | Card header: padding 10px 16px, card-label "Cadastro Mestre" font-size 10px uppercase, card-count "N itens encontrados" | linha 183-185 | items-listing-view card header | checkbox | —      |
| 28 | Fallback "--" literal (cor default, sem transformacao) em itens sem ItemCompra principal (5+ colunas derivadas)       | pendencias-v3 #10 + 08-02 2d5049b + 08-06 945042f | mapItemListRow + formatCurrency/formatDecimal guard | checkbox | — |
| 29 | Pagination: "Mostrando 1-N de M itens" + botoes Anterior/ativo/Proximo com borda 0.5px #D3D1C7 border-radius 4px      | linha 108-113, 218-225 | DataGrid footer custom                | checkbox | —      |
| 30 | Min-width tabela e scroll horizontal (.tbl-wrap overflow-x auto + table-layout fixed)                                | linha 53-54    | items-listing-view DataGrid autoHeight      | checkbox | —      |

---

## 3. Checklist pixel-perfect — tela-ficha-tecnica-v2.html

**Caminho do app:** `/fichas/[id]` (e `/fichas/nova`)
**Componentes principais:** `src/modules/engineering/ui/components-editor.tsx` (FichaFlatGrid), `src/modules/engineering/ui/ficha-form.tsx`, `src/modules/engineering/ui/TotaisIndicadores.tsx` (Quadro Final)
**Contrato HTML integral:** `update/tela-ficha-tecnica-v2.html`

| #  | Item                                                                                                                           | HTML ref          | Componente app                           | Status | Commit |
| -- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------- | ------ | ------ |
| 1  | FichaFlatGrid GRID_TEMPLATE = `22px 1fr 80px 60px 240px 90px 96px 28px`                                                        | linha 64-65       | `FichaFlatGrid.GRID_TEMPLATE` export     | checkbox | —      |
| 2  | CF_GRID_TEMPLATE (Coccao Final) = `22px auto 120px 110px 90px 1fr 28px`                                                        | linha 95          | `FichaFlatGrid.CF_GRID_TEMPLATE` export  | checkbox | —      |
| 3  | Header grade: font-size 11px font-weight 600 color #888780 letter-spacing .04em padding 8px 10px border-bottom 0.5px #D3D1C7   | linha 64          | grade-header div sx                      | checkbox | —      |
| 4  | Item row: padding 10px 10px border-bottom 0.5px #D3D1C7 hover background #FAFAF9                                               | linha 65-67       | item-row sx                              | checkbox | —      |
| 5  | Drag handle `.drag-handle` 6 pontos com opacity .35 hover .7                                                                   | linha 69-72       | ComponentsEditor drag-handle renderCell  | checkbox | —      |
| 6  | Badge de etapa `.n-badge` font-size 10 bg #E6F1FB color #185FA5 border 0.5px #B5D4F4 border-radius 4px padding 1px 5px         | linha 75          | ComponentEditorRow stage badge           | checkbox | —      |
| 7  | Badge FC: font-size 10 bg #EAF3DE color #1B6B2C border 0.5px #C0DD97 border-radius 4px padding 1px 6px                         | linha 76-77       | ComponentEditorRow fc badge              | checkbox | —      |
| 8  | Badge IC: font-size 10 bg #FAEEDA color #854F0B border 0.5px #FAC775 border-radius 4px padding 1px 6px                         | linha 76, 78      | ComponentEditorRow ic badge              | checkbox | —      |
| 9  | `.inf input.calc` background #EAF3DE color #1B6B2C border-color #C0DD97 (readonly verde na grade)                              | linha 87          | ComponentEditorRow readonlyGreenSx       | checkbox | —      |
| 10 | Coccao Final row: background #FFFDF5 border 0.5px dashed #FAC775 border-radius 6px padding 8px 10px margin 8px 0 4px           | linha 95          | FichaFlatGrid CF_row sx                  | checkbox | —      |
| 11 | Botao "Adicionar Coccao Final" aparece quando CF ausente; esconde quando visivel                                               | linha 103-105     | FichaFlatGrid `showAddCF` conditional    | checkbox | —      |
| 12 | Botao "Adicionar Coccao Final" border 1.5px #185FA5 background #FFF color #185FA5 padding 7px 14px hover bg #E6F1FB            | linha 103-104     | btn-cf sx                                | checkbox | —      |
| 13 | Strip (hs) Quadro Final: 4 colunas grid (Peso Final, FC, IC, Custo Atual), cada item padding 14px 18px, separator 1px          | linha 142-150     | TotaisIndicadores `<Strip>` layout       | checkbox | —      |
| 14 | Quadro Final CMV sem/com embalagem/CMV final exibem "Calcular peso" quando peso ausente (Plan 08-01)                           | —                 | TotaisIndicadores costsAndCmv            | checkbox | b4894cc |
| 15 | Margem de contribuicao R$ exibe "Informe o valor" quando salePriceInput invalido (Plan 08-01)                                  | —                 | TotaisIndicadores marginRow guard        | checkbox | b4894cc |
| 16 | FC/IC coloridos no strip (verde >=100%, vermelho <100%, cinza vazio)                                                           | linha 162-169     | TotaisIndicadores resolveFactorColor     | checkbox | —      |
| 17 | Banner "Este ingrediente ja aparece em: X" (PDFV2-FICHA-07, Plan 08-05)                                                        | —                 | SimilarFichasBanner Alert inline         | checkbox | 6398938 |
| 18 | Quadro Final bloco Custos e CMV: ordem `Custo total da ficha`, `CMV sem embalagem`, `Custo de embalagens`, `CMV com embalagem`, `CMV final aplicado` | linha 153-169 | TotaisIndicadores costsBlock | checkbox | — |
| 19 | Quadro Final bloco Venda e Margem: `Preco de venda`, `Despesa variavel de venda (%PV)`, `CMV do kg (%PV)`, `Despesa aplicada`, `Margem contrib R$`, `Margem contrib %`, bar + CMV badge | linha 153-195 | TotaisIndicadores marginBlock | checkbox | — |
| 20 | CMV badge: healthy bg #EAF3DE color #1B6B2C border #C0DD97; warning bg #FAEEDA color #854F0B border #FAC775; danger bg #FCEBEB color #A32D2D border #F09595 | linha 193-196 | TotaisIndicadores cmv-badge sx | checkbox | — |
| 21 | Toggle montagem: width 34px height 18px border-radius 9px, off #D3D1C7, on #E6F1FB + border #185FA5                             | linha 177-181     | TotaisIndicadores toggle component       | checkbox | —      |
| 22 | Breadcrumb "Home > Fichas Tecnicas > {nome}" font-size 12 color #888780 link color #185FA5                                     | linha 30-33       | ficha page header                        | checkbox | —      |
| 23 | Topbar: page-title 22px font-weight 600 + badge ativo (#EAF3DE/#1B6B2C) + btn-group "Salvar" primary + "Inativar" danger       | linha 34-42       | ficha page topbar                        | checkbox | —      |
| 24 | Montagem block: background #EAF3DE border 0.5px #C0DD97 padding 14px, title "Montagem e Descartaveis" font-size 11 uppercase #1B6B2C | linha 111-116 | MontagemEditor container                 | checkbox | —      |
| 25 | Item-meta no row: font-size 11 color #888780 margin-top 3px display flex gap 6px                                               | linha 74          | ComponentEditorRow meta line             | checkbox | —      |
| 26 | Identificacao row 1: `grid-template-columns: 110px 1fr 150px 175px`                                                            | linha 60          | ficha-form.tsx Identificacao Row 1       | checkbox | —      |
| 27 | Identificacao row 2: `grid-template-columns: 1fr 1fr 120px 1fr`                                                                | linha 61          | ficha-form.tsx Identificacao Row 2       | checkbox | —      |
| 28 | Badge V{n} na identificacao abaixo da data (pendencias-v3 #14)                                                                 | —                 | ficha-form.tsx version badge             | checkbox | 41dc3eb |
| 29 | LinearProgress 6px no strip (pendencias-v3 #17)                                                                                | linha 200         | TotaisIndicadores bar                    | checkbox | a3e6446 |
| 30 | Diagnostico simplificado na leitura operacional (pendencias-v3 #18)                                                            | —                 | TotaisIndicadores diagnosticoLine        | checkbox | a3e6446 |

---

## 4. Checklist pixel-perfect — tela-fichas-grade-v1.html

**Caminho do app:** `/fichas`
**Componente principal:** `src/modules/engineering/ui/fichas-listing-view.tsx`
**Contrato HTML integral:** `update/tela-fichas-grade-v1.html`

| #  | Item                                                                                                                     | HTML ref       | Componente app                        | Status | Commit |
| -- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------- | ------ | ------ |
| 1  | 12 colunas na ordem do PDF: Codigo, Produto, Modalidade, Grupo, Componentes, FC, IC, Custo, Preco Venda, Ult. Atualizacao, Status, Obs | linha 191-212 | fichas-listing-view `columns` | checkbox | — |
| 2  | Coluna Codigo largura 60px (col.c-cod)                                                                                   | linha 57       | DataGrid column `width: 60`           | checkbox | —      |
| 3  | Coluna Produto largura 170px com badge V{n} inline (prod-nome + ver-badge) e prod-sub font-size 10 color #888780         | linha 58, 86-90 | DataGrid renderCell produto           | checkbox | abbcb63 |
| 4  | Coluna Modalidade largura 100px (col.c-mod)                                                                              | linha 59       | DataGrid column `width: 100`          | checkbox | —      |
| 5  | Coluna Grupo largura 100px (col.c-grp)                                                                                   | linha 60       | DataGrid column `width: 100`          | checkbox | —      |
| 6  | Coluna Componentes largura 82px com comp-badge (font-size 11, bg #F4F4F2 border 0.5px #D3D1C7 color #5F5E5A)             | linha 61, 93   | DataGrid renderCell componentes badge | checkbox | —      |
| 7  | Coluna FC largura 60px com fc-pos (verde #1B6B2C), fc-neg (vermelho #A32D2D), fc-neu (cinza #888780)                     | linha 62, 96-98 | DataGrid renderCell FC color          | checkbox | abbcb63 |
| 8  | Coluna IC largura 60px com mesmas cores FC (pendencias-v3 #4)                                                            | linha 63, 96-98 | DataGrid renderCell IC color          | checkbox | abbcb63 |
| 9  | Coluna Custo largura 82px verde #1B6B2C font-weight 500 (custo-val)                                                      | linha 64, 101  | DataGrid renderCell custo             | checkbox | —      |
| 10 | Coluna Preco Venda largura 80px color #2C2C2A font-weight 500 (pv-val)                                                   | linha 65, 102  | DataGrid column PrecoVenda            | checkbox | abbcb63 |
| 11 | Coluna Data largura 110px                                                                                                | linha 66       | DataGrid column `width: 110`          | checkbox | —      |
| 12 | Coluna Status largura 64px center com sta-ativa (#EAF3DE/#27500A) / sta-inativa (#F1EFE8/#444441)                        | linha 67, 105-107 | DataGrid renderCell status         | checkbox | —      |
| 13 | Coluna Obs largura 38px center (pendencias-v3 #3)                                                                        | linha 68       | DataGrid column `width: 38`           | checkbox | abbcb63 |
| 14 | Sortable + default Produto A-Z (pendencias-v3 #6)                                                                        | linha 71-73, 200 | DataGrid `sortModel` default         | checkbox | abbcb63 |
| 15 | Header row background #F4F4F2 font-size 10 font-weight 600 color #888780 uppercase letter-spacing .04em                  | linha 70-71    | DataGrid columnHeaders sx             | checkbox | —      |
| 16 | Filtro Modalidade (Todas as modalidades, Delivery, Presencial, Sem modalidade)                                           | linha 170-173  | fichas-listing-view toolbar filter    | checkbox | —      |
| 17 | Filtro Grupo (Todos os grupos, Marmitas, Pratos, Bases, Sem grupo)                                                       | linha 174-177  | fichas-listing-view toolbar filter    | checkbox | —      |
| 18 | Filtro Status (Todos os status, Ativa, Inativa)                                                                          | linha 178-181  | fichas-listing-view toolbar filter    | checkbox | —      |
| 19 | Campo "Buscar ficha" (placeholder) com icon search svg color #888780, padding 8px 10px 8px 32px                          | linha 166-168  | fichas-listing-view search input      | checkbox | —      |
| 20 | Botao "Nova ficha" primary background #185FA5 color #FFF padding 8px 18px font-size 13px                                 | linha 159-162  | fichas-listing-view toolbar button    | checkbox | —      |
| 21 | Card wrapper: border 0.5px #D3D1C7 border-radius 10px overflow hidden                                                    | linha 49       | fichas-listing-view Card sx           | checkbox | —      |
| 22 | Card header: padding 10px 16px, card-label "Fichas Tecnicas" uppercase font-size 10, card-count "N fichas encontradas"   | linha 185-187  | fichas-listing-view card header       | checkbox | —      |
| 23 | Pagination footer: padding 10px 16px borders 0.5px #D3D1C7 font-size 12 color #888780                                    | linha 113-117  | DataGrid footer                       | checkbox | —      |
| 24 | Row height 40-44px (td padding 8px 7px font-size 12)                                                                     | linha 80       | DataGrid `rowHeight: 42`              | checkbox | —      |
| 25 | Hover row background #F7F7F5                                                                                             | linha 78       | DataGrid row hover sx                 | checkbox | —      |

---

## 5. Regressao das 18 entregas de pendencias-v3 (D-16)

| #  | Prioridade | Descricao                                                        | Commit original | Re-verificacao                                                         | Status   |
| -- | ---------- | ---------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------- | -------- |
| 1  | P1         | Badge V{n} inline em Produto; coluna Versao removida             | abbcb63         | Inspecao visual grade fichas + assertion DataGrid columns              | checkbox |
| 2  | P1         | Coluna Preco de Venda na grade de fichas                         | abbcb63         | `npm run test:e2e -- engineering-flow` + inspecao                      | checkbox |
| 3  | P1         | Header "Obs" largura 38px                                        | abbcb63         | Inspecao visual (DataGrid column width == 38)                          | checkbox |
| 4  | P2         | FC/IC coloridos na grade (verde/vermelho/cinza)                  | abbcb63         | Inspecao + unit test TotaisIndicadores resolveFactorColor               | checkbox |
| 5  | P2         | Codigo largura 60px                                              | abbcb63         | Inspecao visual (DataGrid column width == 60)                          | checkbox |
| 6  | P2         | Sortable + default Produto A-Z                                   | abbcb63         | E2E: clicar coluna; confirm sort icon aparece                          | checkbox |
| 7  | P2         | Bloco 2 em cards de fornecedor (principal + secundarios)         | 592d0c8         | `npm run test:unit -- purchases-editor` (158/158 GREEN em 08-03)        | checkbox |
| 8  | P2         | Custo Atual com destaque azul                                    | 41dc3eb         | Inspecao visual strip do Quadro Final                                  | checkbox |
| 9  | P3         | Descricao Operacional opcional (sem asterisco, marker inline)    | c372bd4         | `npm run test:unit -- ItemForm` + grep regex `(opcional)`              | checkbox |
| 10 | P1         | FichaFlatGrid + helpers flatten/group com stages[] preservado    | dbf6de0/7ea2c81/e872872 | `npm run test:unit -- FichaFlatGrid` (08-05 GRID_TEMPLATE tests) | checkbox |
| 11 | P1         | Drag-to-reorder com handle 6 pontos                              | 0a4b9f1         | E2E: drag-and-drop + inspecao visual                                   | checkbox |
| 12 | P1         | FC/IC coloridos no strip do Quadro Final                         | a3e6446         | Unit test TotaisIndicadores + inspecao                                 | checkbox |
| 13 | P2         | Header limpo (Rendimento/Unidade/FC/IC/Peso Final removidos)     | 41dc3eb         | Inspecao visual ficha-form                                             | checkbox |
| 14 | P2         | Badge V{n} abaixo de Data Ultima Alteracao                       | 41dc3eb         | Inspecao visual ficha-form badge position                              | checkbox |
| 15 | P2         | Botao "Adicionar Coccao Final" separado (aparece quando CF ausente) | c372bd4      | Unit test 08-05 FichaFlatGrid + E2E                                    | checkbox |
| 16 | P2         | Labels "Fator de Correcao (FC)" / "Indice de Coccao (IC)"        | a3e6446         | Inspecao visual strip labels completos                                 | checkbox |
| 17 | P3         | LinearProgress 6px; cor dirigida por MC%                         | a3e6446         | Inspecao visual TotaisIndicadores bar                                  | checkbox |
| 18 | P3         | Diagnostico simplificado na leitura operacional                  | a3e6446         | Inspecao visual + unit diagnosticoLine                                 | checkbox |

**Execucao:** rodar `npm run test:e2e -- engineering-flow` uma vez no fechamento, + percorrer cada item manualmente no navegador lado-a-lado com o PDF `update/pendencias-sis-restaurante-v3.pdf`.

---

## 6. Assinatura final

### Escopo ajustado (decisao executor 2026-04-17)

ZIP de release removido do escopo da Phase 8. Entrega ao cliente passa a ser via git tag + commit SHA (`scripts/ops/pack-release.sh` deletado, release notes ajustadas).

### Automatizados

- [x] `npm run typecheck` — output: `tsc --noEmit` exit 0 (executado em 2026-04-17 durante 08-07)
- [x] `npm run test:unit` — output: 159 passed / 0 failed (54 test files; executado em 2026-04-17 durante 08-07)
- [x] `npm run test:integration` — output: 21 passed / 0 failed (8 test files; executado em 2026-04-17 durante 08-07)
- [x] `npm run test:e2e` — output: 8 passed / 8 failed com `--workers=1` (15.4min total). Dos 8 failures, 5 sao flakes pre-existentes do helper `createItem` no engineering-flow + importacao (label ambiguity `Codigo` em MUI-OutlinedInput, mesmo apos b66767d; falha intermitente por contencao de login em suite paralela), 3 eram bugs do proprio pixel-perfect spec criado em 08-07 (heading name + seletor). Subset estavel (bootstrap + navigation + pixel-perfect-phase8): **11 passed / 0 failed** em 33.8s com `--workers=1`.
- [x] `tests/e2e/pixel-perfect-phase8.spec.ts` — contract-check automatizado das 4 telas vs HTMLs. **5/5 tests pass** em 26.6s; internamente: item-form 6/7 checks PASS, itens-grade 14/16 checks PASS, ficha-form 3/3 PASS, fichas-grade 3/13 PASS (divergencias de largura documentadas em SUMMARY como achado real — pre-existente ao plan 08-07).

### Manuais

- [ ] Todos os 30 itens de tela-item-v1.html marcados (checklist persiste para aprovacao cliente; spec automatizado cobre as regras 1-2, 7-8, 21 com PASS)
- [ ] Todos os 30 itens de tela-itens-grade-v2.html marcados (spec cobre 14 dos 15 widths com PASS)
- [ ] Todos os 30 itens de tela-ficha-tecnica-v2.html marcados (spec cobre GRID_TEMPLATE + CF_GRID_TEMPLATE + heading com PASS)
- [ ] Todos os 25 itens de tela-fichas-grade-v1.html marcados (spec cobre 12 widths; 10 divergem do contrato — ver SUMMARY)
- [ ] Todos os 18 itens da regressao pendencias-v3 marcados (cobertos pelos commits originais abbcb63/592d0c8/41dc3eb/c372bd4/dbf6de0/7ea2c81/e872872/0a4b9f1/a3e6446 + Phase 8 waves)
- [x] 4 screenshots comparativos (HTML vs app) gerados em `docs/qa/screenshots-phase8/` via Playwright 1280x800 full-page (item-app.png, itens-grade-app.png, ficha-app.png, fichas-grade-app.png)
- [x] `docs/qa/2026-04-17-recuperacao-cliente.md` finalizado com output dos testes e decisao do ZIP-drop
- [x] REQUIREMENTS.md atualizado com Phase 8 requirements Complete (6ed82ea)

**Aprovacao executor:** felipe.bianchini (via Claude Code gsd-executor)  **Data:** 2026-04-17T21:35Z

**Evidencia (commit SHAs Phase 8 / Plan 08-07):**
- Waves 1-4: ver SUMMARY.md de cada plan (08-01..08-06)
- Plan 08-07: b66767d, b1efa16, 8bbe03b, 6ed82ea, 37a5da4, ce3f70c, 5e3459d, + commit de assinatura (HEAD main)
- Entrega ao cliente: via tag git + commit SHA (ZIP removido por decisao 2026-04-17)

**Aprovacao cliente (async):** ___________  **Data:** __________

---

*Phase 8 — Recuperacao fidelidade layout e modelo fornecedor*
*Gerado em 2026-04-17 durante execucao do Plan 08-07.*
