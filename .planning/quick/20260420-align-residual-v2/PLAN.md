# Quick PLAN — Align Residual v2

**Date:** 2026-04-20
**Screen:** Ficha Tecnica — Edit
**Prev iteration:** `20260420-v3-removed-grade-aligned` (commit 217d65f)

## Objetivo
Resolver as 2 reclamacoes literais restantes do cliente apos round 3:
1. "o custo atual da ficha ainda está desalinhado"
2. "tipo de etapa e peso pos coccao tambem"

## Escopo
- `src/modules/engineering/ui/ficha-form.tsx` — Issue A
- `src/modules/engineering/ui/FichaFlatGrid.tsx` — Issue B
- `src/tests/unit/ficha-form.test.tsx` — atualizar contract test (D-03 padding → v4 height-alignment)

## Restricoes
- Nao alterar GRID_TEMPLATE (tests contract-locked).
- Nao re-adicionar V3 badge.
- Nao re-introduzir MUI hover Tooltip.
- Nao tocar Quadro Final / Leitura Operacional / outros componentes.

## Verificacao
1. `node scripts/capture-ficha-edit.mjs` → comparar `06a-identificacao-sem-v3.png` e `06b-grade-estrutura.png`.
2. `npx tsc --noEmit` clean.
3. `npx vitest run FichaFlatGrid.test.tsx ficha-form.test.tsx` all green.
