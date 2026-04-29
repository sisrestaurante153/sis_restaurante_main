# Prompts para desenvolver o sistema de ficha técnica do restaurante

## 1) Síntese da análise do PDF e da planilha

### Escopo consolidado
O sistema precisa substituir o Excel por uma aplicação web com:
- cadastro único de itens;
- composição em camadas sem limite fixo;
- perdas por percentual ou por peso final;
- fichas técnicas com múltiplas etapas;
- montagem de pratos, porções, marmitas, combos e itens operacionais;
- recálculo em cascata;
- login, banco relacional e implantação em infraestrutura própria.

### O que encontrei na planilha
- **325 abas** no total.
- **TABELA VMARKET** funciona como base de preço/custo e também como índice de saídas calculadas.
- **EMBALAGENS** tem **31** itens operacionais.
- **PESOS** consolida tamanhos e pesos de P / M / G.
- Há aproximadamente:
  - **175** itens-base de insumo;
  - **30** itens processados/intermediários;
  - **115** produtos finais em kg referenciados pela tabela-base;
  - **149** abas de receitas/componentes;
  - **172** abas de composição final (pratos, porções, marmitas, kits, especiais etc.).
- Extraí **1446** referências de ingredientes e **418** referências de embalagens/itens operacionais.
- O encadeamento atual já tem pelo menos **4 transformações** em sequência (**5 nós**), por exemplo:
  - `Prato Feijoada -> Feijoada -> Farofa -> Tempero Feijoada -> Bacon moído`
- Há **207** diferenças entre nomes de abas, nomes de produto e nomes usados na base, então o sistema precisa de:
  - normalização;
  - tabela de aliases;
  - fila de conferência manual de conflitos.
- Há **277** linhas de uso em que a unidade da receita difere da unidade-base de compra, espalhadas por **58** itens distintos. Portanto, o sistema precisa suportar:
  - unidade de compra;
  - unidade de estoque;
  - unidade de uso;
  - fator de conversão.
- Existem pelo menos **2 referências que precisam de reconciliação manual** na migração:
  - `Batata lavada  graúda  un aproxim. 350g`
  - `Bicarbonato`

### Conclusão técnica
Não vale replicar o Excel como telas iguais ao Excel. O correto é:
- criar um **modelo canônico de domínio**;
- tratar a planilha como **fonte legada para importação e conferência**;
- manter uma estrutura única de item e uma estrutura única de composição;
- fazer o motor de custo/rendimento no backend;
- usar o Excel apenas para bootstrap da base.

---

## 2) Stack recomendada

### Escolha principal
**Monólito modular web** com:
- **Next.js 15 + React 19 + TypeScript**
- **PostgreSQL**
- **Prisma ORM + TypedSQL / SQL pontual para recursão**
- **Tailwind CSS + shadcn/ui**
- **Auth.js ou autenticação local com sessão por cookie seguro**
- **Vitest + Playwright**
- **Docker Compose + Nginx/Caddy**
- **Python + openpyxl apenas para importação/migração da planilha**

### Por que esta stack é a melhor aqui
- O sistema **não é complexo o suficiente para microserviços**.
- O domínio é **fortemente relacional e hierárquico**, então PostgreSQL é melhor que NoSQL.
- A aplicação precisa de **CRUD forte + cálculo + recursão + login + self-hosting**, e um monólito modular atende isso com menor custo de manutenção.
- O motor principal depende de **árvore de composição, recálculo e rastreabilidade**, então tudo precisa ficar no backend, versionado e testado.
- A importação do Excel fica melhor em **Python/openpyxl**, mas o produto final fica mais produtivo e mais simples de evoluir em **TypeScript full-stack**.

### Decisões de arquitetura
- **Não usar microserviços**
- **Não usar low-code/no-code**
- **Não usar Firebase/Firestore como núcleo**
- **Não usar planilha como banco**
- **Não separar frontend/backend em repositórios diferentes**
- **Não limitar níveis de composição**
- **Não limitar quantidade de ingredientes/embalagens por ficha**
- **Não modelar prato, marmita e pré-preparo em tabelas desconectadas**
- **Não copiar bugs e inversões visuais do Excel para o sistema**

---

## 3) Modelo de domínio recomendado

### Entidade central
Usar uma **tabela única de itens** e perfis/tipos sobre ela.

