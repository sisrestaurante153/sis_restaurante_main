# Requirements: SIS Restaurante

**Defined:** 2026-04-01
**Core Value:** Operacao de engenharia de produto para restaurante com item mestre canonico, ficha tecnica recursiva, custo/rendimento rastreaveis e UX alinhada ao fluxo real da cozinha.

## v1.2 Requirements

### Bugs criticos e seguranca

- [x] **PDFV2-CRIT-01**: Usuario define o nome do produto da ficha como texto livre na UI sem depender do autocomplete de itens, preservando o vinculo canonico no backend para custo e rastreabilidade.
- [x] **PDFV2-CRIT-02**: Usuario consegue trocar o fornecedor em Compras / Fornecedores vendo todos os fornecedores cadastrados ao editar um item.
- [x] **PDFV2-CRIT-03**: O Quadro Final exibe `--` em `Venda de referencia` quando o valor de venda e nulo ou invalido; o sistema nunca mostra `R$ NaN`.
- [x] **PDFV2-CRIT-04**: O app falha com erro explicito se `SESSION_SECRET` estiver ausente no ambiente exigido; nenhum fallback hardcoded assina sessoes.
- [x] **PDFV2-CRIT-05**: O Quadro Final exibe `Calcular peso` em `CMV total` quando `Peso Final` estiver ausente, zero ou invalido; o sistema nunca deixa a linha em `-- / kg`.
- [x] **PDFV2-CRIT-06**: O Quadro Final nunca deixa `Margem de contribuicao` em branco por cascata de `Preco de venda` invalido; a leitura usa fallback coerente (`--` ou `Informe o valor`) e recalcula assim que o valor e informado.
- [x] **PDFV2-CRIT-07**: O Quadro Final nunca deixa `CMV da marmita` em branco por divisao invalida; quando faltar `Peso Final`, a leitura orienta o usuario com fallback coerente.

### Catalogo de itens

- [ ] **PDFV2-ITEM-01**: A grade de itens exibe as 13 colunas operacionais do PDF v2 e um icone de descricao com tooltip sem exigir abrir o detalhe.
- [x] **PDFV2-ITEM-02**: Todo item possui `codigo` auto-gerado, editavel e validado como unico no save.
- [x] **PDFV2-ITEM-03**: A tela de item e a grade mostram `Qtde de Uso` e `Preco de Uso` calculados a partir de `Qtde Compra / Fator` e `Preco Compra / Fator`.
- [x] **PDFV2-ITEM-04**: `Unidade de Compra` da identificacao e de Compras / Fornecedores ficam sincronizadas bidirecionalmente.
- [x] **PDFV2-ITEM-05**: A tela de item remove os cards laterais de rastreabilidade/custos e usa a largura principal para a secao de compras sem barra horizontal indevida.
- [ ] **PDFV2-ITEM-06**: `Qtde Compra` exibe ajuda contextual com exemplos praticos e alerta sobre coerencia entre preco e unidade.
- [x] **PDFV2-ITEM-07**: Exclusao definitiva de item so ocorre quando nao houver vinculos; com vinculos o sistema informa quantas fichas dependem dele.

### Ficha tecnica

- [x] **PDFV2-FICHA-01**: O cabecalho da ficha mostra produto livre, status discreto, `Peso Final -> FC -> IC` nesta ordem, com nomenclaturas corretas (`Fator de Correcao`, `Indice de Coccao`), formatacao percentual e custo atual visivel, removendo campos/cards descopados.
- [ ] **PDFV2-FICHA-02**: A estrutura da ficha usa fluxo hibrido linha-a-linha com etapa opcional, `Qtde Final` condicional e calculo automatico de FC/IC por linha a partir de `Peso Bruto`, `Peso Limpo` e `Peso Pos-coccao`.
- [ ] **PDFV2-FICHA-03**: Existe cadastro de tipos de etapa com defaults `Limpeza / Pre-Preparo`, `Coccao / Preparo` e `Montagem`, vinculando corretamente FC, IC ou ausencia de calculo.
- [x] **PDFV2-FICHA-04**: A grade de fichas exibe codigo, produto, versao, modalidade, grupo operacional, componentes, FC, IC, custo total, ultima atualizacao e icone de observacao.
- [ ] **PDFV2-FICHA-05**: A secao `Montagem e Descartaveis` pode ser ativada na ficha e o `CMV com Embalagem` so aparece/calcula quando essa secao estiver ativa.
- [x] **PDFV2-FICHA-06**: Campos removidos do cabecalho (`Mod. Rendimento`, `% de Coccao`, `Peso final (g)`) e o card lateral `Resumo de Custos` saem da UX sem quebrar a logica do backend.
- [x] **PDFV2-FICHA-07**: Ao adicionar ingrediente que ja aparece em outra ficha semelhante, o usuario recebe aviso com nome da outra ficha para consulta.
- [x] **PDFV2-FICHA-08**: O bloco `Custos e CMV` do Quadro Final segue a ordem `Custo total da ficha`, `CMV sem embalagem`, `Custo de embalagens e descartaveis`, `CMV com embalagem`, `CMV final aplicado`, com o toggle de montagem no cabecalho, linhas 3 e 4 bloqueadas/esmaecidas quando desligado e rotulo dinamico quando ligado.
- [x] **PDFV2-FICHA-09**: O bloco `Venda e Margem` do Quadro Final exibe `Preco de venda`, `Despesa variavel de venda (%PV)`, `CMV do kg (%PV)`, `Despesa variavel aplicada`, `Margem de contribuicao R$`, `Margem de contribuicao %`, barra visual e badge de saude do CMV.
- [x] **PDFV2-FICHA-10**: O Quadro Final funciona como simulador em tempo real com recalculo `oninput`, sem autosave, validando `Preco de venda > 0` e `%DV entre 0 e 100`.
- [x] **PDFV2-FICHA-11**: A `Leitura Operacional` mostra `Preco de Referencia`, `Custo Real da Ficha`, `Despesa Variavel`, `Margem de Contribuicao` e `Diagnostico automatico`, respeitando as formulas do PDF e exibindo `--` ou `Informe o valor` quando os dados-base forem invalidos.

