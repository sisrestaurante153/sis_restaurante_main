# External Integrations

**Analysis Date:** 2026-03-24

## APIs and External Services

**Third-party SaaS APIs:**
- None found in application code. The system is currently self-contained and talks to infrastructure components rather than hosted business APIs.

**Legacy Excel ingestion:**
- Python parser launched from `scripts/import-worker.ts`.
  - Entry command: `python3 scripts/import_legacy_excel.py --workbook ... --output-dir ...`.
  - Parser implementation: `scripts/importers/legacy_excel/pipeline.py`.
  - Auth: none, local process execution only.
  - Output artifacts: `report.json`, `report.md`, `conflicts.json`, `load-result.json` under the import execution directory.

## Data Storage

**Primary database:**
- PostgreSQL 17 in `docker-compose.yml`.
  - Connection: `DATABASE_URL` / `DATABASE_URL_DOCKER`.
  - Client: Prisma 7 with `PrismaPg` adapter in `src/modules/platform/infra/prisma.ts`.
  - Migrations: `prisma/migrations/*`.
  - Generated client: `src/generated/prisma`.

**File storage:**
- Local filesystem storage for uploads and import artifacts.
  - Root resolution: `src/modules/import/server/import-storage.ts`.
  - Default location: `artifacts/runtime/imports`.
  - Upload persistence: `persistImportWorkbook()`.
  - Execution artifacts: `executions/<id>/report.json`, `conflicts.json`, `load-result.json`.

**Fallback state store:**
- Local JSON demo store in `artifacts/runtime/demo-store.json`.
  - Used by repositories like `src/modules/catalog/server/catalog-repository.ts`, `src/modules/engineering/server/engineering-repository.ts`, `src/modules/access/server/auth-repository.ts` and `src/modules/audit/server/audit-service.ts`.
  - This is a bootstrap contingency, not the target production data store.

## Authentication and Identity

**Auth provider:**
- Custom session-based auth implemented in-process.
  - Password verification: `src/modules/access/server/auth-service.ts`.
  - Session token signing: HMAC SHA-256 in `src/modules/access/server/session.ts`.
  - Session cookie management: `src/modules/access/server/session-cookie.ts`.
  - Login/logout HTTP routes: `src/app/api/auth/login/route.ts` and `src/app/api/auth/logout/route.ts`.
  - Route enforcement: `src/middleware.ts` plus `src/modules/access/domain/access-control.ts`.

**Roles and permissions:**
- Database-backed entities in Prisma schema: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`.
- Effective route policy is currently code-defined in `src/modules/access/domain/access-control.ts`.

## Monitoring and Observability

**Health checks:**
- App health endpoint: `src/app/api/health/route.ts`.
- Payload builder probes database reachability in `src/modules/platform/server/health/get-health-payload.ts`.
- Docker health checks exist for `db`, `app`, `import-worker` and `proxy` in `docker-compose.yml`.

**Logs:**
- Structured application logger via Pino in `src/modules/platform/server/logger.ts`.
- Import worker still emits failures to `console.error` in `scripts/import-worker.ts`.
- Container-level logs are expected to come from stdout/stderr and `docker compose logs`.

**Backups:**
- Scheduled backup sidecar `db-backup` in `docker-compose.yml`.
- Shell scripts: `scripts/ops/backup-db.sh`, `scripts/ops/backup-loop.sh`, `scripts/ops/restore-db.sh`.

## CI/CD and Deployment

**Hosting model:**
- Self-hosted Docker deployment, not Vercel.
- Reverse proxy: Nginx template at `docker/nginx/default.conf.template`.
- App container runs the Next standalone server produced by `npm run build`.

**Build and migration workflow:**
- `migrate` service runs `./scripts/ops/migrate-and-seed.sh`.
- `app` depends on successful migration completion.
- `import-worker` is a dedicated long-running process for background import execution.

**CI pipeline:**
- No repository CI workflow files were found under `.github/workflows/`.
- Verification appears to be manual/local through npm scripts and Playwright/Vitest commands.

## Environment Configuration

**Development:**
- Uses `.env` plus local Docker services.
- Core values parsed in `src/modules/platform/server/env.ts`.
- E2E and scripts also read `process.env.DATABASE_URL` directly when needed.

**Production:**
- Expects real `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` and writable import storage.
- Nginx and app containers rely on shared `.env`.

## Webhooks and Callbacks

**Incoming webhooks:**
- None found.

**Outgoing callbacks:**
- None found.

*Integration analysis: 2026-03-24*
*Update when new external services, storage providers or auth systems are introduced*
