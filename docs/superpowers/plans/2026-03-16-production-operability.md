# Production Operability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a entrega self-hosted da fase 1 com runtime Docker, proxy, backup, scripts operacionais e documentação de operação.

**Architecture:** O monólito Next.js continua como artefato principal. Um target `ops` no mesmo Dockerfile executa migrações e tarefas administrativas, enquanto Compose orquestra PostgreSQL, job de migração, app, proxy e backup sidecar.

**Tech Stack:** Next.js 15, React 19, TypeScript, PostgreSQL 17, Prisma 7, Nginx, Docker Compose, shell scripts POSIX e TSX.

---

## Chunk 1: Operação e runtime

### Task 1: Consolidar helpers operacionais

**Files:**

- Create: `src/modules/access/domain/user-management.ts`
- Create: `src/modules/import/domain/reconciliation.ts`
- Create: `src/modules/platform/domain/backup-policy.ts`
- Test: `src/tests/unit/user-management.test.ts`
- Test: `src/tests/unit/reconciliation.test.ts`
- Test: `src/tests/unit/backup-policy.test.ts`

- [x] Escrever os testes falhando para helpers de usuário, reconciliação e backup.
- [x] Rodar os testes para confirmar falha por módulos ausentes.
- [x] Implementar o mínimo para normalização e validação.
- [x] Rodar os testes novamente até ficarem verdes.

### Task 2: Fechar bootstrap self-hosted

**Files:**

- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `package.json`
- Create: `docker/nginx/default.conf.template`
- Create: `scripts/ops/migrate-and-seed.sh`
- Create: `scripts/ops/backup-db.sh`
- Create: `scripts/ops/backup-loop.sh`
- Create: `scripts/ops/restore-db.sh`

- [x] Criar target `ops` no Dockerfile.
- [x] Encaixar o job `migrate`, o `proxy` e o `db-backup` no Compose.
- [x] Publicar scripts operacionais via `package.json`.

## Chunk 2: Runbook operacional

### Task 3: Scripts de administração e reconciliação

**Files:**

- Create: `scripts/ops/create-user.ts`
- Create: `scripts/ops/recalculate-costs.ts`
- Create: `scripts/ops/reconcile-import-conflict.ts`
- Modify: `scripts/load-legacy-import.ts`
- Modify: `src/modules/import/ui/pending-conflicts-list.tsx`

- [x] Provisionar usuário por CLI com roles e auditoria.
- [x] Expor recalculo manual de custos por CLI.
- [x] Expor reconciliação manual de conflitos com criação de alias.
- [x] Mostrar `conflictId` na fila de pendências.

### Task 4: Documentar e validar

**Files:**

- Create: `docs/adr/002-self-hosted-runtime.md`
- Create: `docs/operations/architecture.md`
- Create: `docs/operations/runbook.md`
- Create: `docs/operations/deploy.md`
- Create: `docs/operations/rollback.md`
- Create: `docs/operations/troubleshooting.md`
- Modify: `README.md`

- [x] Escrever visão de arquitetura, operação local e produção.
- [x] Documentar importação, reconciliação, recalculo, usuários, backup e restore.
- [x] Documentar rollback e troubleshooting.
- [x] Validar com `typecheck`, `lint`, testes unitários, integração, build e Compose config quando disponível.
