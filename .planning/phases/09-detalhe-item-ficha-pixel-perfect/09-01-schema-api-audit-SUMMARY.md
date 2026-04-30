---
plan_id: 09-01
phase: 09-detalhe-item-ficha-pixel-perfect
executor: executor-worktree-agent-ae2d5492
date: 2026-04-19T21:56:25Z
status: complete
decision: "Phase 9 = zero Prisma migration"
---

# 09-01 Schema/API Audit — HTML ↔ Prisma ↔ Zod ↔ Presenter

Esta auditoria coloca lado a lado cada campo exibido nos HTMLs aprovados (`update/tela-item-v1.html` v1 e `update/tela-ficha-tecnica-v2.html` v2) contra o modelo atual (Prisma `prisma/schema.prisma`, Zod `src/modules/catalog/server/item-form-schema.ts` + `src/modules/engineering/server/ficha-form-schema.ts`, presenters `catalog-prisma-mappers.ts::mapItemDetail` + `engineering-repository.ts::mapFichaDetail`).

**Legenda Status:**

- **COBERTO** — campo existe no 3 camadas (Prisma + Zod + presenter) e renderiza sem trabalho adicional.
- **DRIFT** — campo existe mas com semântica/validação divergente do HTML; mitigacao via Zod relax ou presenter derivation (sem migration).
- **GAP** — campo nao existe em alguma camada; requer migration Prisma.
- **DERIVADO** — campo nao e coluna Prisma; e calculado no presenter ou cliente a partir de outros campos (ex.: fator de conversao, preco de uso, custo atual da ficha).
- **AUSENTE** / `—` — coluna/regra ausente no eixo correspondente.

## Auditoria Item (update/tela-item-v1.html)

Campos capturados nos 3 blocos do HTML Item: Identificacao (linhas 178-220), Detalhamento de Compras/Fornecedor (linhas 222-372) e Observacoes (linhas 374-381).

### Bloco 1 — Identificacao

| Campo HTML              | Linha HTML | Prisma (modelo.campo)      | Zod (schema.campo)                  | Presenter (mapper)                                    | Status  |
|-------------------------|-----------:|----------------------------|-------------------------------------|-------------------------------------------------------|---------|
| Codigo                  | 184        | Item.codigoInterno         | itemFormSchema.code                 | mapItemDetail.code                                    | COBERTO |
| Nome do item            | 188        | Item.nome                  | itemFormSchema.name                 | mapItemDetail.name                                    | COBERTO |
| Status (Ativo/Inativo)  | 193-194    | Item.ativo                 | itemFormSchema.active               | mapItemDetail.active                                  | COBERTO |
| Tipo                    | 201-207    | Item.tipoPrincipal         | itemFormSchema.type (itemTypeSchema)| mapItemDetail.type                                    | COBERTO |
| Categoria operacional   | 210-217    | Item.categoriaOperacional  | itemFormSchema.operationalCategory  | mapItemDetail.operationalCategory                     | COBERTO |

### Bloco 2 — Fornecedor 1 (Principal)

| Campo HTML              | Linha HTML | Prisma (modelo.campo)                      | Zod (schema.campo)                                   | Presenter (mapper)                                    | Status   |
|-------------------------|-----------:|--------------------------------------------|------------------------------------------------------|-------------------------------------------------------|----------|
| Fornecedor              | 232        | ItemCompra.fornecedorId → Fornecedor.nome  | itemFormSchema.purchases[].supplierName              | mapItemDetail.purchases[i].supplierName               | COBERTO  |
| Atualizado em           | 240        | ItemCompra.dataAtualizacaoPreco            | itemFormSchema.purchases[].priceUpdatedAt            | mapItemDetail.purchases[i].priceUpdatedAt             | COBERTO  |
| Unidade de compra       | 246        | ItemCompra.unidadeCompraId → UnidadeMedida | itemFormSchema.purchases[].purchaseUnit              | mapItemDetail.purchases[i].purchaseUnit               | COBERTO  |
| Unidade de uso          | 256        | ItemCompra.unidadeUsoId → UnidadeMedida    | itemFormSchema.purchases[].usageUnit (obrig principal)| mapItemDetail.purchases[i].usageUnit                  | COBERTO  |
| Quantidade de compra    | 267        | ItemCompra.quantidadePorEmbalagem          | itemFormSchema.purchases[].purchaseQuantity          | mapItemDetail.purchases[i].purchaseQuantity           | COBERTO  |
| Quantidade de uso       | 271        | ItemCompra.quantidadeUso                   | itemFormSchema.purchases[].usageQuantity (obrig principal) | mapItemDetail.purchases[i].usageQuantity        | COBERTO  |
| Fator de conversao      | 275        | DERIVADO (qc/qu)                           | —                                                    | mapItemDetail.purchases[i].conversionFactor (calc)    | DERIVADO |
| Preco de compra         | 282        | ItemCompra.custoCompra                     | itemFormSchema.purchases[].purchaseCost              | mapItemDetail.purchases[i].purchaseCost               | COBERTO  |
| Preco de uso            | 286        | DERIVADO (custo/qu)                        | —                                                    | mapItemDetail.purchases[i].usagePrice (calc)          | DERIVADO |

