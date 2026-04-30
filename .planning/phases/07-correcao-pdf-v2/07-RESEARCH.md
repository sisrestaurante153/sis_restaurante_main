# Phase 7: Correcao operacional do PDF v2 - Research

Data: 2026-04-01
Origem: `especificacao-sis-restaurante.pdf` + `implementacao-ficha-v2.pdf`

## Achados principais

1. O runtime ainda assina sessao com fallback hardcoded em dois pontos: `src/middleware.ts` e `src/app/api/auth/login/route.ts`.
2. A tela de item ainda nao tem `Codigo`, nem os campos calculados de uso, e o editor de fornecedores usa `datalist`, o que explica o bug de edicao pedido no PDF.
3. A grade de itens esta resumida a poucas colunas; a regra de fornecedor principal e os calculos `Qtde Uso`/`Preco Uso` ainda nao existem no mapper.
4. A ficha continua acoplada ao `itemResultante` no formulario (`Autocomplete` em `Produto`), o que conflita com a exigencia de texto livre do PDF e com a necessidade de manter item mestre canonico do repositorio.
5. O cabecalho da ficha ainda expoe `Mod. rendimento`, `% de Coccao`, `Peso final` e o card lateral `ResumoFichaSidebar`, todos explicitamente removidos no PDF.
6. O editor atual de componentes e orientado por cards de etapa. O PDF pede um fluxo hibrido linha-a-linha com etapa opcional, `Qtde Final` condicional e separadores visuais.
7. O dominio atual tem `modalidade` e `ficha_etapa`, mas ainda nao possui cadastro de `tipo de etapa`.
8. `TotaisIndicadores.tsx` e `buildCommercialSummary()` ainda podem propagar valores nao finitos para a UX, o que explica o `R$ NaN` do Quadro Final.
9. O novo PDF do Quadro Final corrige uma premissa importante do plano original: `FC` e `IC` nao sao apenas numeros consolidados com thresholds visuais; agora existe contrato explicito de nomenclatura, ordem e formula (`FC = Peso Limpo / Peso Bruto`, `IC = Peso Pos-coccao / Peso Limpo`).
10. O Quadro Final atual nao implementa o novo contrato de `Custos e CMV`, `Venda e Margem`, simulador `oninput`, badge de saude do CMV nem `Diagnostico automatico`.

## Direcao escolhida

### 1. Resolver P1 antes da refatoracao maior

- Remover segredo hardcoded.
- Blindar `Venda de referencia`, `CMV total`, `Margem de contribuicao` e `CMV da marmita`.
- Trocar o controle de fornecedor por seletor editavel real.

### 2. Manter item mestre canonico sem sacrificar o nome livre da ficha

- Introduzir um campo persistido de nome livre na ficha (`nome_exibicao` ou equivalente).
- Preservar `itemResultanteId` para custo, cascata e rastreabilidade.
- Para fichas novas, permitir criacao controlada do item canonico pelo save quando nao houver item ligado previamente.

### 3. Separar item, ficha estrutural e Quadro Final em planos diferentes

- Itens: contrato/persistencia primeiro; depois UI/listagem.
- Fichas: identidade/cabecalho/listagem primeiro; depois fluxo hibrido/tipos de etapa/montagem.
- Quadro Final: depois do fluxo de ficha estabilizado, para aplicar o contrato visual/comercial final sem conflito de arquivos.

### 4. Corrigir a regra de FC/IC no proprio plano

- `Fator de Correcao` passa a ser calculado como `Peso Limpo / Peso Bruto`.
- `Indice de Coccao` passa a ser calculado como `Peso Pos-coccao / Peso Limpo`.
- A UX precisa refletir isso por linha e no consolidado, com ordem `Peso Final -> FC -> IC`.

### 5. Minimizar risco de regressao

- Cada frente fecha com testes unitarios dirigidos aos componentes/repositorios tocados.
- O ultimo bloco inclui regressao E2E para o fluxo real de item, ficha e Quadro Final.

## Gaps de modelo identificados

- `ItemCompra` nao possui hoje um marcador de fornecedor principal.
- `FichaTecnica` nao possui um nome livre proprio, apenas relacao com `itemResultante`.
- Nao ha entidade dedicada para `tipo de etapa`.
- O presenter comercial ainda nao encapsula o contrato completo de simulacao/fallback do novo Quadro Final.

## Riscos e mitigacoes

### Risco 1 - Conflito entre PDF e regra de item mestre

- Mitigacao: nome livre na ficha como dado de apresentacao/versionamento, mantendo item canonico tecnico no backend.

### Risco 2 - Refatoracao grande do editor de ficha

- Mitigacao: dividir cabecalho/listagem, fluxo hibrido e Quadro Final em planos separados; preservar snapshots de custo enquanto a UX muda.

### Risco 3 - Divergencia Prisma vs demo store

- Mitigacao: toda mudanca de contrato em item/ficha precisa refletir em `catalog-repository.ts`, `engineering-repository.ts` e respectivos mappers/fallbacks demo.

### Risco 4 - Quadro Final virar um acoplado de calculo e UI dificil de validar

- Mitigacao: consolidar formulas e fallbacks no presenter (`buildCommercialSummary()` ou equivalente) e deixar `TotaisIndicadores.tsx` responsavel apenas por interacao e renderizacao.

## Recomendacao de execucao

1. `07-01` e `07-02` em paralelo.
2. `07-04` pode caminhar em paralelo a `07-01/07-02`, desde que a decisao de nome livre da ficha seja respeitada.
3. `07-03` depende do contrato consolidado de item.
4. `07-05` depende do cabecalho/identidade da ficha, porque o fluxo hibrido e a secao de montagem vao aterrissar sobre esse novo shape.
5. `07-06` fecha o ciclo apos `07-01`, `07-04` e `07-05`, aplicando o novo contrato do Quadro Final sem reabrir a base de item.

## Fora de escopo confirmado

- Export PDF da ficha para cozinha.
- Thresholds do badge de saude do CMV configuraveis por estabelecimento.
