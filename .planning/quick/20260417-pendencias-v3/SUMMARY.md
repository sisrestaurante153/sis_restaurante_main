---
slug: pendencias-v3
status: complete
completed: 2026-04-17
commits: 10
items-resolved: 18-of-18-from-pdf + 3-of-3-housekeeping
items-partial: 0
---

# Pendencias v3 — Summary

## Itens do PDF

| # | Prioridade | Status | Commit | Observacao |
|---|---|---|---|---|
| 1 | P1 | ✓ | abbcb63 | Badge V{n} inline em Produto, coluna Versao removida |
| 2 | P1 | ✓ | abbcb63 | Coluna Preco de Venda adicionada |
| 3 | P1 | ✓ | abbcb63 | Header "Obs", largura 38px |
| 4 | P2 | ✓ | abbcb63 | Cor verde/vermelho/cinza em FC/IC da grade |
| 5 | P2 | ✓ | abbcb63 | Codigo largura 60 |
| 6 | P2 | ✓ | abbcb63 | sortable e default Produto A-Z |
| 7 | P2 | ✓ | 592d0c8 | Bloco 2 em cards de fornecedor |
| 8 | P2 | ✓ | 41dc3eb | Custo Atual com destaque azul |
| 9 | P3 | ✓ | c372bd4 | Descricao Operacional opcional (sem asterisco) |
| 10 | P1 | ✓ | dbf6de0 / 7ea2c81 / e872872 | Modelo inline por linha: `ComponentEditorRow` estendido, novo `FichaFlatGrid` (grid 8 col batendo HTML), helpers flatten/group preservam contrato stages[] com backend |
| 11 | P1 | ✓ | 0a4b9f1 | Drag-to-reorder nativo HTML5 com handle 6 pontos |
| 12 | P1 | ✓ | a3e6446 | FC/IC coloridos no strip do Quadro Final |
| 13 | P2 | ✓ | 41dc3eb | Header limpo; Rendimento/Unidade/FC/IC/Peso Final removidos |
| 14 | P2 | ✓ | 41dc3eb | Badge V{n} abaixo de Data Ultima Alteracao |
| 15 | P2 | ✓ | c372bd4 | Botao "Adicionar Coccao Final" separado |
| 16 | P2 | ✓ | a3e6446 | Labels "Fator de Correcao (FC)" / "Indice de Coccao (IC)" |
| 17 | P3 | ✓ | a3e6446 | LinearProgress 6px; cor dirigida por MC% |
| 18 | P3 | ✓ | a3e6446 | Diagnostico simplificado sem preco de venda |

## Housekeeping

- **H1** ja estava aplicado em `ROADMAP.md` (07-03..06 marcados como [x]).
- **H2** SESSION_SECRET marcado como RESOLVIDO em `.planning/codebase/CONCERNS.md` com referencia ao commit `f01a522`.
- **H3** self-check do 07-05: nota retroativa adicionada a `07-05-SUMMARY.md` apontando para os commits de fechamento do 07-06 (`8c6b7f0` / `93581a9` / `42df7fa`).

## Gap remanescente

Nenhum. Todos os 18 itens do PDF, as 2 decisoes do cliente e os 3 itens de housekeeping foram entregues.

## Decisoes tomadas

- **D1 = A** (refatorar para inline). Entregue em 3 commits (dbf6de0, 7ea2c81, e872872): estado `flatRows`, `FichaFlatGrid` batendo HTML, agrupamento `stages[]` na serializacao (zero alteracao de API/DB/schema).
- **D2 = A** (N1/N2/N3 por nivel de composicao, ja alinhado ao `levelLabel` gerado pelo repositorio).