### Bloco 2 — Fornecedor 2 (fixado do 1º)

Todos os campos de Fornecedor 2 sao o mesmo contrato da linha Principal, com flag derivada `usageIsFixedFromPrimary=true` (Phase 8 D-08 / 08-03):

| Campo HTML                   | Linha HTML | Prisma (modelo.campo)                           | Zod (schema.campo)                               | Presenter (mapper)                                         | Status   |
|------------------------------|-----------:|--------------------------------------------------|--------------------------------------------------|------------------------------------------------------------|----------|
| Fornecedor                   | 302-306    | ItemCompra.fornecedorId                          | itemFormSchema.purchases[].supplierName          | mapItemDetail.purchases[i].supplierName                    | COBERTO  |
| Atualizado em                | 310        | ItemCompra.dataAtualizacaoPreco (nullable)       | itemFormSchema.purchases[].priceUpdatedAt        | mapItemDetail.purchases[i].priceUpdatedAt (pode ser "")    | COBERTO  |
| Unidade de compra            | 316-321    | ItemCompra.unidadeCompraId                       | itemFormSchema.purchases[].purchaseUnit          | mapItemDetail.purchases[i].purchaseUnit                    | COBERTO  |
| Unidade de uso (fixado)      | 325-329    | ItemCompra.unidadeUsoId (null em secundarios)    | itemFormSchema.purchases[].usageUnit (optional)  | mapItemDetail.purchases[i].usageUnit (derivado do principal)| COBERTO  |
| Quantidade de compra         | 335        | ItemCompra.quantidadePorEmbalagem                | itemFormSchema.purchases[].purchaseQuantity      | mapItemDetail.purchases[i].purchaseQuantity                | COBERTO  |
| Quantidade de uso (fixado)   | 339-343    | ItemCompra.quantidadeUso (null em secundarios)   | itemFormSchema.purchases[].usageQuantity (optional) | mapItemDetail.purchases[i].usageQuantity (derivado)      | COBERTO  |
| Fator de conversao           | 346        | DERIVADO                                         | —                                                | mapItemDetail.purchases[i].conversionFactor (calc client)  | DERIVADO |
| Preco de compra              | 353        | ItemCompra.custoCompra                           | itemFormSchema.purchases[].purchaseCost          | mapItemDetail.purchases[i].purchaseCost                    | COBERTO  |
| Preco de uso                 | 357        | DERIVADO                                         | —                                                | mapItemDetail.purchases[i].usagePrice (calc client)        | DERIVADO |

### Bloco 3 — Observacoes

| Campo HTML               | Linha HTML | Prisma (modelo.campo) | Zod (schema.campo)                   | Presenter (mapper)          | Status  |
|--------------------------|-----------:|-----------------------|--------------------------------------|-----------------------------|---------|
| Descricao operacional    | 379        | Item.descricao        | itemFormSchema.description (default "") | mapItemDetail.description | COBERTO |

### Item — total auditado

- 5 campos Identificacao (5 COBERTO).
- 9 campos Fornecedor Principal (7 COBERTO + 2 DERIVADO).
- 9 campos Fornecedor 2 fixado (7 COBERTO + 2 DERIVADO).
- 1 campo Observacoes (1 COBERTO).
- **Total: 24 campos auditados; 0 GAP; 0 DRIFT; 4 DERIVADOS esperados.**

## Auditoria Ficha (update/tela-ficha-tecnica-v2.html)

Campos capturados nas secoes Identificacao (linhas 253-268), Estrutura da Ficha (linhas 270-384), Montagem (linhas 387-422), Finalizacao (linhas 425-432) e Quadro Final (linhas 435-578).

