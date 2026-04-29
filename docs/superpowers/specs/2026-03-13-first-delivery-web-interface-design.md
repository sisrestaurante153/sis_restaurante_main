# First Delivery Web Interface Design

## Contexto

O repositório já possui bootstrap técnico, modelagem relacional, motor de custo em domínio puro e importação legada inicial. Ainda falta a primeira entrega operacional da interface web: autenticação, shell de navegação e telas capazes de apoiar cadastro, composição, rastreabilidade e reconciliação sem reproduzir a planilha como UX.

O pedido do produto exige autonomia e execução end-to-end sem esperar aprovações intermediárias. Por isso esta spec registra o desenho adotado como base de implementação imediata.

## Objetivo desta entrega

Entregar uma interface web autenticada, moderna e operacional, cobrindo:

- login por sessão segura;
- dashboard inicial;
- lista e edição de itens;
- lista e edição de fichas com duplicação/inativação;
- editor dinâmico de componentes;
- tela de montagem de prato, marmita e combo;
- visão expandida de composição;
- visão de custo e rendimento;
- pendências de importação/reconciliação;
- histórico e auditoria.

## Abordagem escolhida

Foi escolhida uma primeira entrega server-first no App Router, com shell autenticado e páginas compostas por módulos internos. O backend continua no mesmo monólito Next.js, usando Prisma quando o banco estiver disponível e um repositório demo determinístico como fallback para manter o projeto executável localmente mesmo sem PostgreSQL inicializado.

Essa abordagem entrega fluxo funcional imediatamente, preserva o modelo canônico do domínio e evita bloquear a UX por dependências ainda não concluídas do motor transacional completo. O fallback demo é só uma estratégia de bootstrap operacional; a forma dos dados seguirá o domínio real.

## Alternativas consideradas

### 1. Interface totalmente mockada no frontend

Prós:
- rápida de montar;
- sem dependência de persistência.

Contras:
- fraca aderência ao domínio;
- alto retrabalho ao conectar com o backend;
- pouca confiança sobre estados reais.

### 2. CRUD 100% Prisma-first para todas as telas desde já

Prós:
- persistência total desde o primeiro dia;
- integração mais próxima da produção.

Contras:
- aumento forte de escopo;
- risco de travar a entrega visual por detalhes de banco, auth e importação.

### 3. Híbrido Prisma + fallback demo

Prós:
- mantém a aplicação usável sem banco;
- permite ligar as telas ao shape real do domínio;
- reduz risco de bloqueio e deixa caminho claro para endurecer persistência depois.

Contras:
- exige disciplina para não deixar o demo divergir do domínio.

Recomendação adotada: alternativa 3.

## Arquitetura funcional

### App Router

- `src/app/(auth)/login`: entrada pública.
- `src/app/(app)`: grupo autenticado com layout lateral, cabeçalho operacional e navegação.
- Rotas dedicadas para `itens`, `fichas`, `montagem`, `composicao`, `custos`, `importacao` e `auditoria`.

### Módulos

- `access`: sessão, login, autorização e leitura do usuário atual.
- `catalog`: consultas e mutações de item para a UI operacional.
- `engineering`: consultas e mutações de fichas, composição, montagem e custo.
- `import`: leitura das pendências de reconciliação.
- `platform`: shell, navegação, utilidades de página e componentes compartilhados.

### Fonte de dados

- `Prisma` é usado quando `DATABASE_URL` estiver configurada e o banco responder.
- Em ausência de banco, um `demo repository` entrega dataset consistente para todas as telas.
- A UI não conhece a origem; consome view models já prontos.

## Autenticação e segurança

- Login por formulário com validação `zod`.
- Sessão em cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, expiração explícita e `secure` em produção.
- Assinatura HMAC baseada em `SESSION_SECRET`.
- Leitura de sessão com `await cookies()` conforme Next.js 15.
- Redirecionamento server-side para proteger o grupo autenticado.
- Logout por Server Action.

Nesta entrega não será criado storage de sessões no banco; o cookie assinado é suficiente para a primeira versão operacional e mantém o deploy simples.

## UX e direção visual

- Visual editorial-operacional: aparência limpa, quente e intencional, sem estética de planilha.
- Foco em busca, filtros, contexto e rastreabilidade.
- Formulários em painéis curtos, com campos densos e mensagens de validação objetivas.
- Destaques explícitos para unidade de compra, unidade de uso, fator de conversão, custo direto, custo herdado, embalagem e status.
- Componentes reutilizáveis para shell, cabeçalho de página, filtros, tabelas, cartões métricos e timeline.

## Escopo de telas

### Login

- credenciais;
- ajuda operacional com usuário seed;
- feedback de erro de autenticação.

### Dashboard

- KPIs de itens, fichas ativas, pendências de importação e impacto recente;
- blocos de atenção operacional.

### Itens

- lista com busca, filtro por tipo e status;
- paginação via query string;
- formulário de novo/edição;
- bloco de compra/uso/conversão.

### Fichas

- lista com busca, status e tipo de item resultante;
- edição de metadados;
- duplicação;
- inativação;
- editor dinâmico de componentes com adição de linhas.

### Montagem

- composição operacional de prato, porção, marmita e combo;
- leitura consolidada de custo final e itens incluídos.

### Composição expandida

- árvore expandida por caminho;
- profundidade e tipo de componente;
- destaque de embalagem e apoio.

### Custos e rendimento

- custo direto, herdado e total;
- rendimento, saída útil e custo por porção;
- impacto por componente.

### Pendências de importação

- conflitos abertos;
- alias sugerido;
- confiança e origem da planilha.

### Auditoria

- histórico por item/ficha;
- ações, usuário, antes/depois e timestamp.

## Estratégia de testes

- TDD por fatia.
- Unitários para sessão, autenticação, parsing de formulários e view models.
- Unitários para mutações principais de item/ficha em repositório demo.
- E2E Playwright cobrindo login, dashboard, navegação principal e abertura do editor de ficha.

## Documentação e operação local

- README atualizado com fluxo: instalar, subir banco, migrar, seed, credenciais demo, rodar app e testes.
- Seed expandido para gerar base coerente com as telas.
- Dockerfile e Compose mantidos compatíveis com execução local/self-hosted.

## Critérios de sucesso

- projeto inicia localmente com `npm run dev`;
- login funcional com sessão segura;
- todas as telas mínimas existem e navegam dentro do shell autenticado;
- listas possuem busca/filtro/paginação;
- item e ficha podem ser editados;
- ficha pode ser duplicada e inativada;
- composição expandida, custos, pendências e auditoria exibem dados coerentes;
- testes automatizados passam;
- decisões técnicas ficam registradas no repositório.
