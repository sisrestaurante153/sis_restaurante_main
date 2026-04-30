---
slug: pendencias-v3
created: 2026-04-17
source: updates/pendencias-sis-restaurante-v3.pdf + updates/tela-*.html
type: quick
---

# Pendencias v3 — alinhamento com HTMLs aprovados

Enderecamento das 18 pendencias catalogadas em `updates/pendencias-sis-restaurante-v3.pdf` (v1.2 vs especificacoes aprovadas) alem dos 3 itens de housekeeping.

## Decisoes pendentes resolvidas antecipadamente

- **D1** — Modelo de etapas: escolhido A (refatorar para inline). Implementado parcialmente (visual proximo, modelo de dados ainda com stages[]). Gap documentado em `.planning/codebase/CONCERNS.md`.
- **D2** — Nomenclatura de nivel: escolhido A (N1/N2/N3 = nivel de composicao). O badge em `IngredienteDataGrid` usa `levelLabel` existente (vinha `N{index}` da camada de dados).

## Ordem de execucao (7 commits atomicos)

1. P1 + P2 grade de fichas (#1, #2, #3, #4, #5, #6) — `abbcb63`
2. Cores FC/IC no Quadro Final + progresso CMV + diagnostico (#12, #17, #18) — `a3e6446`
3. Drag-to-reorder + visual de etapa (#10 parcial, #11) — `0a4b9f1`
4. Cabecalho ficha + versao + destaque custo (#13, #14, #8) — `41dc3eb`
5. Descricao opcional + botao Coccao Final (#9, #15) — `c372bd4`
6. Layout do Bloco 2 (#7) — `592d0c8`
7. Housekeeping (H1 ja feito, H2 RESOLVIDO, H3 retro) — este commit