### Bloco Topbar + Badge

| Campo HTML                      | Linha HTML | Prisma (modelo.campo)        | Zod (schema.campo)         | Presenter (mapper)              | Status  |
|---------------------------------|-----------:|------------------------------|----------------------------|---------------------------------|---------|
| Page title (nome em MAIUSC)     | 243        | FichaTecnica.nomeExibicao    | fichaFormSchema.displayName| mapFichaDetail.itemName (resolveFichaDisplayName) | COBERTO |
| Badge status inline ("ativa")   | 243        | FichaTecnica.status          | fichaFormSchema.status     | mapFichaDetail.status           | COBERTO |
| Subtitulo ("Edicao da ficha..") | 244        | — (literal UI)               | —                          | — (literal UI)                  | COBERTO |

### Identificacao g-id1 (Row 1)

| Campo HTML                            | Linha HTML | Prisma (modelo.campo)        | Zod (schema.campo)                          | Presenter (mapper)               | Status  |
|---------------------------------------|-----------:|------------------------------|---------------------------------------------|----------------------------------|---------|
| Cod.                                  | 257        | FichaTecnica.itemResultante.codigoInterno | — (derivado de itemId)         | mapFichaDetail (via itemResultante.codigoInterno; hoje exposto como mapItemDetail.code) | COBERTO (render via item) |
| Produto                               | 258        | FichaTecnica.nomeExibicao    | fichaFormSchema.displayName                 | mapFichaDetail.itemName          | COBERTO |
| Data de criacao                       | 259        | FichaTecnica.criadaEm        | — (readonly, nao escrito)                   | mapFichaDetail.createdAt + createdAtLabel | COBERTO |
| Data e hora da ultima alteracao       | 260        | FichaTecnica.atualizadaEm    | — (readonly, nao escrito)                   | mapFichaDetail.updatedAt + updatedAtLabel | COBERTO |

### Identificacao g-id2 (Row 2)

| Campo HTML                        | Linha HTML | Prisma (modelo.campo)        | Zod (schema.campo)                     | Presenter (mapper)                                | Status   |
|-----------------------------------|-----------:|------------------------------|----------------------------------------|---------------------------------------------------|----------|
| Modalidade                        | 263        | FichaTecnica.modalidadeId    | fichaFormSchema.modalityId (min 1)     | mapFichaDetail.modality.{id,label}                | COBERTO  |
| Grupo operacional                 | 264        | Item.categoriaOperacional    | fichaFormSchema.groupOperational (min 1) | mapFichaDetail.groupOperational                  | COBERTO  |
| Status                            | 265        | FichaTecnica.status          | fichaFormSchema.status                 | mapFichaDetail.status                             | COBERTO  |
| Custo atual da ficha              | 266        | DERIVADO (costs.total)       | —                                      | mapFichaDetail.costs.total + sheetSummary         | DERIVADO |

### Estrutura da Ficha (grade + item-row + cf-row)

| Campo HTML                     | Linha HTML | Prisma (modelo.campo)                    | Zod (schema.campo)                                  | Presenter (mapper)                                          | Status   |
|--------------------------------|-----------:|------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------|----------|
| Item / Produto (select)        | 293, 310   | FichaComponente.itemComponenteId         | componentSchema.itemId                              | mapFichaDetail.stages[].items[].itemId + itemName           | COBERTO  |
| Qtde usada                     | 296, 313   | FichaComponente.quantidadeBruta          | componentSchema.quantityUsed                        | mapFichaDetail.stages[].items[].quantityUsed/Gross/Net      | COBERTO  |
| Unidade                        | 297, 314   | FichaComponente.unidadeUsoId             | componentSchema.usageUnit                           | mapFichaDetail.stages[].items[].usageUnit                   | COBERTO  |
| Etapa (tipo)                   | 318, 343   | FichaEtapa.tipoEtapaId → TipoEtapa       | stageSchema.stageTypeId/Code                        | mapFichaDetail.stages[].stageType + stageName              | COBERTO  |
| Peso Limpo / Peso Pos-coccao   | 322, 347   | FichaEtapa.pesoSaida                     | stageSchema.outputQuantity                          | mapFichaDetail.stages[].outputQuantity                      | COBERTO  |
| FC (fator correcao)            | 323        | FichaEtapa.fatorCorrecao                 | stageSchema.correctionFactor                        | mapFichaDetail.costs/indicators.correctionFactor            | COBERTO  |
| IC (indice coccao)             | 348        | FichaEtapa.indiceCoccao                  | stageSchema.cookingIndex                            | mapFichaDetail.costs/indicators.cookingIndex                | COBERTO  |
| Custo unit.                    | 301, 326   | DERIVADO (ItemCompra via cost-engine)    | —                                                   | mapFichaDetail.stages[].items[].unitCost                    | DERIVADO |
| Custo insumo                   | 302, 327   | DERIVADO (qty * unitCost)                | —                                                   | mapFichaDetail.stages[].items[].totalCost                   | DERIVADO |
| drag-handle (ordem)            | 291, 308   | FichaEtapa.ordem / FichaComponente.ordem | stageSchema.items[] (array order)                   | preservada ao serializar stages                             | COBERTO  |
| Coccao Final (cf-row)          | 357-376    | FichaEtapa (tipoEtapa=coccao_final)      | stageSchema (entry de ultima etapa)                 | mapFichaDetail.stages (ultima etapa)                        | COBERTO  |
| Rendimento da Porcao (cf)      | 366        | FichaTecnica.pesoFinalInformado / FichaEtapa.pesoSaida | fichaFormSchema.finalWeight + portions | mapFichaDetail.finalWeight + portions                       | COBERTO  |

