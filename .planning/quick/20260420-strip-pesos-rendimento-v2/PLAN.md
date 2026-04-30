---
slug: strip-pesos-rendimento-v2
created: 2026-04-20
source: cliente mensagem 2026-04-20 (3 ajustes no strip Pesos e Rendimento)
type: quick
---

# Strip Pesos e Rendimento v2 — alinhar 1:1 com HTML v2

Continuacao de `20260420-ressalvas-v4-tooltips`. Cliente revisou o resultado
e esclareceu dois pontos:

1. Conceito de "tooltip": ele usa a palavra significando **texto sempre visivel
   abaixo do campo** (ref Label/Placeholder/Tooltip). NAO hover MUI Tooltip.
2. Tres ajustes de conteudo no strip "Pesos e Rendimento":
   - "Positivo = verde / Negativo = vermelho" em FC/IC esta errado -> apagar.
   - "Peso util consolidado" desnecessario -> remover coluna.
   - "Rendimento por porcao" precisa de legenda "total" visivel abaixo do valor.

## Mudancas

**Arquivos tocados:**
- `src/modules/engineering/ui/components-editor.types.ts` — novo campo `yieldUnit?: string`
- `src/modules/engineering/ui/ficha-form.tsx` — injeta `yieldUnitCode` no summary
  que vai pro TotaisIndicadores
- `src/modules/engineering/ui/TotaisIndicadores.tsx` — reestrutura o strip

**Antes (5 colunas):** Total de peso | Peso util consolidado | Peso final | FC | IC

**Depois (4 colunas, matching HTML update/tela-ficha-tecnica-v2.html):**
1. Rendimento da Porcao | valor `postCookingWeight` | legenda "total"
2. Unidade de Rendimento | valor `summary.yieldUnit ?? "kg"`
3. Fator de Correcao (FC) | legenda "Bruto -> Limpo"
4. Indice de Coccao (IC) | legenda "Limpo -> Pos-coccao"

**Removidos:**
- HsItem "Total de peso"
- HsItem "Peso util consolidado"
- MUI Tooltip + (?) (do commit ec15a6f — era interpretacao errada de "tooltip")
- note="Positivo = verde / Negativo = vermelho" em FC/IC

## Verificacao

- `tsc --noEmit` limpo
- `vitest run src/tests/unit/engineering/TotaisIndicadores.test.tsx` — 8/8 passam
- Smoke visual: `node scripts/capture-ressalvas-v4.mjs` — print em
  `prints-cliente/ressalvas-v4/01-strip-close-up.png` confirma as 4 colunas
  + legendas visiveis

## Fora de escopo

- Editor de Unidade de Rendimento (HTML ref tem `<select>`, nos mantemos
  read-only no strip — source of truth continua sendo a ficha-form).
- Outros componentes do Quadro Final (Custos e CMV, Venda e Margem, Leitura
  Operacional) — intocados.
