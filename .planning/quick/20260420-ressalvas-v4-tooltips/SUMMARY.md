---
slug: ressalvas-v4-tooltips
status: complete
completed: 2026-04-20
---

# SUMMARY — Ressalvas v4 tooltips

Continuacao da fase 9.2. Cliente enviou 3 ressalvas anotadas na tela do HTML mockup
`tela-ficha-tecnica-v2.html` (nao no app React). Aplicado no Quadro Final do React.

## Resultado por ressalva

| Cor | Item | Resultado |
|-----|------|-----------|
| MARROM | Despesa Variavel Aplicada em R$ | **Ja estava correto no React.** Nenhuma mudanca. |
| AZUL | Tooltip "Final" em Rendimento da Porcao / Peso final | **Adicionado.** `HsItem` "Peso final" com `labelTooltip="Peso final"`. |
| ROSA | Tooltip FC = "Bruto -> Limpo" | **Adicionado.** `labelTooltip="Bruto -> Limpo"`. |
| ROSA | Tooltip IC = "Limpo -> Pos-coccao" | **Adicionado.** `labelTooltip="Limpo -> Pos-coccao"`. |

## MARROM — ja estava correto

Auditoria do codigo antes de editar:

- `src/modules/engineering/server/engineering-repository.ts:257-259` calcula o valor
  aplicado como `salePriceNumber * variableExpensePercentNumber` (valor em R$, nao %).
- `src/modules/engineering/ui/TotaisIndicadores.tsx:876` renderiza o card
  "Despesa variavel aplicada" via `formatCurrency(summary.variableExpenseApplied)` —
  resultado em moeda BRL (ex: "R$ 13,19").
- Teste existente ja cobre: `src/tests/unit/engineering/TotaisIndicadores.test.tsx:28`
  passa `variableExpenseApplied: "4.5000"` e espera renderizacao em R$.

A "15% PV" que o cliente viu eh do arquivo HTML mockup em
`update/tela-ficha-tecnica-v2.html:562-564`. O HTML eh referencia historica e o
cliente avisou explicitamente que parou de corrigi-lo.

## AZUL + ROSA — mudancas aplicadas

**Arquivo:** `src/modules/engineering/ui/TotaisIndicadores.tsx`

1. Prop opcional `labelTooltip?: string` adicionada ao componente `HsItem` (linha 87/95).
   Quando definida, renderiza `<span>(?) </span>` com `title` HTML nativo apos o label.
2. Tres `HsItem` no strip "Pesos e Rendimento" passaram a usar o novo prop:
   - "Peso final" -> `labelTooltip="Peso final"`
   - "Fator de Correcao (FC)" -> `labelTooltip="Bruto -> Limpo"`
   - "Indice de Coccao (IC)" -> `labelTooltip="Limpo -> Pos-coccao"`
3. Legenda secundaria `note="Positivo = verde / Negativo = vermelho"` preservada em
   FC e IC (cliente autorizou manter como legenda).

## Verificacao

- `tsc --noEmit` — passa sem erros
- `vitest run src/tests/unit/engineering/TotaisIndicadores.test.tsx` — 8/8 testes passam
- Prop opcional, nao quebra chamadas existentes

## Fora de escopo (documentado)

- Realinhar strip React (5 colunas) com strip HTML (4 colunas: "Rendimento da Porcao" +
  "Unidade de Rendimento" + FC + IC). Nao foi pedido.
- Corrigir `update/tela-ficha-tecnica-v2.html`. Cliente desativou o HTML como fonte.

## Commit

Ver `git log --oneline -1`.
