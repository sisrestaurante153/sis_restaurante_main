# Excel Parity Layout Design

## Status atual

O layout resultante desta especificação foi validado pelo cliente e passa a ser a base oficial da ficha técnica.

Nesta fase, a aprovação cobre:

- cabeçalho da ficha na ordem do Excel;
- grade principal com ingredientes à esquerda;
- embalagens e custos de delivery na lateral direita;
- bloco de totais e indicadores dentro do corpo da ficha.

Permanecem fora de escopo desta validação os campos comerciais ainda sem origem persistida no produto, que continuam apenas como superset visual do Excel.

## Contexto

Os áudios do cliente em 2026-03-17 redefiniram a direção da interface de ficha técnica. A primeira entrega web seguiu uma interpretação editorial-operacional da ficha, separando `fichas` e `montagem` em experiências distintas e reorganizando os campos em etapas genéricas.

Essa direção não atende ao modelo mental do cliente. A exigência explícita agora é:

- o layout deve ser muito próximo do Excel legado;
- a ordem dos campos deve seguir a ordem operacional do Excel;
- a ficha mais completa deve servir como referência base;
- todos os campos relevantes precisam existir no layout único, mesmo quando nem toda ficha usar todos eles.

## Decisão principal

Adotar uma **ficha técnica única com paridade estrutural ao Excel**, usando como referência um conjunto de 3-4 fichas legadas e, principalmente, a mais completa entre elas. O sistema continua com domínio canônico e cálculo no backend, mas a forma de entrada e leitura deve espelhar a lógica operacional já treinada pela equipe no Excel.

Isso implica:

- abandonar a diferença conceitual entre “ficha” e “montagem” na experiência principal;
- tratar `prato`, `porcao`, `marmita` e `combo` como variações do mesmo editor de ficha;
- manter todos os grupos e campos que possam aparecer em cascata;
- esconder ou colapsar trechos vazios apenas sem alterar a ordem base da ficha.

## Requisitos de layout

### 1. Ficha única para todos os itens

- Um único editor deve atender desde itens simples, como alface limpa, até fichas completas de marmita montada.
- A rota de `montagem` não deve introduzir outra lógica visual; ela pode virar atalho, filtro ou redirecionamento para a mesma ficha canônica.
- O item resultante continua sendo escolhido a partir do cadastro mestre, sem criar estruturas paralelas.

### 2. Ordem operacional igual ao Excel

- A sequência visual da ficha deve seguir a ordem de trabalho usada hoje na planilha.
- O usuário precisa ler a ficha de cima para baixo como lê no Excel, sem reinterpretar blocos ou pular entre contextos.
- A ficha mais completa define a ordem padrão; fichas simples apenas usam menos campos.

### 3. Superset de campos

- O layout precisa conter todos os campos que podem aparecer nas variações de ficha técnica.
- Campos citados explicitamente pelo cliente e já presentes no domínio não podem desaparecer da UI:
  - quantidade bruta;
  - quantidade líquida;
  - percentual/índice de perda;
  - fator de correção;
  - índice de cocção;
  - peso final ou saída útil;
  - custo resultante por quilo;
  - grupos de componentes, incluindo embalagem e apoio quando aplicável.
- A ausência de uso em uma ficha específica não justifica remover o campo do layout base.

### 4. Leitura da cascata operacional

- O layout deve tornar explícita a sequência `bruto -> limpeza/perda -> preparo/cocção -> produto pronto`.
- O usuário precisa conseguir conferir como o custo unitário muda após cada transformação sem depender de cálculo mental.
- A exibição deve privilegiar:
  - peso inicial;
  - perda por etapa;
  - peso útil final;
  - custo da peça/lote;
  - custo final por kg.

### 5. Grupos e biblioteca de materiais

- A ficha deve permitir selecionar componentes por grupo para evitar chamar todos os itens de uma vez.
- Embalagem, descartáveis e itens de apoio continuam compondo a mesma árvore de custo.
- A “segunda aba” solicitada pelo cliente deve servir à seleção/filtragem de materiais por grupo sem criar um editor paralelo.

## Impacto no produto atual

- `/montagem` deixa de ser uma experiência própria e passa a ser entrada filtrada da mesma ficha canônica.
- `src/modules/engineering/ui/ficha-form.tsx` precisa deixar de usar apenas blocos genéricos por etapas e passar a refletir a ordem do Excel.
- `src/modules/engineering/ui/components-editor.tsx` precisa expor todos os campos de processo de forma consistente entre fichas simples e completas.
- A navegação lateral e os títulos das páginas devem reforçar “Ficha técnica” como experiência central, não “Montagem” como fluxo separado.

## Critérios de aceitação

- Uma ficha simples e uma ficha complexa compartilham o mesmo layout base.
- A ordem visual da ficha é reconhecível por quem trabalha hoje com o Excel.
- Todos os campos relevantes da ficha mais completa existem no editor.
- O usuário consegue entender a cascata de custo e rendimento olhando a ficha.
- Embalagem e apoio continuam entrando como custo na mesma composição.
- Abrir uma marmita não leva a uma experiência diferente de abrir outra ficha técnica; muda apenas a quantidade de grupos/linhas ativos.

## Assunções adotadas

- “Muito idêntico ao Excel” significa paridade de estrutura, ordem e vocabulário operacional, não cópia literal de limitações visuais do arquivo.
- O domínio relacional atual permanece válido; a mudança principal é de UX, view model e agrupamento de informação.
- Os termos reconhecidos nos áudios com ambiguidade de transcrição serão confirmados pela própria planilha legada durante a implementação, sem alterar a decisão central de paridade.
