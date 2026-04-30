# DESIGN — Align Residual v2

## Issue A — Custo atual da ficha (ficha-form.tsx linhas 353-389)
**Atual:** caixa custom com `Typography` caption + `Box` azul padded, sem helperText spacer.
Siblings (Modalidade/Grupo/Status) sao TextField size=small com label flutuante (legend no fieldset) e helperText=" " reservando ~22px abaixo.
A caixa custom fica ~6-8px mais baixa e sem o helper spacer, quebrando o baseline + a ancora do rodape da linha.

**Fix minimo:**
- Igualar altura do valor ao TextField small (~40px) via `height: 40`, `alignItems: center`.
- Subir label para bater com labels flutuantes: `fontSize: 12`, `mb: 0.5`, `mt: 0.25`.
- Adicionar `height: 22.9px` (var MuiFormHelperText) de espaco apos para bater o helperText dos irmaos → `&::after` content " " em Box invisivel OU um Typography caption vazio.
- Alinhar o container com `justifyContent: flex-start` ja esta ok; apenas padronizar altura+spacer.

## Issue B — Tipo de etapa + Peso Pos-coccao (FichaFlatGrid.tsx linhas 281-327)
**Atual:** nested grid `1fr 1fr` com `alignItems: "start"`.
Coluna Peso tem `Stack spacing={0.25}` com hint "IC automatico" abaixo, coluna Tipo de etapa nao — heights assimetricos.
Row pai usa `alignItems: center` mas os filhos do nested grid comecam alinhados ao topo → o centro do nested grid vira diferente do centro dos irmaos (Qtde, Unidade, Item), deslocando visualmente os 2 inputs em relacao aos headers.

**Fix minimo:**
- Mudar nested `alignItems: "start"` → `"center"` (linha 287) para que os dois inputs centralizem juntos verticalmente.
- Envolver Tipo de etapa em `Stack spacing={0.25}` espelhando o de Peso, com um Typography caption vazio (`{' '}`) reservando a mesma altura do hint, garantindo que as duas colunas tenham footprint vertical identico e os inputs fiquem exatamente no mesmo baseline.
