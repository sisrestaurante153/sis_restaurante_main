---
slug: v3-removed-grade-aligned
status: complete
completed: 2026-04-20
---

# SUMMARY — V3 removido + grade alinhada

## Resultado

| Pedido | Status |
|--------|--------|
| Remover badge "V3" do IDENTIFICACAO | ✅ |
| Alinhar headers da grade com os inputs | ✅ 4 sub-fixes |

## 4 sub-fixes de alinhamento

1. Coluna Unidade: 60px -> 80px (label nao trunca mais)
2. Header ETAPA virou nested 1fr 1fr: "Etapa" + "Peso"
3. Header Qtde usada passou a ser left-aligned (antes right-aligned)
4. Headers agora alinham verticalmente com todos os inputs da linha

## Arquivos tocados

- `src/modules/engineering/ui/ficha-form.tsx` — removido Box do V3 badge (linhas 297-318)
- `src/modules/engineering/ui/FichaFlatGrid.tsx` — GRID_TEMPLATE atualizado +
  header Etapa em nested grid + Qtde usada left-aligned
- `src/tests/unit/engineering/FichaFlatGrid.test.tsx` — contrato atualizado
- `tests/e2e/pixel-perfect-phase8.spec.ts` — contrato atualizado
- `scripts/capture-ficha-edit.mjs` — script novo de captura focado na ficha edit

## Verificacao

- `tsc --noEmit` limpo
- FichaFlatGrid.test.tsx 2/2 passa
- Prints em `prints-cliente/ressalvas-v4/`:
  - `06a-identificacao-sem-v3.png` — V3 ausente no bloco IDENTIFICACAO
  - `06b-grade-estrutura.png` — 7 headers (ITEM / QTDE USADA / UNIDADE / ETAPA /
    PESO / CUSTO UNIT. / CUSTO INSUMO) alinhados com seus respectivos inputs

## Commit

Ver `git log --oneline -1`.
