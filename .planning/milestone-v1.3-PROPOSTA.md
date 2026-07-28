# Proposta - Milestone v1.3 (rascunho para revisão)

Gerado por sessão overnight de 2026-07-28. Este documento **não foi executado** — é
escopo levantado para o cliente revisar de manhã e, se aprovado, rodar via
`/gsd-plan-phase` seguindo o processo já usado no projeto (ver `.planning/STATE.md`).
Nenhuma migration de banco foi criada para os itens abaixo.

## Por que este documento existe

O cliente pediu, numa lista única, 6 telas/funcionalidades novas + integração de IA.
Isso é grande demais (e envolve schema novo) para ser feito sem uma decisão consciente
de modelagem — o próprio histórico do projeto (Phase 8/9) mostra que mudanças de
schema feitas sem alinhamento prévio geraram retrabalho. Em vez de gerar código
overnight sem revisão, a decisão foi: resolver os itens autocontidos (bugs, ver
commits desta sessão) e deixar as telas grandes escopadas aqui.

---

## 1. Tela de Pré-preparo

**Escopo real, menor do que parece.** O enum `TipoItem` já tem `pre_preparo` e
`intermediario` (`prisma/schema.prisma`, `item-form-schema.ts`). Hoje esses itens
convivem na mesma listagem/formulário de `insumo`. O pedido é uma **view filtrada**
com fluxo próprio, não uma entidade nova.

Proposta de fase única:
- Nova rota `/pre-preparo` (ou aba dentro de `/itens`) listando `tp_item IN (pre_preparo, intermediario)`.
- Reusar `ItemForm` existente, talvez com um preset de campos (já que ficha técnica
  recursiva já suporta item como componente de outro item — `engineering` module).
- Decisão em aberto: pré-preparo tem "ficha técnica" própria (como uma ficha normal)
  ou é só um item com custo derivado de compra? O README do domínio sugere que
  pré-preparo/intermediário já se encaixam como itens compostos via `FichaTecnica`
  existente — a rota nova seria principalmente uma questão de UX/organização, não de
  dado novo.

**Risco de schema: baixo.** Pode ser feito sem migration.

---

## 2. Telas de Cardápio

**Entidade nova.** Não existe hoje conceito de "cardápio" no schema — só `FichaTecnica`
(receita) e `Item`. Precisa de:
- `Cardapio` (nome, tipo/canal — ex. "salão", "delivery" —, ativo, restaurante)
- `CardapioItem` (cardápio + ficha técnica/item + preço de venda específico daquele
  canal + dia(s) da semana em que aparece)

Decisões em aberto que precisam do cliente:
- Um item pode ter preço diferente por canal (salão vs delivery) — confirmado no
  pedido. Um item pode pertencer a vários cardápios simultaneamente?
- "Vincular fichas a dias específicos" — é recorrência semanal (ex. feijoada só
  quinta) ou datas específicas (calendário)?
- Cardápio versiona no tempo (histórico de preço) ou só reflete o estado atual?

**Risco de schema: médio.** 2 tabelas novas, sem impacto em cálculo de custo existente.

---

## 3. Tela de Vendas

**Entidade nova + importação própria.** Precisa de:
- `Venda` (data, item/ficha vendida, quantidade, valor unitário, canal, origem —
  manual ou importado)
- Import: de onde vêm as planilhas de venda? (PDV/iFood/consumidor direto — formato
  varia muito). Preciso saber a origem real dos dados antes de desenhar o parser,
  senão building um parser genérico é chute.

Decisão bloqueante para o cliente: **qual é a fonte das vendas diárias** (export do
PDV, planilha manual, iFood/Anota Aí etc.)? O formato da coluna determina o
mapeamento — sem isso não dá pra fazer o parser certo.

**Risco de schema: médio-alto**, depende da resposta acima.

---

## 4. Tela de Retorno Financeiro (margem por item)

**Depende de #3 (Vendas) existir.** A fórmula report já existe parcialmente: a
grade de fichas já tem coluna de margem (`contributionMarginPercent`, ver
`engineering-repository.ts`, commit `76280d5`) calculada a partir de preço de venda
cadastrado x custo da ficha. O que falta é cruzar com **vendas reais** (quantidade x
preço realmente vendido) em vez de só o preço de venda cadastrado — ou seja, essa
tela é essencialmente um relatório que junta `Venda` + `FichaTecnica.custo` já
calculado.

Sem #3 implementado, essa tela não tem dado real pra mostrar.

**Risco de schema: baixo** (é leitura/agregação, não precisa de tabela nova além de
`Venda`).

---

## 5. Novo modelo de importação (código, nome, seção, unidade, quantidade de compra)

**Este é pequeno e autocontido — pode ser feito sem esperar o resto.** É um preset
de mapeamento de colunas para o parser de importação existente
(`src/modules/import/`). Não requer esperar por Vendas/Cardápio.

Ação recomendada: tratar como quick task assim que o cliente confirmar os nomes
exatos das colunas esperadas no arquivo de origem (o pedido já lista "código, nome,
seção, unidade e quantidade de compra" — falta confirmar se "seção" mapeia para
`categoria operacional` existente ou é campo novo).

---

## 6. Integração com IA

Pedido genérico demais para escopar sem mais input. Possíveis interpretações,
do menor ao maior esforço:
- **Autocomplete inteligente de ingredientes** ao montar ficha técnica (sugerir itens
  parecidos com base no nome digitado) — viável com busca fuzzy local, sem LLM.
- **Sugestão de ficha técnica a partir do nome do prato** (gerar rascunho de
  ingredientes via LLM) — precisa de chave de API (Claude/OpenAI) e definição de
  custo/uso.
- **OCR de nota fiscal** para popular `ItemCompra` automaticamente — maior esforço,
  módulo novo de processamento de imagem/PDF.

Preciso que o cliente escolha qual dessas (ou outra) é a prioridade real antes de
qualquer código.

---

## Ordem sugerida (se aprovado)

1. Novo modelo de importação (#5) — rápido, sem dependências.
2. Tela de Pré-preparo (#1) — baixo risco, reusa código existente.
3. Cardápio (#2) — schema novo mas isolado.
4. Vendas (#3) — bloqueado até confirmar fonte dos dados.
5. Retorno Financeiro (#4) — depende de #3.
6. IA (#6) — bloqueado até o cliente escolher o escopo.

Cada um deveria virar uma Phase formal via `/gsd-plan-phase`, como o resto do
projeto já faz, para manter o padrão de TDD/verificação que vocês já usam.