### Montagem (montagem-block)

| Campo HTML               | Linha HTML | Prisma (modelo.campo)                    | Zod (schema.campo)                                | Presenter (mapper)                                 | Status   |
|--------------------------|-----------:|------------------------------------------|---------------------------------------------------|----------------------------------------------------|----------|
| Item (Montagem)          | 395, 404   | FichaComponente.itemComponenteId (embalagem/apoio) | componentSchema.itemId + componentType  | mapFichaDetail.stages[].items[].componentType     | COBERTO  |
| Qtde                     | 396, 405   | FichaComponente.quantidadeBruta          | componentSchema.quantityUsed                      | mapFichaDetail.stages[].items[].quantityUsed      | COBERTO  |
| Unidade                  | 397, 406   | FichaComponente.unidadeUsoId             | componentSchema.usageUnit                         | mapFichaDetail.stages[].items[].usageUnit         | COBERTO  |
| Custo unit. / Custo insumo | 398-399   | DERIVADO (cost-engine)                   | —                                                 | mapFichaDetail.stages[].items[].unitCost/totalCost | DERIVADO |
| Toggle "Ocultar Montagem" | 419-422   | — (literal UI / preferencia local)       | —                                                 | — (UI-only toggle)                                 | COBERTO  |

### Finalizacao (g-fin)

| Campo HTML                       | Linha HTML | Prisma (modelo.campo)     | Zod (schema.campo)                                    | Presenter (mapper)                 | Status                                            |
|----------------------------------|-----------:|---------------------------|-------------------------------------------------------|------------------------------------|---------------------------------------------------|
| Modo de preparo (opcional)       | 429        | FichaTecnica.modoPreparo  | fichaFormSchema.preparationMode = `nonEmptyString`    | mapFichaDetail.preparationMode     | **DRIFT** — Zod obrigatorio vs HTML opcional; fix Task 2 (D-10) |
| Observacoes da ficha (opcional)  | 430        | FichaTecnica.observacoes  | fichaFormSchema.notes = `z.string().trim().default("")` | mapFichaDetail.notes              | COBERTO                                           |

### Quadro Final (qf-wrap)

