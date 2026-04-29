# Escopo vs Estado Atual

Data da revisao: 2026-03-16
Fonte de comparacao: `escopo_desenvolvimento_sistema_restaurante.pdf`

## Veredito

O sistema atende o escopo funcional da primeira entrega descrita no PDF.

Ele esta pronto para:

- operacao assistida e homologacao com banco real;
- demonstracao ao cliente sem depender do modo demo;
- publicacao em infraestrutura propria com Compose/Nginx;
- continuidade de evolucao sobre a mesma base canonica.

Ele ainda possui pendencias tecnicas nao bloqueantes, mas elas nao descaracterizam a entrega principal.

## Evidencias verificadas nesta revisao

- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:python`
- `npm run test:e2e`

Todos os comandos acima passaram em 2026-03-16.

## Matriz de aderencia ao escopo

### 1. Cadastro e classificacao de itens

Status: atendido

Cobertura confirmada:

- cadastro unico de item mestre;
- tipos `insumo`, `pre_preparo`, `intermediario`, `produto_pronto`, `prato`, `porcao`, `marmita`, `combo`, `embalagem` e `apoio`;
- unidade de estoque, unidade de uso, unidade de compra e fator de conversao;
- fornecedor, quantidade por embalagem, custo de compra, custo unitario base e data de atualizacao de preco;
- criacao e edicao pela UI com persistencia em PostgreSQL.

### 2. Motor de composicao em camadas

Status: atendido

Cobertura confirmada:

- composicao recursiva no schema e na camada de dominio;
- fechamento transitivo de dependencias;
- bloqueio de ciclos antes de salvar fichas;
- leitura expandida em `/composicao`.

### 3. Controle de perdas e rendimento

Status: atendido

Cobertura confirmada:

- `percentual_perda`;
- `peso_final`;
- recalculo do custo resultante pela saida util;
- exibicao de custo total, custo por porcao e saida util na leitura da ficha.

### 4. Ficha tecnica com multiplas etapas

Status: atendido

Cobertura confirmada:

- ficha unificada para qualquer item composto;
- componentes com quantidade bruta, liquida, fator de correcao e indice de coccao;
- versao, status, duplicacao e inativacao;
- reaproveitamento de pre-preparo, intermediario, produto pronto e item final pela mesma estrutura.

### 5. Formacao de pratos e marmitas

Status: atendido

Cobertura confirmada:

- tela `/montagem` usando a mesma ficha canonica;
- composicao por item e peso;
- inclusao de embalagem e apoio na arvore de custo;
- persistencia real do fluxo final;
- cobertura E2E do fluxo `insumo -> ficha intermediaria -> ficha final com embalagem`.

Observacao:

- a mesma estrutura cobre `prato`, `porcao`, `marmita` e `combo`; o teste automatizado atual valida explicitamente `prato`.

### 6. Recalculo em cascata

Status: atendido

Cobertura confirmada:

- alteracao de custo de item dispara recalculo dos ascendentes;
- snapshots persistidos de custo;
- atualizacao refletida em ficha, composicao e custos;
- cobertura automatizada em testes de integracao e E2E.

### 7. Gestao e pesquisa de fichas

Status: atendido

Cobertura confirmada:

- criar;
- editar;
- duplicar;
- inativar;
- pesquisar;
- visualizar custo e rendimento.

### 8. Acesso, arquitetura e banco

Status: atendido

Cobertura confirmada:

- login com sessao segura;
- autorizacao por permissao/rota;
- PostgreSQL com Prisma;
- monolito modular em Next.js;
- Docker Compose, proxy e healthcheck.

### 9. Importacao do legado

Status: atendido para a primeira entrega

Cobertura confirmada:

- parser Python com `openpyxl`;
- carga em staging relacional;
- conflitos persistidos;
- reconciliacao manual via UI;
- rastreabilidade da origem da importacao.

## Pendencias remanescentes

As lacunas abaixo sao reais, mas hoje sao de endurecimento e evolucao, nao de escopo bloqueante:

- migrar a configuracao do Vitest que ainda usa `environmentMatchGlobs`, ja marcada como depreciada;
- investigar o warning deprecado do `pg` observado durante a execucao E2E em `next dev`;
- ampliar massa seed e homologacao com base legada completa para cobertura operacional maior;
- refinar UX textual e visual de algumas telas sem alterar a logica de negocio ja entregue.

## Conclusao

Comparando o codigo atual com o PDF de escopo, o sistema pode ser considerado completo para a primeira entrega funcional. O projeto nao esta mais apenas em fase de fundacao: ele ja entrega o fluxo principal de engenharia de produto, montagem final, custo/rendimento, cascata, importacao reconciliada, autenticacao e operacao self-hosted.
