# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- Vitest 3 is the main unit and integration runner, configured in `vitest.config.ts`.
- Playwright 1.55 drives end-to-end browser tests from `tests/e2e/`.
- Python `unittest` covers workbook parser behavior in `tests/python/`.

**Assertion and helpers:**
- Vitest built-in `expect`.
- `@testing-library/jest-dom` matchers are enabled in `src/tests/unit/setup.ts`.
- React component tests use Testing Library.

**Run commands:**
```bash
npm run test              # Full suite
npm run test:unit         # Vitest unit tests
npm run test:integration  # Vitest integration tests
npm run test:e2e          # Playwright browser flows
npm run test:python       # Python parser tests
```

## Test File Organization

**Locations:**
- `src/tests/unit/` holds page, UI, route and domain unit tests.
- `src/tests/integration/` holds Prisma-backed tests.
- `tests/e2e/` holds browser journeys.
- `tests/python/` holds parser-level Python tests.

**Naming:**
- Unit and integration files use `*.test.ts` or `*.test.tsx`.
- E2E files use descriptive scenario names like `engineering-flow.spec.ts`.

**Structure:**
```text
src/tests/unit/...
src/tests/integration/...
tests/e2e/...
tests/python/...
```

## Test Structure

**Observed suite style:**
- `describe()` groups by module or page.
- `it()` names are behavior-focused and in plain language.
- Many tests use explicit arrange/act/assert sequencing without comments.
- Repository tests commonly reset shared demo state in `beforeEach()`.

**Integration gating:**
- Prisma integration tests compute availability once and use `describe.skipIf(!runIntegration)`.
- Availability and client lifecycle are centralized in `src/tests/integration/helpers/prisma-test-env.ts`.

## Mocking

**Framework:**
- Vitest `vi` APIs are the standard mocking tool.

**Patterns:**
- `vi.mock("server-only", () => ({}))` is installed globally in `src/tests/unit/setup.ts`.
- Browser APIs like `window.matchMedia` are shimmed in setup.
- Unit tests typically mock module boundaries rather than pure functions.

**What gets mocked:**
- Browser-only APIs in jsdom.
- App Router helpers and server-only markers when testing pages/components.
- External state boundaries when unit-testing UI or route composition.

**What is tested for real:**
- Pure domain logic such as unit conversion, composition closure and cost calculation.
- Prisma persistence in integration suites when `DATABASE_URL` is available.
- Full browser flows for login, import and ficha management via Playwright.

## Database and Environment Patterns

**Integration tests:**
- Use a real PostgreSQL connection through Prisma.
- Clean up inserted rows explicitly in each test rather than relying on full DB resets.
- Common fixture naming prefixes make cleanup queries easier, for example `integracao-engenharia-`.

**E2E tests:**
- Launch the app with `PORT=3100 npm run dev` from `playwright.config.ts`.
- Interact through accessibility-driven selectors (`getByRole`, `getByLabel`, `getByText`).
- Some specs seed data directly with `pg` or by editing `artifacts/runtime/demo-store.json`.

## Coverage Shape

**Well-covered areas:**
- Auth primitives and routes.
- Core engineering domain logic.
- Main catalog and import screens.
- Base shell/navigation and page composition.

**Coverage gaps visible from structure:**
- No dedicated performance or load tests.
- No contract tests for import artifacts or CLI scripts.
- No CI-enforced coverage report configuration was found.

## How to Add New Tests

**New domain rule:**
- Add a unit test under `src/tests/unit/` near the relevant module theme, for example `cost-engine.test.ts`.

**New Prisma-backed behavior:**
- Add an integration test under `src/tests/integration/` and reuse `prisma-test-env.ts`.

**New user flow:**
- Add or extend a Playwright spec in `tests/e2e/`.
- Prefer accessible selectors and deterministic data setup.

**New parser behavior:**
- Add a Python test under `tests/python/` against the importer pipeline.

*Testing analysis: 2026-03-24*
*Update when frameworks, commands or test placement rules change*