### Phase 8 — Recuperacao fidelidade layout e modelo fornecedor

- [x] **SPEC-ITEM-FORNECEDOR**: `Unidade de Compra`, `Unidade de Uso`, `Qtde Compra`, `Qtde Uso` e `Preco Compra` vivem POR fornecedor em `ItemCompra`. Secundarios derivam `Unidade de uso` e `Qtde de uso` do principal na leitura (D-05). Principal e fonte de verdade na escrita.
- [x] **SPEC-ITEM-LAYOUT**: Tela de item segue `update/tela-item-v1.html` pixel-perfect: Bloco 1 Identificacao com 5 campos (Codigo | Nome | Status | Tipo | Categoria), grid Row 1 `140px 1fr 160px` e Row 2 `1fr 1fr`. Bloco 2 Detalhamento de Compras / Fornecedor com cards principal/secundarios. Bloco 3 Observacoes com label "Descricao operacional (opcional)".
- [x] **SPEC-FICHA-FIDELIDADE**: FichaFlatGrid em `/fichas/[id]` usa GRID_TEMPLATE `22px 1fr 80px 60px 240px 90px 96px 28px` e CF_GRID_TEMPLATE `22px auto 120px 110px 90px 1fr 28px`. FC/IC coloridos por convencao verde/vermelho/cinza. Quadro Final segue `update/tela-ficha-tecnica-v2.html`.
- [x] **SPEC-4-TELAS-ESTRITO**: 4 telas (item, grade itens, ficha, grade fichas) seguem os HTMLs aprovados em `update/*.html` pixel-perfect. Checklist consolidado em `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md` cobrindo larguras, cores hex, paddings e font-weights por regra CSS.

## v2 Requirements

### Futuro mapeado

- **PDFV2-FUT-01**: Exportar a ficha em PDF para uso na cozinha.
- **PDFV2-FUT-02**: Permitir configuracao dos thresholds do badge de saude do CMV por estabelecimento.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Thresholds do badge de CMV por estabelecimento | O PDF `implementacao-ficha-v2.pdf` marca isso como melhoria futura |
| Export PDF da ficha | Requisito futuro P4, mantido para proximo ciclo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PDFV2-CRIT-01 | Phase 7 | Complete |
| PDFV2-CRIT-02 | Phase 7 | Complete |
| PDFV2-CRIT-03 | Phase 8 | Complete |
| PDFV2-CRIT-04 | Phase 8 | Complete |
| PDFV2-CRIT-05 | Phase 8 | Complete |
| PDFV2-CRIT-06 | Phase 8 | Complete |
| PDFV2-CRIT-07 | Phase 8 | Complete |
| PDFV2-ITEM-01 | Phase 7 | Pending |
| PDFV2-ITEM-02 | Phase 7 | Complete |
| PDFV2-ITEM-03 | Phase 7 | Complete |
| PDFV2-ITEM-04 | Phase 7 | Complete |
| PDFV2-ITEM-05 | Phase 8 | Complete |
| PDFV2-ITEM-06 | Phase 7 | Pending |
| PDFV2-ITEM-07 | Phase 7 | Complete |
| PDFV2-FICHA-01 | Phase 7 | Complete |
| PDFV2-FICHA-02 | Phase 7 | Pending |
| PDFV2-FICHA-03 | Phase 7 | Pending |
| PDFV2-FICHA-04 | Phase 7 | Complete |
| PDFV2-FICHA-05 | Phase 7 | Pending |
| PDFV2-FICHA-06 | Phase 7 | Complete |
| PDFV2-FICHA-07 | Phase 8 | Complete |
| PDFV2-FICHA-08 | Phase 7 | Complete |
| PDFV2-FICHA-09 | Phase 7 | Complete |
| PDFV2-FICHA-10 | Phase 7 | Complete |
| PDFV2-FICHA-11 | Phase 7 | Complete |
| SPEC-ITEM-FORNECEDOR | Phase 8 | Complete |
| SPEC-ITEM-LAYOUT | Phase 8 | Complete |
| SPEC-FICHA-FIDELIDADE | Phase 8 | Complete |
| SPEC-4-TELAS-ESTRITO | Phase 8 | Complete |

**Coverage:**
- v1.2 requirements: 25 total
- Phase 8 strict-layout requirements: 4 total (SPEC-*)
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-17 after completing Phase 8 (SPEC-ITEM-FORNECEDOR, SPEC-ITEM-LAYOUT, SPEC-FICHA-FIDELIDADE, SPEC-4-TELAS-ESTRITO) — ver `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/VERIFICATION.md`.*
