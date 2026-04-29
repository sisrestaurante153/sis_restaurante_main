# SIS Restaurante

Sistema web de engenharia de produtos para restaurante. Esta base substitui o Excel como fonte operacional por um monolito modular web com dominio canonico, persistencia relacional em PostgreSQL e uma primeira entrega funcional aderente ao escopo do cliente.

## Stack

- Next.js 15 + React 19 + TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS + base `shadcn/ui`
- Vitest + Playwright
- Docker Compose

## Estrutura

```text
.
├── docs/
│   ├── adr/
│   └── superpowers/
├── prisma/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── modules/
│   │   └── platform/
│   │       ├── domain/
│   │       ├── infra/
│   │       ├── server/
│   │       └── ui/
│   └── tests/
├── tests/
│   └── e2e/
├── Dockerfile
└── docker-compose.yml
```

## Status do escopo

Em 2026-03-16, o projeto foi revisado contra o PDF `escopo_desenvolvimento_sistema_restaurante.pdf` e validado com:

- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:python`
- `npm run test:e2e`

Veredito atual: a primeira entrega funcional esta implementada e executavel localmente com PostgreSQL, autenticacao, composicao recursiva, custo/rendimento, montagem final, reconciliacao de importacao e deploy self-hosted. O fallback em arquivo permanece apenas como contingencia de bootstrap quando o banco nao estiver acessivel.

## Entrega atual

- Login com sessao segura em cookie HttpOnly e autorizacao por papeis/permissoes.
- Shell autenticado com dashboard, itens, fichas, montagem, composicao, custos, pendencias e auditoria.
- CRUD operacional de itens com fornecedor, compra, unidade, fator de conversao, custo unitario base e data de atualizacao de preco.
- CRUD de fichas tecnicas com duplicacao, inativacao, perdas por percentual ou peso final, custo direto/herdado e composicao expandida.
- Montagem de prato, porcao, marmita e combo pela mesma ficha canonica, incluindo embalagem e itens de apoio.
- Recalculo em cascata persistido no banco quando custo de insumo ou ficha ativa muda.
- Importacao legada com parser Python `openpyxl`, staging relacional, conflitos persistidos e reconciliacao manual via UI.
- Runtime self-hosted com Docker Compose, Nginx, healthchecks, backup e restore.
- Fallback degradado em arquivo local apenas para bootstrap sem PostgreSQL acessivel.

## Convencoes desta fundacao

- Um único deploy web; modularidade por domínio e responsabilidade.
- `src/modules/<modulo>/ui`: componentes e composição visual.
- `src/modules/<modulo>/server`: casos de uso, handlers e serviços server-side.
- `src/modules/<modulo>/domain`: tipos, regras e contratos.
- `src/modules/<modulo>/infra`: adapters, Prisma, integrações e detalhes técnicos.
- `src/tests/unit`: testes unitários do código de aplicação.
- `tests/e2e`: smoke tests Playwright.

## Bootstrap local

1. Copie `.env.example` para `.env`.
2. Instale as dependências:

```bash
npm install
```

3. Se quiser trabalhar com PostgreSQL local:

```bash
npm run db:up
RUN_DB_SEED=true npm run ops:migrate-and-seed
```

4. Suba a aplicacao:

```bash
npm run dev
```

5. Acesse:

- Login: `http://localhost:3000/login`
- App: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/api/health`

Credenciais bootstrap:

- email: `admin@sis-restaurante.local`
- senha: `admin123`
- email: `engenharia@sis-restaurante.local`
- senha: `engenharia123`
- email: `consulta@sis-restaurante.local`
- senha: `consulta123`

## Produção base

```bash
cp .env.production.example .env
docker compose up -d --build
```

Para homologacao com massa bootstrap:

```bash
docker compose run --rm -e RUN_DB_SEED=true migrate
docker compose up -d app proxy db-backup
```

O arquivo `docker-compose.yml` inclui `db`, `migrate`, `app`, `proxy` e `db-backup`.

## Scripts úteis

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run format`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:python`
- `npm run test:e2e`
- `npm test`
- `npm run db:up`
- `npm run db:down`
- `npm run db:logs`
- `npm run ops:migrate-and-seed`
- `npm run ops:create-user`
- `npm run ops:recalculate-costs`
- `npm run ops:reconcile-conflict`
- `npm run ops:backup`
- `npm run ops:restore`
- `./scripts/reset-local-env.sh`
- `npm run import:legacy:parse`
- `npm run import:legacy:load`

Os mesmos scripts funcionam com `pnpm` se ele estiver instalado no ambiente.

## Documentação de arquitetura

- ADR: `docs/adr/001-modular-monolith.md`
- ADR: `docs/adr/002-self-hosted-runtime.md`
- ER e invariantes: `docs/domain/er-model.md`
- Importação legada: `docs/import/legacy-import.md`
- Arquitetura operacional: `docs/operations/architecture.md`
- Runbook operacional: `docs/operations/runbook.md`
- Deploy de produção: `docs/operations/deploy.md`
- Rollback: `docs/operations/rollback.md`
- Troubleshooting: `docs/operations/troubleshooting.md`
- Spec de bootstrap: `docs/superpowers/specs/2026-03-13-bootstrap-design.md`
- Spec da primeira entrega web: `docs/superpowers/specs/2026-03-13-first-delivery-web-interface-design.md`
- Spec de persistencia real: `docs/superpowers/specs/2026-03-13-persistence-completion-design.md`
- Plano de execução: `docs/superpowers/plans/2026-03-13-bootstrap-foundation.md`
- Plano da interface web: `docs/superpowers/plans/2026-03-13-first-delivery-web-interface.md`
- Plano de persistencia real: `docs/superpowers/plans/2026-03-13-persistence-completion.md`
- Plano de operabilidade: `docs/superpowers/plans/2026-03-16-production-operability.md`
- Checklist de homologacao: `docs/qa/homologation-checklist.md`
- Cobertura e riscos: `docs/qa/coverage-and-risks.md`
- Escopo vs estado atual: `docs/qa/escopo-vs-estado-atual.md`
# sis_restaurante_main
