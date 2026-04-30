---
slug: strip-pesos-rendimento-v2
status: complete
completed: 2026-04-20
---

# SUMMARY — Strip Pesos e Rendimento v2

Reverte a interpretacao errada de "tooltip" (commit ec15a6f) e alinha o strip
1:1 com o HTML de referencia `update/tela-ficha-tecnica-v2.html`.

## Resultado

| Cliente pediu | Status |
|---------------|--------|
| Apagar "Positivo = verde / Negativo = vermelho" em FC/IC | ✅ |
| Trocar por "Bruto -> Limpo" em FC e "Limpo -> Pos-coccao" em IC | ✅ |
| Remover coluna "Peso util consolidado" | ✅ |
| Adicionar legenda "total" abaixo de Rendimento da Porcao | ✅ |
| Tooltip = legenda sempre visivel (nao hover) | ✅ reverteu MUI Tooltip |

## Arquivos tocados

- `src/modules/engineering/ui/components-editor.types.ts` — adicionou `yieldUnit?: string`
- `src/modules/engineering/ui/ficha-form.tsx` — injeta `yieldUnitCode` ao
  passar `summary` para `TotaisIndicadores`
- `src/modules/engineering/ui/TotaisIndicadores.tsx` —
  - removeu `import Tooltip`
  - removeu prop `labelTooltip` e JSX do `(?)` do `HsItem`
  - strip agora tem 4 colunas (era 5), `gridTemplateColumns` atualizado
  - novas legendas ("total", "Bruto -> Limpo", "Limpo -> Pos-coccao")

## Verificacao

- `tsc --noEmit` — limpo
- `vitest run src/tests/unit/engineering/TotaisIndicadores.test.tsx` — 8/8 ok
- Smoke visual: `prints-cliente/ressalvas-v4/01-strip-close-up.png` mostra
  os 4 cards com legendas corretas

## Commit

Ver `git log --oneline -1`.
