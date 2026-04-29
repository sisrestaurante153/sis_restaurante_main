# Access And Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer sessao, autorizacao por papel/permissao e trilha de auditoria da primeira entrega web.

**Architecture:** A sessao assinada permanece stateless em cookie seguro, enquanto a autorizacao passa a usar uma politica canonica de permissao consumida por middleware e guardas server-side. A auditoria ganha servico unico com persistencia em Prisma e fallback demo em memoria para manter UX e testes mesmo sem banco.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zod, Prisma, PostgreSQL, Vitest, Playwright.

---

## Chunk 1: Politica de acesso

### Task 1: Regras de senha, papel e rota

**Files:**
- Modify: `src/modules/access/domain/access-control.ts`
- Modify: `src/modules/access/server/auth-service.ts`
- Create: `src/modules/access/server/authorization.ts`
- Test: `src/tests/unit/access-control.test.ts`
- Test: `src/tests/unit/password-policy.test.ts`

- [ ] Escrever testes vermelhos para matriz de permissao e politica basica de senha.
- [ ] Rodar os testes especificos e confirmar falha.
- [ ] Implementar permissoes canonicas, guardas e politica de senha.
- [ ] Rodar os testes da fatia ate verde.

## Chunk 2: Middleware e guardas

### Task 2: Protecao de rota e acao

**Files:**
- Create: `middleware.ts`
- Modify: `src/modules/access/server/session-cookie.ts`
- Modify: `src/modules/access/server/auth-actions.ts`
- Modify: `src/modules/catalog/server/catalog-actions.ts`
- Modify: `src/modules/engineering/server/engineering-actions.ts`
- Create: `src/app/forbidden.tsx`
- Test: `src/tests/unit/authorization-guards.test.ts`

- [ ] Escrever testes vermelhos para bloqueio de acao sem permissao.
- [ ] Rodar os testes especificos e confirmar falha.
- [ ] Implementar middleware, redirect de login e guardas nas actions.
- [ ] Rodar os testes da fatia ate verde.

## Chunk 3: Auditoria

### Task 3: Servico de auditoria e integracao

**Files:**
- Create: `src/modules/audit/server/audit-service.ts`
- Modify: `src/modules/audit/server/audit-repository.ts`
- Modify: `src/modules/platform/server/demo-data.ts`
- Modify: `src/modules/catalog/server/catalog-repository.ts`
- Modify: `src/modules/engineering/server/engineering-repository.ts`
- Test: `src/tests/unit/audit-service.test.ts`

- [ ] Escrever testes vermelhos para registro de auditoria com before/after.
- [ ] Rodar os testes especificos e confirmar falha.
- [ ] Implementar servico de auditoria e integrar nas mutacoes.
- [ ] Rodar os testes da fatia ate verde.

## Chunk 4: Seed, docs e e2e

### Task 4: Usuarios, papeis e validacao final

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `tests/e2e/bootstrap.spec.ts`

- [ ] Adicionar usuarios seed para `admin`, `engenharia` e `consulta`.
- [ ] Atualizar README com credenciais e regras de acesso.
- [ ] Ajustar e2e para rota negada de usuario consulta.
- [ ] Rodar `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e` e `npm run build`.
