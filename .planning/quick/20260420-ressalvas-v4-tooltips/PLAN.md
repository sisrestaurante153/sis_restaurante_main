---
slug: ressalvas-v4-tooltips
created: 2026-04-20
source: cliente mensagem 2026-04-20 (3 ressalvas sobre HTML tela-ficha-tecnica-v2)
type: quick
---

# Ressalvas v4 — tooltips no Quadro Final + verificacao Despesa Variavel

Cliente mandou 3 ressalvas apos fase 9.2. Entrada:

- MARROM — Despesa Variavel Aplicada: deve ser valor em R$, nao porcentagem
- AZUL — Rendimento da Porcao: precisa de tooltip "Final" / "peso final"
- ROSA — FC: tooltip "Bruto -> Limpo" / IC: tooltip "Limpo -> Pos-coccao"

## Descoberta

A annotated image que o cliente enviou eh do arquivo HTML mockup
`update/tela-ficha-tecnica-v2.html` (file:// no Desktop), nao da app React rodando.

Auditoria do codigo React:

- **MARROM ja esta correto no app React.** `engineering-repository.ts:257-259` calcula
  `variableExpenseValue = salePriceNumber * variableExpensePercentNumber` e
  `TotaisIndicadores.tsx:876` renderiza via `formatCurrency(summary.variableExpenseApplied)`,
  produzindo ex. "R$ 13,19" no card Leitura Operacional Consolidada. A "15% PV" so aparece
  no HTML mockup. Nenhuma mudanca necessaria no React.
- **AZUL e ROSA exigem novos tooltips no `HsItem` do strip "Pesos e Rendimento"**
  em `TotaisIndicadores.tsx`.

## Mudancas de codigo (1 commit atomico)

**Arquivo:** `src/modules/engineering/ui/TotaisIndicadores.tsx`

1. Adicionar prop opcional `labelTooltip?: string` ao componente `HsItem`.
   Quando presente, renderizar `<span>(?) </span>` apos o label com `title={labelTooltip}`
   (tooltip HTML nativo). `cursor: help`, `color: text3`, `fontSize: 10` para seguir
   o estilo do HTML de referencia (linha 441 do HTML v2).

2. No strip "Pesos e Rendimento" (linhas 555-577):
   - `HsItem` "Peso final" -> `labelTooltip="Peso final"` (conforme nota "Azul : Tooltip = Final" do cliente; mantemos a traducao "Peso final" ja usada como label para dar mais contexto).
   - `HsItem` "Fator de Correcao (FC)" -> `labelTooltip="Bruto -> Limpo"`.
   - `HsItem` "Indice de Coccao (IC)" -> `labelTooltip="Limpo -> Pos-coccao"`.

3. Manter o `note="Positivo = verde / Negativo = vermelho"` existente em FC/IC
   como legenda secundaria (user permitiu: "podem ser mantidos como legenda secundaria").

## Verificacao

- `npm run typecheck` passa (se disponivel no projeto)
- Nenhum teste em `src/tests/unit/engineering/TotaisIndicadores.test.tsx` deve quebrar
  (adiciona prop opcional, nao remove/renomeia nada)
- Smoke visual: abrir tela de Ficha Tecnica e passar mouse sobre "(?)" em cada um
  dos 3 campos do strip Pesos e Rendimento -> tooltip aparece com o texto esperado

## Fora de escopo

- Realinhar o strip React (5 colunas) com o strip HTML (4 colunas — "Rendimento da Porcao"
  + "Unidade de Rendimento" + FC + IC). Scope creep — nao foi pedido.
- Corrigir o arquivo HTML mockup `update/tela-ficha-tecnica-v2.html`. Cliente avisou
  que parou de consertar o HTML; a fonte da verdade agora sao as ressalvas escritas.