| Campo HTML                    | Linha HTML | Prisma (modelo.campo)                 | Zod (schema.campo)                          | Presenter (mapper)                                   | Status   |
|-------------------------------|-----------:|----------------------------------------|---------------------------------------------|------------------------------------------------------|----------|
| Rendimento da Porcao (strip)  | 443        | FichaTecnica.rendimentoPorcoes / FichaEtapa.pesoSaida | fichaFormSchema.portions     | mapFichaDetail.excelSummary.postCookingWeight + sheetSummary | COBERTO  |
| Unidade de Rendimento         | 448        | FichaTecnica.unidadeRendimentoId     | fichaFormSchema.yieldUnitCode                | mapFichaDetail.yieldUnitCode                         | COBERTO  |
| FC Total                      | (strip)    | DERIVADO                              | —                                            | mapFichaDetail.excelSummary.cookingFactorGross       | DERIVADO |
| IC Total                      | (strip)    | DERIVADO                              | —                                            | mapFichaDetail.excelSummary.cookingFactorNet         | DERIVADO |
| Custo real da ficha           | (qf-cols)  | DERIVADO (total input + packaging)    | —                                            | mapFichaDetail.excelSummary.costReal                 | DERIVADO |
| CMV por kg                    | (qf-cols)  | DERIVADO                              | —                                            | mapFichaDetail.excelSummary.cmvPerKg                 | DERIVADO |
| Preco venda                   | (lo-grid)  | FichaTecnica.precoVenda               | fichaFormSchema.salePrice (optional)         | mapFichaDetail.sheetSummary.salePrice                | COBERTO  |
| Despesa variavel %            | (lo-grid)  | FichaTecnica.despesaVariavelPercentual| fichaFormSchema.variableExpensePercent       | mapFichaDetail.sheetSummary.variableExpensePercent   | COBERTO  |
| Margem / Contribuicao         | (lo-grid)  | DERIVADO                              | —                                            | mapFichaDetail.sheetSummary (builders comerciais)    | DERIVADO |
| ver-badge Vn (gold)           | 139 HTML   | FichaTecnica.versao                   | — (read-only)                                | mapFichaDetail.version                               | COBERTO (D-07: fora do Quadro Final nesta fase) |

### Ficha — total auditado

- 3 campos Topbar (3 COBERTO).
- 4 campos g-id1 (4 COBERTO).
- 4 campos g-id2 (3 COBERTO + 1 DERIVADO).
- 12 campos Estrutura (9 COBERTO + 3 DERIVADO).
- 5 campos Montagem (3 COBERTO + 1 DERIVADO + 1 UI-only).
- 2 campos Finalizacao (1 COBERTO + 1 DRIFT → mitigado Task 2).
- 10 campos Quadro Final (4 COBERTO + 6 DERIVADO).
- **Total: 40 campos auditados; 0 GAP; 1 DRIFT (mitigado sem migration); 11 DERIVADOS esperados; 1 UI-only toggle.**

## Gaps Encontrados

**Nenhum gap de schema** identificado na auditoria. Unica divergencia real e um **DRIFT** de contrato de validacao, mitigado exclusivamente no lado Zod (sem migration):

### DRIFT #1 — fichaFormSchema.preparationMode

- **Camada afetada:** Zod `src/modules/engineering/server/ficha-form-schema.ts:75`.
- **Estado atual:** `preparationMode: nonEmptyString` (ou seja, `z.string().trim().min(1)`).
- **Contrato HTML:** linha 429 marca `<span class="opt">(opcional)</span>` explicitamente.
- **Mitigacao:** Task 2 substitui por `preparationMode: z.string().default("")` (D-10 do 09-CONTEXT.md). Coluna Prisma `FichaTecnica.modoPreparo` permanece `String?` (ja nullable — vide schema.prisma:251) — **zero migration**. Blast radius restrito a UI opcional.
- **Risco:** baixo. Presenter (`mapFichaDetail.preparationMode`) ja tem fallback `record.modoPreparo ?? ""`. Consumers (UI/e2e) fornecem strings nao-vazias hoje.

## Decisao Final

**Phase 9 = zero Prisma migration.**

Auditoria completa sobre 64 campos (24 no HTML Item + 40 no HTML Ficha) encontrou:

- 0 GAP de coluna/tabela.
- 1 DRIFT de validacao Zod (preparationMode), mitigado no proprio Zod sem tocar no DB (D-10).
- 15 campos DERIVADOS esperados (fator de conversao, preco de uso, custos/CMV/margem, etc.), cada um ja calculado no presenter ou no cliente.

Nenhuma migration Prisma sera gerada nesta fase. Caso regressao futura precise expandir schema, seguir padrao Phase 8 D-04 (idempotencia `ADD COLUMN IF NOT EXISTS` + `pg_constraint DO $$ END $$` guard + `docker compose run --rm migrate` aplicada 2x).

## Proximos passos desta plan

1. **Task 2** — Relaxar Zod `preparationMode` para `z.string().default("")` em `src/modules/engineering/server/ficha-form-schema.ts` (D-10).
2. **Task 3** — Criar `.planning/phases/09-detalhe-item-ficha-pixel-perfect/09-VERIFICATION.md` com secao §Schema declarando formalmente zero migration (D-12).