#### item
Campos mínimos:
- id
- codigo_interno
- nome
- nome_normalizado
- descricao
- categoria_operacional
- tipo_principal (`insumo`, `pre_preparo`, `intermediario`, `produto_pronto`, `prato`, `porcao`, `marmita`, `combo`, `embalagem`, `apoio`)
- ativo
- observacoes
- criado_em
- atualizado_em

#### item_alias
- id
- item_id
- alias
- origem (`excel`, `usuario`, `migracao`)
- confianca
- validado_por
- validado_em

#### unidade_medida
- id
- codigo (`kg`, `g`, `l`, `ml`, `un`, `maco`)
- tipo (`massa`, `volume`, `contagem`)

#### conversao_unidade
- id
- item_id
- unidade_origem
- unidade_destino
- fator
- observacao
- origem

#### item_compra
- id
- item_id
- fornecedor_id
- unidade_compra_id
- quantidade_por_embalagem
- custo_compra
- custo_unitario_base
- data_atualizacao_preco
- observacao

#### fornecedor
- id
- nome
- contato
- ativo

#### ficha_tecnica
- id
- item_resultante_id
- versao
- status (`rascunho`, `ativa`, `inativa`, `arquivada`)
- modo_rendimento (`percentual_perda`, `peso_final`)
- percentual_perda
- peso_final_informado
- rendimento_porcoes
- modo_preparo
- observacoes
- criada_por
- criada_em
- atualizada_em

#### ficha_componente
- id
- ficha_tecnica_id
- item_componente_id
- tipo_componente (`ingrediente`, `embalagem`, `apoio`)
- ordem
- quantidade_bruta
- quantidade_limpa
- unidade_uso_id
- fator_correcao
- indice_coccao
- custo_unitario_snapshot
- custo_total_snapshot
- observacao

#### custo_snapshot_item
- id
- item_id
- custo_unitario_atual
- custo_por_kg_ou_unidade_uso
- custo_embalagem_atual
- custo_total_atual
- calculado_em
- origem_recalculo

#### dependencia_item
- id
- item_origem_id
- item_destino_id
- profundidade

#### auditoria
- id
- usuario_id
- entidade
- entidade_id
- acao
- antes_json
- depois_json
- criado_em

#### usuario / role / permissao
Perfis mínimos:
- admin
- engenharia
- consulta

### Regra estrutural
Qualquer item pode compor qualquer outro item, desde que:
- não gere ciclo;
- respeite compatibilidade mínima de unidade;
- tenha ficha ativa quando usado como item composto.

---

## 4) Regras de negócio obrigatórias

1. **Estrutura única de item**
   - Não criar cadastro separado por módulo.
   - Tudo nasce de um item mestre.

2. **Composição recursiva**
   - Um item pode usar outro item que já é resultado de outra ficha.
   - Profundidade ilimitada.

3. **Rendimento e perdas**
   - A ficha deve aceitar:
     - percentual de perda; ou
     - peso final informado.
   - O custo do item resultante precisa sair do peso útil final.

4. **Recálculo em cascata**
   - Mudou custo de insumo?
   - Recalcular todos os ascendentes afetados.

5. **Rastreabilidade**
   - Mostrar:
     - custo próprio;
     - custo herdado;
     - composição expandida;
     - impacto por componente;
     - data do último cálculo.

6. **Unidades**
   - Separar unidade de compra, estoque e uso.
   - Exigir fator de conversão quando necessário.

7. **Embalagens e itens operacionais**
   - Entram na composição como componente de custo.
   - Não são tratamento especial fora da árvore.

8. **Versionamento**
   - Ficha ativa e histórico de versões.
   - Nunca sobrescrever silenciosamente uma ficha já usada.

9. **Anti-ciclo**
   - Bloquear vínculos que criem dependência circular.

10. **Importação legada**
   - Importar base do Excel.
   - Guardar origem de cada registro.
   - Gerar relatório de conflitos.

---

## 5) Contexto-base para colar em todos os prompts

Cole este bloco no começo de cada prompt abaixo:

