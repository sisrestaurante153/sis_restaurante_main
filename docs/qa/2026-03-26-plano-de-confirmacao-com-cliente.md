# Plano Consolidado do Cliente

Data: 2026-03-26
Objetivo: consolidar em um unico documento tudo o que o cliente solicitou, ja incorporando as confirmacoes mais recentes sobre cadastro, importacao, estrutura das telas e ficha tecnica por etapas.

## 1. Direcao geral confirmada

O cliente confirmou que a proxima evolucao do sistema deve contemplar quatro frentes integradas:

1. transformar listas e campos fixos em cadastros gerenciaveis;
2. disponibilizar importacao operacional da estrutura de itens;
3. reorganizar a tela de itens;
4. evoluir a ficha tecnica para trabalhar com etapas sequenciais.

Essa evolucao nao e apenas ajuste visual. Ela envolve mudancas de cadastro mestre, importacao, layout, semantica de campos e modelagem da ficha tecnica.

## 2. Cadastros que precisam virar gerenciamento proprio

O cliente quer gerenciamento proprio para os seguintes dados:

- fornecedor;
- tipo;
- categoria operacional;
- unidade;
- modalidade.

### Regras esperadas

- cada um desses dados deve ter area propria de cadastro;
- deve ser possivel cadastrar;
- deve ser possivel editar;
- deve ser possivel excluir somente quando nao houver vinculo;
- o sistema nao deve mais depender apenas de lista fixa ou preenchimento implicito nesses pontos.

### Confirmacao importante

A `modalidade` foi definida como cadastro proprio.

Ela:

- nao deve depender automaticamente do tipo do item;
- deve ser cadastrada em um local proprio;
- deve ser escolhida diretamente na ficha tecnica.

## 3. Importacao operacional

### Regra geral

A importacao recorrente desejada no sistema e apenas da estrutura de itens.

### O que entra nessa importacao

- Nome do Item
- Tipo
- Categoria Operacional (Secao)
- Unidade de Compra
- Quantidade de Compra
- Preco de Compra
- Fator de Conversao
- Unidade de Uso
- Quantidade de Uso
- Preco de Uso
- Data e Hora da Ultima Atualizacao
- Indicador de descricao operacional

### Requisitos da importacao

- mapeamento de dados;
- historico;
- rastreabilidade da origem;
- rastreabilidade da data e hora da atualizacao;
- uso no dia a dia para atualizar cadastro e preco dos itens.

### O que fica fora da rotina operacional

- a importacao das fichas tecnicas legadas do Excel sera feita apenas uma vez;
- essa importacao assistida nao precisa virar funcionalidade recorrente do sistema.

## 4. Estrutura desejada da tela de Item

O cliente definiu a estrutura da tela de item da seguinte forma.

### 4.1. Cabecalho do item

- Nome do Item
- Tipo
- Status
- Descricao Opcional
- Categoria Operacional (Secao)

### 4.2. Descricao e detalhamento do item

- Unidade de Compra
- Quantidade de Compra
- Preco de Compra
- Fator de Conversao
- Unidade de Uso
- Quantidade de Uso
- Preco de Uso
- Data e Hora da Ultima Atualizacao

### 4.3. Regras visuais e de leitura

- a tela e a listagem devem refletir essa ordem de informacoes;
- deve existir indicador visual quando houver descricao operacional;
- a ultima atualizacao deve exibir data e hora.

## 5. Estrutura desejada da ficha tecnica

O cliente confirmou que a ficha tecnica deve seguir uma estrutura nova, organizada por cabecalho, detalhamento dos itens e etapas.

### 5.1. Cabecalho da ficha tecnica

- Produto
- Data de Criacao
- Data e Hora da Ultima Alteracao
- Modalidade
- Grupo Operacional
- Rendimento (porcao)
- Unidade de Medida
- Custo Atual da Ficha

### 5.2. Regras do cabecalho

- `Modalidade` e selecionada diretamente na ficha tecnica;
- `Grupo Operacional` deve aparecer na ficha e tambem pode servir como filtro;
- `Rendimento (porcao)` deve receber destaque visual;
- `Data e Hora da Ultima Alteracao` deve aparecer de forma explicita;
- `Unidade de Medida` deve aparecer junto das informacoes de rendimento e peso;
- `Custo Atual da Ficha` deve permanecer visivel no cabecalho;
- deve existir indicador visual quando a ficha ou o produto tiver observacao.

## 6. Estrutura desejada dos itens dentro da ficha tecnica

Na descricao e detalhamento dos itens da ficha tecnica, o cliente quer os seguintes campos:

- Item
- Tipo
- Quantidade utilizada
- Unidade de Medida
- Custo Unitario
- Custo Total do Insumo

### Renomeacao confirmada

O campo hoje associado a `Peso Bruto` deve ser renomeado para `Quantidade utilizada`.

### Leitura hierarquica da composicao

O cliente tambem sinalizou a necessidade de leitura por nivel ou camada na composicao da ficha, com identificacao equivalente a:

- item de primeira camada;
- item de segunda camada;
- item de camadas seguintes.

Interpretacao consolidada:

- a composicao da ficha deve preservar a nocao de profundidade da estrutura;
- a interface deve permitir identificar em que nivel o item aparece dentro da composicao.

### Botoes de acao

O cliente quer dois botoes dedicados:

- Adicionar Itens
- Adicionar Etapas

Esses dois fluxos devem existir separadamente.

## 7. Modelo confirmado de ficha tecnica por etapas

O cliente confirmou que a ficha tecnica deve seguir o modelo novo por etapas.

