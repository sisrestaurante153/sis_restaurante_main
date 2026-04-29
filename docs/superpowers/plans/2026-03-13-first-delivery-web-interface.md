# First Delivery Web Interface Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira interface web operacional do sistema com login, shell autenticado, telas mínimas, dados coerentes e testes.

**Architecture:** A implementação usará App Router server-first com autenticação por cookie assinado, shell autenticado e módulos internos para acesso, catálogo, engenharia e importação. Os dados serão carregados por repositórios que preferem Prisma e caem para um dataset demo consistente quando o banco não estiver disponível.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Tailwind CSS v4, shadcn/ui, Zod, Vitest, Playwright, Docker Compose.

---

## Chunk 1: Auth e shell

### Task 1: Sessão segura e layout autenticado

**Files:**
- Create: `src/modules/access/server/session.ts`
- Create: `src/modules/access/server/auth-actions.ts`
- Create: `src/modules/access/server/auth-repository.ts`
- Create: `src/modules/access/ui/login-form.tsx`
- Create: `src/modules/platform/ui/app-shell.tsx`
- Create: `src/modules/platform/ui/sidebar-nav.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(app)/layout.tsx`
- Modify: `src/modules/platform/server/env.ts`
- Test: `src/tests/unit/session.test.ts`
- Test: `src/tests/unit/auth-actions.test.ts`

- [ ] Escrever teste vermelho para assinatura, leitura e expiração de sessão.
- [ ] Rodar `npm run test:unit -- --run src/tests/unit/session.test.ts` e confirmar falha correta.
- [ ] Implementar utilitários mínimos de sessão.
- [ ] Escrever teste vermelho para login com credenciais válidas e inválidas.
- [ ] Rodar `npm run test:unit -- --run src/tests/unit/auth-actions.test.ts` e confirmar falha.
- [ ] Implementar login/logout e shell autenticado.
- [ ] Rodar os testes da fatia até verde.

## Chunk 2: Repositórios e dados

### Task 2: Dataset demo e consultas compartilhadas

**Files:**
- Create: `src/modules/platform/server/demo-data.ts`
- Create: `src/modules/catalog/server/catalog-repository.ts`
- Create: `src/modules/engineering/server/engineering-repository.ts`
- Create: `src/modules/import/server/import-repository.ts`
- Create: `src/modules/audit/server/audit-repository.ts`
- Modify: `prisma/seed.ts`
- Test: `src/tests/unit/catalog-repository.test.ts`
- Test: `src/tests/unit/engineering-repository.test.ts`

- [ ] Escrever testes vermelhos para consulta de itens/fichas a partir do repositório com fallback demo.
- [ ] Rodar os testes específicos e validar falha.
- [ ] Implementar dataset demo coerente com todas as telas.
- [ ] Implementar repositórios com preferência por Prisma e fallback seguro.
- [ ] Expandir seed com usuário, itens, fichas, snapshots, pendências e auditoria.
- [ ] Rodar os testes da fatia até verde.

## Chunk 3: Telas principais

### Task 3: Dashboard, itens e fichas

**Files:**
- Create: `src/app/(app)/page.tsx`
- Create: `src/app/(app)/itens/page.tsx`
- Create: `src/app/(app)/itens/novo/page.tsx`
- Create: `src/app/(app)/itens/[itemId]/page.tsx`
- Create: `src/app/(app)/fichas/page.tsx`
- Create: `src/app/(app)/fichas/nova/page.tsx`
- Create: `src/app/(app)/fichas/[fichaId]/page.tsx`
- Create: `src/modules/catalog/ui/item-list.tsx`
- Create: `src/modules/catalog/ui/item-form.tsx`
- Create: `src/modules/engineering/ui/ficha-list.tsx`
- Create: `src/modules/engineering/ui/ficha-form.tsx`
- Create: `src/modules/engineering/ui/components-editor.tsx`
- Create: `src/modules/platform/ui/page-header.tsx`
- Create: `src/modules/platform/ui/filter-bar.tsx`
- Create: `src/modules/platform/ui/pagination-controls.tsx`
- Test: `src/tests/unit/item-form-schema.test.ts`
- Test: `src/tests/unit/ficha-form-schema.test.ts`

- [ ] Escrever testes vermelhos para schemas/parse de item e ficha.
- [ ] Rodar os testes e confirmar falha.
- [ ] Implementar view models, formulários, listas, filtros e paginação.
- [ ] Implementar editor dinâmico de componentes com serialização estável.
- [ ] Rodar os testes unitários da fatia até verde.

## Chunk 4: Visões operacionais restantes

### Task 4: Montagem, composição, custos, importação e auditoria

**Files:**
- Create: `src/app/(app)/montagem/page.tsx`
- Create: `src/app/(app)/composicao/page.tsx`
- Create: `src/app/(app)/custos/page.tsx`
- Create: `src/app/(app)/importacao/pendencias/page.tsx`
- Create: `src/app/(app)/auditoria/page.tsx`
- Create: `src/modules/engineering/ui/assembly-workbench.tsx`
- Create: `src/modules/engineering/ui/composition-tree.tsx`
- Create: `src/modules/engineering/ui/cost-summary.tsx`
- Create: `src/modules/import/ui/pending-conflicts-list.tsx`
- Create: `src/modules/audit/ui/audit-timeline.tsx`
- Test: `src/tests/unit/composition-view-model.test.ts`
- Test: `src/tests/unit/cost-summary.test.ts`

- [ ] Escrever testes vermelhos para view models de composição expandida e custo.
- [ ] Rodar os testes e confirmar falha.
- [ ] Implementar as páginas e componentes operacionais restantes.
- [ ] Rodar os testes da fatia até verde.

## Chunk 5: Design system, docs e validação

### Task 5: shadcn, estilos, documentação e e2e

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `tests/e2e/bootstrap.spec.ts`
- Create/Modify: `src/components/ui/*`

- [ ] Adicionar componentes shadcn necessários e revisar os arquivos gerados.
- [ ] Refinar tokens, tipografia, shell e responsividade.
- [ ] Atualizar README e variáveis de ambiente.
- [ ] Escrever testes e2e para login, dashboard, navegação e edição.
- [ ] Rodar `npm run lint`, `npm run typecheck`, `npm run test:unit` e `npm run test:e2e`.
- [ ] Se Docker estiver disponível, rodar `npm run db:up`, `npm run db:generate`, `npm run db:seed` e validar fluxo local com banco.