```text
Você é um agente de engenharia de software sênior com acesso total ao computador do usuário para construir este sistema end-to-end.
Trabalhe de forma autônoma, sem pedir confirmação, mas respeite estes limites:
1) opere apenas dentro da pasta do projeto;
2) não altere arquivos pessoais fora do projeto;
3) pode instalar dependências, criar containers, rodar banco, testes, navegador e scripts;
4) deve sempre deixar o projeto executável localmente;
5) deve registrar decisões técnicas no próprio repositório.

Contexto do produto:
- sistema web de engenharia de produtos para restaurante;
- precisa substituir um Excel legado;
- deve suportar: insumo bruto -> pré-preparo -> produto intermediário -> produto pronto -> prato -> porção -> marmita -> combo -> embalagem/item de apoio;
- composição em camadas ilimitadas;
- perdas por percentual ou peso final informado;
- recálculo em cascata;
- rastreabilidade total de custo e rendimento;
- login de usuário;
- banco relacional;
- implantação self-hosted.

Achados da base legada:
- arquivo Excel com 325 abas;
- TABELA VMARKET como base de preço/custo e índice de saídas calculadas;
- EMBALAGENS como base operacional;
- PESOS como consolidador de tamanhos;
- cerca de 175 insumos-base, 30 processados, 115 produtos finais em kg;
- cerca de 149 abas de receitas/componentes e 172 abas de composição final;
- 1446 referências de ingredientes e 418 referências de embalagens;
- pelo menos 4 níveis reais de composição em cadeia;
- 207 divergências de nome/alias entre abas, produtos e base;
- 58 itens com divergência entre unidade de compra e unidade de uso;
- existem inconsistências de layout no Excel, então o Excel deve ser tratado como legado de importação, não como modelo final de arquitetura.

Stack mandatória:
- monólito modular;
- Next.js 15 + React 19 + TypeScript;
- PostgreSQL;
- Prisma ORM com SQL tipado / SQL pontual para recursão;
- Tailwind + shadcn/ui;
- autenticação com sessão segura;
- Vitest + Playwright;
- Docker Compose;
- Python/openpyxl apenas para scripts de importação do Excel.

Regras mandatórias:
- não use microserviços;
- não use low-code;
- não limite profundidade da árvore;
- não limite número de componentes por ficha;
- crie tabela única de item e composição única;
- implemente bloqueio de ciclos;
- implemente versionamento de fichas;
- implemente auditoria;
- implemente importação do Excel com normalização, aliases e fila de reconciliação manual;
- deixe tudo testado e documentado.
```

---

## 6) Prompt mestre (usar se quiser que o agente faça tudo de uma vez)

```text
[COLE AQUI O CONTEXTO-BASE]

Sua tarefa é construir o sistema completo do zero, localmente, até ficar executável e documentado.

Objetivo:
entregar a primeira versão funcional do sistema de engenharia de produtos para restaurante, substituindo a lógica principal do Excel legado por uma aplicação web self-hosted.

O que você deve fazer:
1) criar a estrutura inicial do projeto;
2) modelar o banco de dados;
3) implementar o motor de composição recursiva;
4) implementar o motor de perdas/rendimento;
5) implementar o recálculo em cascata;
6) implementar importação do Excel legado;
7) implementar login, papéis e auditoria;
8) implementar telas de cadastro, ficha técnica, pesquisa e montagem;
9) implementar telas de impacto de custo e árvore expandida;
10) implementar testes automatizados;
11) subir tudo com Docker Compose;
12) escrever documentação técnica e operacional.

Entregáveis mínimos:
- aplicação rodando localmente;
- banco migrado;
- seed inicial;
- importador do Excel legado;
- telas principais operacionais;
- testes de unidade, integração e e2e;
- README completo com comandos;
- arquivo ADR com decisões;
- documentação de deploy self-hosted.

Critérios de aceite:
- alterar preço de insumo recalcula cadeia inteira;
- ficha aceita perda percentual ou peso final;
- item pode compor item em qualquer profundidade;
- sistema bloqueia ciclos;
- sistema mostra composição expandida e custo por componente;
- sistema inclui embalagens no custo final;
- sistema permite criar, editar, duplicar, inativar e pesquisar fichas;
- sistema mantém histórico e auditoria;
- importação gera relatório de conflitos;
- tudo sobe com um único comando de ambiente local.

Forma de trabalho:
- implemente por etapas;
- ao final de cada etapa, rode testes;
- não deixe placeholders vazios;
- não gere mock superficial no lugar de regra real;
- priorize domínio correto e rastreabilidade;
- quando houver dúvida entre copiar o Excel ou corrigir sua modelagem, prefira a modelagem correta mantendo compatibilidade funcional;
- ao final, entregue uma lista do que foi implementado, como executar, e o que ficou preparado para fase 2.
```