### 7.1. Regras estruturais das etapas

- a ficha deve suportar multiplas etapas sequenciais;
- nao deve existir limite fixo para quantidade de etapas;
- cada item participa dentro de uma etapa especifica;
- cada etapa deve registrar entrada e saida;
- o sistema deve calcular a perda da etapa;
- o sistema deve permitir organizar a producao por fluxo operacional.

### 7.2. Exemplos de etapas sugeridas pelo cliente

- Limpeza e Higienizacao
- Preparo e Manipulacao
- Coccao e Finalizacao
- Montagem do Produto

Esses exemplos indicam a logica operacional desejada, mas a estrutura deve permitir multiplas etapas sequenciais na ficha.

## 8. Informacoes que devem ficar no nivel da etapa

O cliente confirmou que `FC` e `IC` nao devem aparecer em cada item.

Eles devem ficar no nivel da etapa.

Cada etapa deve apresentar:

- peso final;
- FC;
- IC;
- valor total da etapa.

### Regra adicional da etapa

Cada etapa deve funcionar como um bloco consolidado, com seus proprios indicadores e totais.

## 9. Campos do cabecalho que nao devem ser removidos

O cliente pediu explicitamente para nao remover do cabecalho:

- `% Perda`

### Renomeacao confirmada

O campo `% Perda` deve ser renomeado para:

- `% de Coccao`

### Regras visuais confirmadas

- se o valor for negativo, deve aparecer em vermelho;
- quando negativo, deve apresentar o sinal `-`;
- se o valor for positivo, deve aparecer em azul.

### Regra adicional

O sistema tambem deve apresentar o `total de peso` seguindo a mesma logica visual:

- negativo em vermelho com sinal `-`;
- positivo em azul.

## 10. Parte inferior da ficha

O cliente informou que a parte inferior da ficha tecnica deve seguir o modelo do Excel.

Interpretacao consolidada:

- a base de referencia visual e funcional dessa area sera o Excel legado;
- os totais, quadros e organizacao dessa parte inferior devem seguir essa estrutura.

## 11. Ajustes visuais solicitados nas imagens e na tela

Pelos retornos do cliente, tambem entram no escopo os seguintes ajustes visuais:

- trocar a ordem entre rendimento e peso final, priorizando o rendimento;
- mostrar a unidade de medida junto das informacoes de peso;
- remover o bloco visual azul destacado nas imagens;
- deixar a area principal de composicao ocupando melhor o espaco da tela;
- manter descartaveis e embalagens agrupados na mesma leitura de totalizacao;
- mostrar data e hora na ultima alteracao;
- manter a leitura da ficha mais proxima do fluxo operacional real.

## 12. Regras de negocio consolidadas a partir do pedido

Com base no que o cliente validou, o sistema deve refletir as seguintes regras:

- modalidade e escolha direta da ficha, nao uma heranca automatica do tipo do item;
- grupo operacional permanece visivel na ficha e pode ser usado como filtro;
- a ficha tecnica deve funcionar por etapas, e nao apenas por uma lista unica de componentes;
- FC e IC pertencem a etapa, nao ao item;
- os itens da ficha mostram somente os dados operacionais essenciais;
- os totais e indicadores da etapa concentram os dados derivados do processo;
- a importacao recorrente do dia a dia e apenas de itens;
- as fichas legadas entram por carga assistida unica.

## 13. Plano consolidado de execucao

### Fase 1. Cadastros mestres

Implementar o gerenciamento proprio de:

- fornecedor;
- tipo;
- categoria operacional;
- unidade;
- modalidade.

Com suporte a:

- cadastro;
- edicao;
- exclusao condicionada a ausencia de vinculos.

### Fase 2. Importacao operacional de itens

Implementar a importacao recorrente apenas da estrutura de itens, com:

- mapeamento de colunas;
- validacao;
- historico;
- rastreabilidade da origem;
- rastreabilidade da ultima atualizacao.

### Fase 3. Reestruturacao da tela de Item

Implementar a nova organizacao da tela de item com:

- cabecalho padronizado;
- bloco de detalhamento operacional;
- data e hora da ultima atualizacao;
- indicador visual de descricao operacional.

### Fase 4. Reestruturacao da ficha tecnica

Implementar o novo cabecalho da ficha com:

- produto;
- datas;
- modalidade;
- grupo operacional;
- rendimento;
- unidade de medida;
- custo atual da ficha;
- `% de Coccao`;
- total de peso com regra visual.

### Fase 5. Ficha tecnica por etapas

Implementar a nova estrutura da ficha com:

- multiplas etapas sequenciais;
- inclusao de itens por etapa;
- botao `Adicionar Itens`;
- botao `Adicionar Etapas`;
- entrada e saida por etapa;
- perda calculada por etapa;
- peso final por etapa;
- FC por etapa;
- IC por etapa;
- valor total da etapa.

### Fase 6. Parte inferior da ficha em referencia ao Excel

Reproduzir na parte inferior da ficha a organizacao que o cliente quer manter inspirada no Excel, respeitando a usabilidade do sistema web.

## 14. Conclusao

Neste ponto, o pedido do cliente ja esta suficientemente consolidado para orientar implementacao.

O centro da mudanca e este:

- o sistema deixa de tratar parte dos dados como listas fixas;
- a importacao operacional passa a atender o dia a dia dos itens;
- a ficha tecnica sai do modelo atual de linhas soltas e passa a trabalhar por etapas;
- os indicadores principais ficam mais alinhados com o processo real de producao.
