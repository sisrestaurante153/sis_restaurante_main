# Access And Audit Design

## Contexto

A primeira entrega web ja possui login basico por sessao e shell autenticado, mas ainda nao endurece autorizacao por papel/permissao nem persiste auditoria real das mutacoes operacionais.

O produto agora exige controle de acesso por rota e por acao, politica basica de senha, logout, protecao contra acesso indevido e trilha de auditoria com before/after em JSON quando houver mutacao relevante.

## Objetivo

Endurecer a camada de acesso e auditoria sem quebrar a UX da primeira entrega, preservando:

- sessao segura em cookie;
- papeis `admin`, `engenharia` e `consulta`;
- autorizacao por permissao;
- auditoria persistente no schema `auditoria` quando houver Prisma e fallback demo em memoria quando o banco nao estiver disponivel.

## Abordagem escolhida

### Autenticacao

- Manter sessao stateless assinada com HMAC e cookie `HttpOnly`.
- Incluir papeis na sessao para decisao rapida de permissao.
- Aplicar politica basica de senha na criacao/hash:
  - minimo 8 caracteres.

### Autorizacao

- Definir matriz canonica de permissoes por papel:
  - `admin`: leitura e escrita total, importacao e recalculo.
  - `engenharia`: leitura/escrita de item e ficha, leitura de impacto/custo, recalculo.
  - `consulta`: somente leitura.
- Implementar tres camadas:
  1. `middleware` para bloquear acesso nao autenticado e rotas sem permissao.
  2. guardas server-side para paginas sensiveis e server actions.
  3. pagina `403` simples para acesso negado autenticado.

### Auditoria

- Criar servico unico de auditoria.
- Registrar eventos de:
  - `item.created`
  - `item.updated`
  - `ficha.created`
  - `ficha.updated`
  - `ficha.duplicated`
  - `ficha.inactivated`
  - `import.executed`
  - `cost.recalculated`
- Persistir `antes_json` e `depois_json` quando houver snapshot disponivel.
- Em fallback demo, anexar os mesmos campos ao store em memoria para manter a UX e os testes.

## Mapeamento de rota e permissao

- `/dashboard`: `item.read`
- `/itens`: `item.read`
- `/itens/novo`: `item.write`
- `/itens/[itemId]`: `item.write`
- `/fichas`: `ficha.read`
- `/fichas/nova`: `ficha.write`
- `/fichas/[fichaId]`: `ficha.write`
- `/montagem`: `ficha.read`
- `/composicao`: `impact.read`
- `/custos`: `impact.read`
- `/importacao/pendencias`: `import.run`
- `/auditoria`: `item.read`

## Regras de acao

- Salvar item exige `item.write`.
- Salvar ficha exige `ficha.write`.
- Duplicar ficha exige `ficha.write`.
- Inativar ficha exige `ficha.write`.
- Logout exige apenas sessao valida.
- Importacao e recalculo terao guardas prontas mesmo sem fluxo completo de UI nesta etapa.

## Estrutura tecnica

- `src/modules/access/domain/access-control.ts`: politica de papeis, permissoes e rotas.
- `src/modules/access/server/authorization.ts`: helpers `requirePermission`, `requireRoutePermission`, `getCurrentActor`.
- `middleware.ts`: protecao de rota.
- `src/modules/audit/server/audit-service.ts`: gravacao e consulta de auditoria.
- Integracao nas actions e repositórios existentes.

## Testes

- Unitarios para:
  - politica de senha;
  - matriz de permissao;
  - decisao de rota;
  - servico de auditoria com before/after;
  - bloqueio de acao sem permissao.
- E2E para:
  - redirecionamento de nao autenticado;
  - login de usuario `consulta` sem acesso a rotas de escrita.

## Critérios de sucesso

- usuarios `admin`, `engenharia` e `consulta` autenticam com sessao valida;
- rotas de escrita ficam inacessiveis para `consulta`;
- server actions rejeitam usuario sem permissao mesmo com chamada direta;
- auditoria grava antes/depois em JSON quando aplicavel;
- logout continua operacional;
- testes de permissao passam.