---

## 7) Prompt 1 — fundação do projeto e arquitetura

```text
[COLE AQUI O CONTEXTO-BASE]

Crie a fundação técnica do projeto.

Faça:
1) inicialização do monorepo/aplicação;
2) configuração de TypeScript, lint, format, env, Docker Compose;
3) configuração do PostgreSQL;
4) estrutura de pastas com separação clara entre UI, server, domain, infra e tests;
5) README inicial;
6) ADR explicando por que o projeto será um monólito modular;
7) healthcheck, logs básicos e scripts de dev/build/test.

Entregue:
- estrutura de diretórios;
- docker-compose funcional;
- .env.example;
- scripts npm/pnpm;
- README de bootstrap;
- ADR 001 arquitetura.

Não implemente tela ainda além do necessário para validar o bootstrap.
```

---

## 8) Prompt 2 — modelagem de banco e domínio

```text
[COLE AQUI O CONTEXTO-BASE]

Modele o banco de dados e a camada de domínio.

Implemente:
- item
- item_alias
- unidade_medida
- conversao_unidade
- fornecedor
- item_compra
- ficha_tecnica
- ficha_componente
- custo_snapshot_item
- dependencia_item
- usuario
- role
- permissao
- auditoria

Requisitos:
- usar Prisma ORM;
- usar tipos NUMERIC para valores monetários e pesos relevantes;
- permitir auto-relacionamento e árvore de composição;
- impedir ciclos via regra de domínio;
- preparar tabela de fechamento/closure ou estrutura equivalente para impacto e recálculo;
- gerar migrations;
- gerar seed mínimo;
- documentar cardinalidade e invariantes.

Entregue:
- schema Prisma;
- migrations;
- diagrama ER textual em markdown;
- serviços de domínio base;
- testes unitários das invariantes principais.
```

---

## 9) Prompt 3 — importação da planilha legada

```text
[COLE AQUI O CONTEXTO-BASE]

Implemente a migração/importação do Excel legado para o modelo novo.

Objetivo:
ler a planilha atual, normalizar dados, importar cadastros, importar fichas, importar embalagens e registrar conflitos.

Faça:
1) script Python com openpyxl para leitura da planilha;
2) parser específico para:
   - TABELA VMARKET
   - EMBALAGENS
   - PESOS
   - abas de receita/componentes
   - abas de composição final
3) normalização de nomes;
4) criação de aliases;
5) reconciliação automática quando houver alta confiança;
6) fila de pendências quando houver conflito;
7) relatório final de importação.

Regras:
- não dependa de posições rígidas cegamente;
- detecte diferenças de layout entre abas;
- trate divergências de nomes entre aba, produto e base;
- trate divergências de unidade;
- preserve rastreabilidade da origem Excel;
- isole os casos não reconciliados para revisão manual.

Pendências conhecidas que já devem entrar na fila:
- Batata lavada  graúda  un aproxim. 350g
- Bicarbonato

Entregue:
- script(s) de importação;
- tabela de staging se necessário;
- relatório markdown/json de importação;
- lista de conflitos;
- testes do parser com amostras reais.
```

---

## 10) Prompt 4 — motor de custo, rendimento e recálculo

```text
[COLE AQUI O CONTEXTO-BASE]

Implemente o motor principal do sistema.

Regras obrigatórias:
- ficha pode trabalhar com perda percentual ou peso final informado;
- custo final do item resultante deve sair do peso útil final;
- embalagens e itens de apoio entram no custo;
- alteração de custo de insumo recalcula toda a árvore afetada;
- custo expandido precisa abrir a contribuição de cada componente;
- o sistema deve detectar e bloquear ciclos antes de salvar;
- o sistema deve manter snapshots e trilha de cálculo.

Implemente:
1) cálculo de custo direto;
2) cálculo de custo herdado;
3) cálculo de FC/IC equivalente de forma canônica;
4) cálculo de custo por kg / por porção / por item final;
5) recálculo em cascata;
6) visualização de impacto;
7) testes com cenários encadeados reais.

Teste pelo menos estes cenários:
- insumo simples sem perda;
- receita com perda percentual;
- receita com peso final informado;
- prato com item intermediário + embalagem;
- marmita com múltiplos componentes;
- alteração de preço de um insumo afetando cadeia inteira;
- bloqueio de ciclo.

Use transações e precisão decimal; não use float para dinheiro.
```

