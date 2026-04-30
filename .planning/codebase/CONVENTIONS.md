# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- React component files use PascalCase when the file primarily exports a component, for example `AppShell.tsx`, `PageHeader.tsx`, `ResolverDialog.tsx`.
- Non-component modules use lowercase hyphenated names such as `catalog-repository.ts`, `item-form-schema.ts`, `cost-engine-service.ts`.
- Tests use `*.test.ts` and `*.test.tsx`.

**Functions and values:**
- Functions and variables use `camelCase`.
- Constants use `UPPER_SNAKE_CASE` when they are true constants, for example `SESSION_COOKIE_NAME`, `KEY_LENGTH`, `IMPORT_QUEUE_LOCK_SQL`.
- Async functions are not specially prefixed; names describe the use case (`getImportExecution`, `saveFichaAction`, `recalculateCascade`).

**Types:**
- Interfaces and type aliases use `PascalCase` without `I` prefixes.
- Prisma enums remain PascalCase enum names with lowercase value members from the schema.

## Code Style

**Formatting:**
- Prettier is configured in `prettier.config.mjs`.
- Double quotes, semicolons and `trailingComma: "none"` are enforced.
- Imports are formatted cleanly with multiline blocks for grouped members.

**Linting:**
- ESLint flat config lives in `eslint.config.mjs`.
- `@typescript-eslint/consistent-type-imports` is enforced.
- `src/generated/**` and build outputs are excluded from linting.

## Import Organization

**Order observed in source files:**
1. Framework or Node imports.
2. External package imports.
3. Internal `@/` imports.
4. Type-only imports when helpful, often mixed via `import type`.

**Path aliases:**
- `@/*` points to `src/*` from `tsconfig.json`.
- Most non-relative imports inside app code should use the alias instead of deep `../../`.

## Architectural Coding Patterns

**Boundary markers:**
- `"use client"` marks client components.
- `"use server"` marks server actions.
- `import "server-only";` marks modules that should never ship to the browser.

**Factory-style repositories:**
- Server repositories are exposed as `getXRepository()` functions that return plain methods instead of classes.
- Examples: `getCatalogRepository()`, `getEngineeringRepository()`, `getImportRepository()`.

**Validation first:**
- Form and env parsing are centralized in Zod schemas, then passed as typed payloads to repositories.
- Examples: `parseItemFormData()`, `parseFichaFormData()`, `parseServerEnv()`.

**Pure domain functions:**
- Domain modules favor deterministic inputs/outputs and avoid framework coupling.
- Examples: `buildDependencyClosure()`, `calculateItemCost()`, `getNextImportExecutionStatus()`.

## Error Handling

**Patterns:**
- Pure business rule violations throw explicit errors such as `DomainInvariantError`.
- Server actions generally translate validation errors into `{ status: "error", errors }` or redirects.
- Repository methods frequently swallow infrastructure exceptions and return `null`, allowing pages/actions to degrade gracefully.
- Import worker catches broad failures and persists a friendly execution summary before logging.

**Implication for new code:**
- Preserve domain exceptions for invariant violations.
- At integration boundaries, prefer returning typed failure states or redirects rather than leaking raw Prisma/Node errors into the UI.

## Logging

**Framework:**
- Pino is the intended structured logger in `src/modules/platform/server/logger.ts`.

**Observed practice:**
- Runtime scripts and some routes still use `console.error`, especially in worker/error paths.
- Logs are expected to go to stdout/stderr for Docker collection.

## Comments

**Usage pattern:**
- Comments are sparse and usually reserved for justification or fallback context.
- Example: repository comments explaining fallback to demo mode when the database is unavailable.
- There is no broad JSDoc/TSDoc culture in the current codebase.

## Function and Module Design

**Function shape:**
- Object parameters are common when inputs get wider than a few fields.
- Small local helpers are heavily used to keep page and repository methods readable.
- Early returns and guard clauses are preferred.

**Module shape:**
- Pages usually default-export a single async server component.
- UI modules export named components.
- Repositories and services are colocated by domain inside `src/modules/<feature>/server/`.

## Testing and Testability Conventions

**Design for testability:**
- Domain modules are kept pure enough for direct unit testing.
- Prisma integration tests use explicit database setup/cleanup.
- UI tests rely on accessible labels, text and role-based selectors.

*Conventions analysis: 2026-03-24*
*Update when lint, formatting or architectural patterns change materially*
