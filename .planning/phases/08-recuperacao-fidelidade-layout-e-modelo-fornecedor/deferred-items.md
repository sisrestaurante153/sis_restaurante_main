# Deferred Items (Phase 8)

Out-of-scope findings that should NOT be fixed within the current plan but tracked
for a later phase or maintenance window.

## Plan 08-01 (NaN/null guards)

### Stale `.next/types/app/dev-preview/ficha/page.ts`

**Discovered:** 2026-04-17 during `npm run typecheck` of plan 08-01
**Pre-existing:** Yes — verified by stashing 08-01 changes and re-running typecheck; error persisted.
**Scope:** Out of scope for 08-01 (not related to NaN/null guards or SESSION_SECRET).

**Error:**

```
.next/types/app/dev-preview/ficha/page.ts(2,24): error TS2307: Cannot find module '../../../../../src/app/dev-preview/ficha/page.js' or its corresponding type declarations.
.next/types/app/dev-preview/ficha/page.ts(5,29): error TS2307: Cannot find module '../../../../../src/app/dev-preview/ficha/page.js' or its corresponding type declarations.
```

**Root cause:** Stale Next.js generated type-definitions referencing `src/app/dev-preview/ficha/page.js`, but the `src/app/dev-preview/` directory no longer exists in the repository. The stale `.next/types` artifact was likely committed in an earlier iteration.

**Suggested fix (future work):** Clear `.next/types` cache (`rm -rf .next/types`) and either
regenerate via `npm run build`, or add `.next/types` to `.gitignore` if it is being
tracked accidentally.

**Why deferred:** Fix requires touching Next.js build artifacts unrelated to plan 08-01
surface (TotaisIndicadores, env.ts, components-editor.tsx). Following the SCOPE BOUNDARY
rule: "Only auto-fix issues DIRECTLY caused by the current task's changes."

## Plan 08-06 (grades-ajustes)

### E2E `engineering-flow` stale `getByLabel("Codigo do item")`

**Discovered:** 2026-04-17 during `npm run test:e2e -- engineering-flow` of plan 08-06
**Pre-existing:** Yes — caused by commit `368fca0` (plan 08-04 feat: refatora item-form para identificacao enxuta). Label renamed from "Codigo do item" to "Codigo" per SPEC-ITEM-LAYOUT pixel-perfect HTML; E2E was not updated in that plan.
**Scope:** Out of scope for 08-06 (not related to mapItemListRow "--" fallback or items-listing-view tolerance changes).

**Error:**

```
tests/e2e/engineering-flow.spec.ts:267 createItem()
Error: locator.fill: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByLabel('Codigo do item')
```

**Root cause:** `item-form.tsx` line 130 renders `label="Codigo"` (pos-08-04) but `tests/e2e/engineering-flow.spec.ts:267` still calls `page.getByLabel("Codigo do item")`. 4 E2E tests fail in cascade because `createItem()` helper is a precondition.

**Verification that plan 08-06 is unrelated:** Plan 08-06 only touches
`src/modules/catalog/server/catalog-prisma-mappers.ts` (no changes actually needed — already at spec post-08-02) and `src/modules/catalog/ui/items-listing-view.tsx` (formatCurrency/formatDecimal + supplierName passthrough for "--"). Unit suite 159/159 GREEN.

**Suggested fix (future work — owned by 08-07 verification plan):** Update
`tests/e2e/engineering-flow.spec.ts:267` and any other references from
`getByLabel("Codigo do item")` to `getByLabel("Codigo")`. Single-line fix;
regression in E2E harness only.

**Why deferred:** Fix belongs to 08-04 retroactively or to 08-07 (pixel-perfect
verification & release). 08-06 scope is strictly grade-fallback and does not
modify item-form.tsx.

**Resolved:** 2026-04-17 in plan 08-07 (commit `b66767d`). The `createItem()`
helper was updated for the full pos-08-04 item-form contract: `Codigo` label,
regex for `Descricao operacional` (now with `(opcional)` marker), removal of
`Fator de conversao` fill (now computed automatically), addition of
`purchaseUsageQuantity` fill (required on principal per D-08), and removed
direct `Unidade de compra` select (now disabled on primary, set via hidden
input). Typecheck clean after the update.
