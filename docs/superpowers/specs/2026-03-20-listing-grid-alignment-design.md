# Listing Grid Alignment Design

## Contexto

As listagens principais do produto usam `DataGrid` com estilos semelhantes, mas cada tela define wrappers internos de célula, alinhamentos e espacamentos de forma independente. Isso faz com que o cabecalho siga uma regua e o conteudo siga outra, especialmente nas colunas com `Chip`, valores monetarios e blocos com duas linhas de texto.

O problema precisa ser corrigido em desktop e mobile, mantendo o uso de `Chip` nas celulas e preservando o comportamento de scroll horizontal quando a largura minima da grade for necessaria.

## Objetivo

Padronizar a geometria interna das grades principais para que:

- cabecalhos e celulas usem a mesma regua vertical
- colunas numericas compartilhem o mesmo alinhamento a direita
- colunas com `Chip` usem a mesma ancora visual em todas as telas
- o mesmo padrao se repita em `Itens`, `Fichas`, `Pendencias` e demais grades principais

## Escopo

### Em escopo

- criar um padrao compartilhado de estilo para `DataGrid`
- aplicar esse padrao nas listagens de `Itens` e `Fichas`
- reaplicar o mesmo padrao nas outras grades principais que hoje repetem o bloco base de estilo
- validar o comportamento em desktop e mobile

### Fora de escopo

- trocar `DataGrid` por tabela custom
- redesenhar filtros, cabecalhos de pagina ou cards externos a grade
- remover `Chip` das colunas de status ou tipo

## Decisao

Adotar um padrao compartilhado de grade com:

1. mesma altura base de linha e cabecalho
2. mesmo `padding-inline` para cabecalhos e celulas
3. wrappers internos consistentes para texto simples, texto empilhado, `Chip` e valores monetarios
4. regras centrais para alinhamento de colunas a esquerda, centro e direita
5. largura minima controlada para manter a integridade visual no mobile com scroll horizontal

## Implementacao Planejada

### Camada compartilhada

Criar uma configuracao central de estilo para grades, responsavel por:

- aparencia do `DataGrid`
- espacamento horizontal e vertical
- alinhamento de foco e hover
- classes ou helpers reutilizaveis para conteudo interno das celulas

### Aplicacao nas listagens

- `Itens`: ajustar colunas de item, tipo, fornecedor, custo e ficha para usar a mesma ancora visual
- `Fichas`: ajustar colunas de ficha, status, componentes, custo e atualizacao para seguir a mesma regua
- `Pendencias` e outras grades principais: substituir estilos locais repetidos pelo padrao compartilhado

### Mobile

Manter a grade com scroll horizontal, mas com a mesma geometria interna do desktop para evitar desalinhamento quando a tabela exceder a largura da viewport.

## Validacao

- testes unitarios das paginas/listagens afetadas continuam passando
- verificacao em browser real nas telas de `Itens` e `Fichas`
- confirmacao visual de que cabecalhos e celulas compartilham a mesma regua vertical