---

## 11) Prompt 5 — interface web e fluxos operacionais

```text
[COLE AQUI O CONTEXTO-BASE]

Implemente a interface web completa da primeira entrega.

Telas mínimas:
1) login;
2) dashboard inicial simples;
3) lista de itens com busca e filtros;
4) cadastro/edição de item;
5) lista de fichas;
6) criação/edição/duplicação/inativação de ficha;
7) editor de componentes da ficha com linha dinâmica infinita;
8) tela de montagem de prato/marmita/combo;
9) visualização expandida da composição;
10) visualização de custo e rendimento;
11) tela de pendências de importação/reconciliação;
12) histórico/auditoria por item/ficha.

UX obrigatória:
- nada de UI com cara de planilha;
- formulário rápido e operacional;
- foco em busca, edição e rastreabilidade;
- exibir claramente unidade de compra, unidade de uso e fator de conversão;
- exibir impacto de embalagem;
- exibir custo direto, indireto/herdado e total;
- exibir status da ficha.

Use:
- Tailwind
- shadcn/ui
- formulários com validação forte
- tabela com filtros e paginação
- componentes reutilizáveis
```

---

## 12) Prompt 6 — autenticação, autorização e auditoria

```text
[COLE AQUI O CONTEXTO-BASE]

Implemente segurança de acesso e trilha de auditoria.

Requisitos:
- autenticação por sessão segura;
- papéis: admin, engenharia, consulta;
- controle de acesso por rota e ação;
- auditoria de criação, edição, duplicação, inativação, importação e recálculo;
- registro de antes/depois em JSON quando aplicável;
- proteção contra acesso indevido;
- política básica de senha e logout.

Entregue:
- autenticação operacional;
- middleware/guardas;
- política de autorização;
- tabela/serviço de auditoria;
- testes cobrindo permissões.
```

---

## 13) Prompt 7 — testes, dados de exemplo e homologação

```text
[COLE AQUI O CONTEXTO-BASE]

Feche a qualidade do sistema.

Implemente:
- testes unitários do domínio;
- testes de integração do banco;
- testes e2e com Playwright;
- massa de dados de exemplo;
- smoke test do fluxo completo.

Fluxos e2e obrigatórios:
1) login;
2) cadastro de item;
3) criação de ficha;
4) inclusão de componente intermediário;
5) inclusão de embalagem;
6) cálculo automático de custo;
7) alteração de preço do insumo;
8) recálculo em cascata;
9) consulta da árvore expandida;
10) pesquisa e inativação de ficha.

Gere também:
- checklist de homologação;
- script de reset de ambiente local;
- relatório final de cobertura e riscos.
```

---

## 14) Prompt 8 — deploy self-hosted e documentação final

```text
[COLE AQUI O CONTEXTO-BASE]

Prepare a entrega para produção em infraestrutura própria.

Faça:
1) Dockerfile(s);
2) docker-compose para produção base;
3) reverse proxy com Nginx ou Caddy;
4) variáveis de ambiente organizadas;
5) backup básico do banco;
6) healthchecks;
7) script de migrate/seed;
8) documentação operacional de deploy;
9) documentação de rollback;
10) documentação de troubleshooting.

A documentação final deve incluir:
- visão geral da arquitetura;
- como subir local;
- como subir em produção;
- como importar a planilha;
- como tratar pendências de reconciliação;
- como recalcular custos;
- como criar usuários;
- como fazer backup e restore;
- o que é escopo da fase 1 e o que fica preparado para fase 2.
```

---

## 15) Orientação final de uso

### Se quiser máxima autonomia
Use primeiro o **Prompt mestre**.

### Se quiser mais controle
Use em sequência:
1. Prompt 1
2. Prompt 2
3. Prompt 3
4. Prompt 4
5. Prompt 5
6. Prompt 6
7. Prompt 7
8. Prompt 8

### O que eu recomendo
Para um agente com acesso total ao computador, a melhor abordagem é:
- rodar o **Prompt 1 ao 4** primeiro para consolidar domínio e cálculo;
- só depois rodar **Prompt 5 ao 8**.

Essa ordem reduz a chance de o agente construir UI bonita sobre domínio errado.
