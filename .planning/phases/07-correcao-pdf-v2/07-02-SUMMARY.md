---
phase: 07-correcao-pdf-v2
plan: 02
subsystem: catalog
tags: [item, catalog, prisma, delete-guard, vitest, pdf-v2]
requires:
  - phase: 07-01
    provides: "Base da wave 1 estabilizada para seguir com refatoracoes"
provides:
  - "Contrato de item com codigo editavel, compra principal e metricas derivadas de uso"
  - "Delete guard para itens vinculados a fichas tecnicas"
  - "Cobertura automatizada do schema e do detalhe de item"
affects: [07-03, catalogo, itens]
tech-stack:
  added: []
  patterns:
    - "Selecao de compra principal com fallback para compra mais recente"
    - "Exclusao segura bloqueada por vinculos de ficha tecnica"
key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/modules/catalog/server/item-form-schema.ts
    - src/modules/catalog/server/catalog-repository.ts
    - src/modules/catalog/server/catalog-prisma-mappers.ts
    - src/modules/catalog/server/catalog-actions.ts
    - src/tests/unit/item-form-schema.test.ts
    - src/tests/unit/item-detail-page.test.tsx
key-decisions:
  - "ItemCompra ganhou o marcador persistido `principal` para controlar a compra de referencia."
  - "Codigo do item passa a ser editavel com validacao de duplicidade no repositorio."
  - "A exclusao de item bloqueia quando houver uso como item resultante ou componente de ficha tecnica."
patterns-established:
  - "Listagens e detalhes de item usam a compra principal ou a mais recente para calcular `usageQuantity` e `usagePrice`."
  - "Acoes destrutivas do catalogo retornam mensagem operacional explicita quando existem dependencias."
requirements-completed: [PDFV2-CRIT-02, PDFV2-ITEM-02, PDFV2-ITEM-03, PDFV2-ITEM-04, PDFV2-ITEM-07]
completed: 2026-04-02
---

# Phase 07 Plan 02: Contrato de item Summary

**Contrato de item ampliado com compra principal, metricas de uso e exclusao segura**

## Accomplishments
- `ItemCompra` passou a persistir `principal`, e o backend passou a priorizar essa compra para derivar `Qtde de Uso` e `Preco de Uso`.
- O repositorio de catalogo agora aceita `code` editavel com validacao de unicidade e mantem a geracao automatica apenas quando o item novo chega sem codigo.
- A exclusao segura de item foi exposta em `deleteItemAction` e bloqueia com mensagem operacional quando o item participa de fichas tecnicas.

## Task Commits
1. **Task 1 + Task 2**: `448d600` - `feat(07-02): expand item data contract`

## Verification
- `npx vitest run src/tests/unit/item-form-schema.test.ts src/tests/unit/item-detail-page.test.tsx`
- `npm run typecheck`

## Notes
- O executor original nao devolveu sinal final nem gravou este summary, mas a implementacao estava presente no commit `448d600` e a verificacao foi refeita com sucesso pelo orquestrador.

## Self-Check
PASSED
- Found commit `448d600`
- Verified schema/detail tests and typecheck successfully

