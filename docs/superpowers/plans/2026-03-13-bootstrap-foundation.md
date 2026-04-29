# Bootstrap Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação técnica executável de um monólito modular Next.js 15 com PostgreSQL, Prisma, healthcheck, documentação e testes iniciais.

**Architecture:** A aplicação será um único deploy Next.js com módulos internos por domínio e por responsabilidade (`ui`, `server`, `domain`, `infra`). O banco PostgreSQL será acessado por Prisma, enquanto Docker Compose orquestra app e banco para self-hosting local.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui base config, Vitest, Playwright, Docker Compose.

---

## Chunk 1: Scaffold e documentação base

### Task 1: Estrutura inicial do workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `prettier.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `docs/adr/001-modular-monolith.md`

- [ ] Definir manifest raiz com scripts de `dev`, `build`, `start`, `lint`, `format`, `typecheck`, `test`, `db` e `prisma`.
- [ ] Configurar TypeScript, Next.js standalone, ESLint flat config e Prettier.
- [ ] Registrar bootstrap, variáveis de ambiente e ADR 001.

## Chunk 2: Testes vermelhos e implementação mínima

### Task 2: Healthcheck e bootstrap mínimo

**Files:**
- Create: `src/tests/unit/health-route.test.ts`
- Create: `src/tests/unit/env.test.ts`
- Create: `src/app/api/health/route.ts`
- Create: `src/app/page.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/modules/platform/server/health/get-health-payload.ts`
- Create: `src/modules/platform/server/env.ts`
- Create: `src/modules/platform/server/logger.ts`

- [ ] Escrever testes unitários para contrato de healthcheck e leitura de ambiente.
- [ ] Rodar Vitest e confirmar falha por ausência de implementação.
- [ ] Implementar o mínimo para resposta de healthcheck, logger e env parser.
- [ ] Rodar Vitest novamente até ficar verde.

## Chunk 3: Banco, Docker e smoke e2e

### Task 3: Infra relacional e automação

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `playwright.config.ts`
- Create: `tests/e2e/bootstrap.spec.ts`

- [ ] Modelar schema Prisma inicial com as entidades mandatórias.
- [ ] Preparar Dockerfile multi-stage e Compose para app + PostgreSQL.
- [ ] Configurar Playwright para smoke do bootstrap.
- [ ] Instalar dependências e executar `lint`, `typecheck`, `test:unit`; executar e2e se o ambiente suportar browser.
