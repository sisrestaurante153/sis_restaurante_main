---
phase: 08
plan: 06
plan_id: 08-06
description: Ajustes finos nas grades — grade de itens com dados derivados do principal + badge +N + fallback "--" para itens sem compra; grade de fichas re-validada contra HTML (D-10)
type: execute
wave: 4
depends_on:
  - 08-02
  - 08-03
  - 08-04
files_modified:
  - src/modules/catalog/ui/items-listing-view.tsx
  - src/modules/catalog/server/catalog-prisma-mappers.ts
  - src/tests/unit/items-listing.test.tsx
autonomous: true
requirements: []
tags:
  - catalog
  - grid
  - pixel-perfect
must_haves:
  truths:
    - "Grade de itens exibe Unidade de compra, Preco de compra, Preco de uso, Fornecedor derivados do ItemCompra principal."
    - "Item sem principal (sem compra cadastrada) exibe '--' nas colunas derivadas (purchaseQuantity, baseUnitCost, usagePrice, usageUnit, conversionFactor, supplierName)."
    - "Badge '+N' aparece ao lado do nome do fornecedor quando item tem mais de 1 ItemCompra (preservado de pendencias-v3/07-03)."
    - "Ordenacao client-side por preco continua funcional (Phase 7 D-07)."
  artifacts:
    - path: "src/modules/catalog/server/catalog-prisma-mappers.ts"
      provides: "mapItemListRow retornando '--' para itens sem preferredPurchase"
      contains: "\"--\""
    - path: "src/modules/catalog/ui/items-listing-view.tsx"
      provides: "Render que tolera valores '--' nas colunas derivadas + badge +N"
      contains: "supplierCount"
    - path: "src/tests/unit/items-listing.test.tsx"
      provides: "Cobertura estendida: item sem principal exibe '--', item com 2+ fornecedores exibe +1"
      min_lines: 40
  key_links:
    - from: "catalog-prisma-mappers.ts mapItemListRow"
      to: "resolvePreferredPurchase"
      via: "item.compras.find(c => c.principal)"
      pattern: "principal"
    - from: "items-listing-view.tsx coluna Fornecedor"
      to: "supplierCount > 1 ? badge '+N'"
      via: "renderCell"
      pattern: "\\+\\$\\{"
---

<objective>
Ajustes finos nas grades (D-10). Itens: garantir que `mapItemListRow` devolve `"--"` para todas
as colunas derivadas quando o item nao tem `ItemCompra` com `principal=true`; confirmar que
render tolera strings. Grade de fichas: re-validar contra HTML `update/tela-fichas-grade-v1.html`
(nenhuma mudanca funcional esperada — pendencias-v3 ja entregou).

Purpose: cumprir SPEC-4-TELAS-ESTRITO parcialmente (grade de itens e fichas). Fechar gap
reportado em 08-RESEARCH.md §8.1 ("quando preferredPurchase === null, retornar strings `--`").

Output: ajuste pontual em `mapItemListRow` + test unit cobrindo cenario "item sem fornecedor" +
cenario "item com 2+ fornecedores" (badge +N).

**Supports SPEC-ITEM-FORNECEDOR** grid derivation (mapItemListRow fallback when no principal purchase exists); pixel-perfect verification owned by 08-07.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-02-schema-migracao-import-SUMMARY.md
@src/modules/catalog/server/catalog-prisma-mappers.ts
@src/modules/catalog/ui/items-listing-view.tsx
@src/tests/unit/items-listing.test.tsx
@update/tela-itens-grade-v2.html
@update/tela-fichas-grade-v1.html

<interfaces>
<!-- De 08-RESEARCH.md §8.1 + 08-PATTERNS.md §8. -->

Pattern mapItemListRow atual (catalog-prisma-mappers.ts 132-163):
```ts
function mapItemListRow(item: CatalogItemRecord) {
  const preferredPurchase = resolvePreferredPurchase(item);
  const supplierCount = new Set(item.compras.map(c => c.fornecedor?.nome).filter(Boolean)).size;

  return {
    id: item.id,
    code: item.codigo,
    name: item.nome,
    // ...
    purchaseQuantity: preferredPurchase?.quantidadePorEmbalagem.toFixed(4) ?? "0.0000",  // MUDAR para "--"
    baseUnitCost: preferredPurchase?.custoUnitarioBase.toFixed(6) ?? "0.000000",         // MUDAR para "--"
    usagePrice: /* derived */,                                                           // MUDAR para "--" quando null
    usageUnit: preferredPurchase?.unidadeCompra.codigo ?? "-",                           // MUDAR para "--"
    supplierName: preferredPurchase?.fornecedor.nome ?? "sem fornecedor",                // MUDAR para "--"
    supplierCount,
    // ...
  };
}
```

Render (items-listing-view.tsx):
- Coluna Fornecedor: `{supplierName}{supplierCount > 1 ? ` +${supplierCount - 1}` : ""}` (ja entregue)
- Colunas numericas usam `DataGridNumericCell` ou equivalente — precisa tolerar string "--"
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0 RED + GREEN consecutivo): Cobrir item sem principal + item com +N em items-listing.test.tsx</name>
  <files>src/tests/unit/items-listing.test.tsx</files>
  <read_first>
    - src/tests/unit/items-listing.test.tsx (integral — entender setup existente)
    - src/modules/catalog/ui/items-listing-view.tsx (integral — entender renderCell de Fornecedor e colunas numericas)
    - src/modules/catalog/server/catalog-prisma-mappers.ts (linhas 132-163)
  </read_first>
  <action>
Estender `src/tests/unit/items-listing.test.tsx` adicionando dois novos `it(...)` blocks
no describe existente (nao criar novo describe se ja existe um geral):

```ts
it('item sem ItemCompra exibe "--" nas colunas derivadas', async () => {
  const rows = [{
    id: "x1",
    code: "X1",
    name: "Item sem fornecedor",
    type: "insumo",
    operationalCategory: "Graos",
    active: true,
    purchaseQuantity: "--",
    baseUnitCost: "--",
    usagePrice: "--",
    usageUnit: "--",
    conversionFactor: "--",
    supplierName: "--",
    supplierCount: 0,
    // outras props
  }];
  render(<ItemsListingView rows={rows} /* ... */ />);
  // Pelo menos 5 ocorrencias de "--" no grid para esse row:
  const cells = screen.getAllByText("--");
  expect(cells.length).toBeGreaterThanOrEqual(5);
});

it('item com 2+ fornecedores exibe badge "+1" ao lado do nome principal', async () => {
  const rows = [{
    id: "x2", code: "X2", name: "Item com 2 fornecedores", type: "insumo", operationalCategory: "Graos", active: true,
    purchaseQuantity: "10.0000", baseUnitCost: "8.000000", usagePrice: "8.0000", usageUnit: "kg", conversionFactor: "1.0000",
    supplierName: "VMARKET", supplierCount: 2,
  }];
  render(<ItemsListingView rows={rows} />);
  expect(screen.getByText(/VMARKET/)).toBeInTheDocument();
  expect(screen.getByText(/\+1/)).toBeInTheDocument();
});
```

NOTA: se `items-listing.test.tsx` atual nao tem um mock de `ItemsListingView` props shape,
copiar do existing test.
  </action>
  <verify>
    <automated>npm run test:unit -- items-listing 2>&1 | tee /tmp/t1-il.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'sem fornecedor\|sem ItemCompra' src/tests/unit/items-listing.test.tsx` >= 1
    - `grep -c '\\+1' src/tests/unit/items-listing.test.tsx` >= 1 (badge +N)
    - Novo `it(...)` bloco cobrindo "item sem ItemCompra exibe '--'"
    - Novo `it(...)` bloco cobrindo "badge +1"
  </acceptance_criteria>
  <done>Test estendido; pode estar RED ou GREEN dependendo do render atual — Task 2 garante GREEN.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN): Ajustar mapItemListRow para "--" quando sem principal + confirmar render tolera "--"</name>
  <files>src/modules/catalog/server/catalog-prisma-mappers.ts, src/modules/catalog/ui/items-listing-view.tsx</files>
  <read_first>
    - src/modules/catalog/server/catalog-prisma-mappers.ts linhas 132-163 (mapItemListRow + resolvePreferredPurchase 56-66)
    - src/modules/catalog/ui/items-listing-view.tsx (integral — entender DataGridNumericCell ou equivalent pattern)
    - src/tests/unit/items-listing.test.tsx (estendido na Task 1)
    - update/tela-itens-grade-v2.html (confirmar que campos vazios aparecem como "--")
  </read_first>
  <action>
**A) `catalog-prisma-mappers.ts` — `mapItemListRow`** (linhas 132-163):

Substituir fallbacks numericos por `"--"`:

```ts
function mapItemListRow(item: CatalogItemRecord) {
  const preferredPurchase = resolvePreferredPurchase(item);
  const supplierCount = new Set(item.compras.map((c) => c.fornecedor?.nome).filter(Boolean)).size;

  const hasPrimary = preferredPurchase !== null && preferredPurchase !== undefined;

  // Derivar fator e usagePrice quando possivel; "--" quando nao
  let conversionFactor = "--";
  let usagePrice = "--";
  let usageUnit = "--";
  let usageQuantity = "--";
  if (hasPrimary) {
    const qc = Number(preferredPurchase!.quantidadePorEmbalagem);
    const qu = Number(preferredPurchase!.quantidadeUso ?? 1);
    const fator = qu > 0 ? qc / qu : null;
    conversionFactor = fator !== null ? fator.toFixed(4) : "--";
    usagePrice = fator !== null && fator > 0 ? (Number(preferredPurchase!.custoCompra) / fator).toFixed(4) : "--";
    usageUnit = preferredPurchase!.unidadeUso?.codigo ?? preferredPurchase!.unidadeCompra.codigo ?? "--";
    usageQuantity = preferredPurchase!.quantidadeUso?.toFixed(4) ?? "1.0000";
  }

  return {
    id: item.id,
    code: item.codigo,
    name: item.nome,
    // ... campos nao-derivados preservados
    purchaseUnit: preferredPurchase?.unidadeCompra.codigo ?? "--",
    purchaseQuantity: preferredPurchase?.quantidadePorEmbalagem.toFixed(4) ?? "--",
    purchaseCost: preferredPurchase?.custoCompra.toFixed(4) ?? "--",
    baseUnitCost: preferredPurchase?.custoUnitarioBase.toFixed(6) ?? "--",
    usageUnit,
    usageQuantity,
    conversionFactor,
    usagePrice,
    supplierName: preferredPurchase?.fornecedor.nome ?? "--",
    supplierCount,
    // ...
  };
}
```

**B) `items-listing-view.tsx` — confirmar tolerancia a `"--"`**:

Localizar colunas derivadas (purchaseQuantity, baseUnitCost, usagePrice) — se usam `DataGridNumericCell`
que formata como moeda ou Number, adicionar guard: se valor === "--", renderizar literal "--"
sem formatacao. Exemplo:

```tsx
renderCell: (params) => params.value === "--" ? "--" : formatCurrency(params.value)
```

Confirmar que `sortComparator` client-side trata "--" como menor valor (para nao quebrar sort por
preco): `(a, b) => (a === "--" ? -1 : b === "--" ? 1 : Number(a) - Number(b))`.

**C) Grade de fichas — escopo transferido para 08-07 (B-03 option-A):**
A re-validacao pixel-perfect da grade de fichas (update/tela-fichas-grade-v1.html) foi MOVIDA integralmente para o VERIFICATION.md do Plan 08-07. Este plano NAO valida fichas-grade. SPEC-4-TELAS-ESTRITO e owned exclusivamente pelo 08-07.

**D) Rodar specs**:
```
npm run typecheck
npm run test:unit -- items-listing
npm run test:e2e -- engineering-flow
```
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:unit -- items-listing && npm run test:e2e -- engineering-flow</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '"--"' src/modules/catalog/server/catalog-prisma-mappers.ts` >= 5 (fallbacks aplicados)
    - `grep -c '"0.0000"\|"0.000000"\|"sem fornecedor"' src/modules/catalog/server/catalog-prisma-mappers.ts` returns 0 (fallbacks antigos removidos)
    - `npm run test:unit -- items-listing` exits 0 (2 novos testes GREEN + existentes)
    - `npm run typecheck` exits 0
    - `npm run test:e2e -- engineering-flow` exits 0 (zero regressao)
  </acceptance_criteria>
  <done>mapItemListRow retorna "--" para items sem principal; grade de fichas re-validada contra HTML; tests GREEN.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | Plano puramente de mapping + render tolerancia |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-06-01 | N/A | Pure UI readonly refactor; sem mudanca em query (continua usando mesmo repositorio autorizado) | accept | Plano nao abre nova superficie de ataque; reusa resolvePreferredPurchase existente. ASVS L1 mapping: V1.1 (secure architecture) — reuso de authz herdado; V13.2 (RESTful) — nao aplicavel (server action via Next action pipeline com middleware de sessao). |
</threat_model>

<verification>
- `npm run typecheck` exits 0
- `npm run test:unit -- items-listing` exits 0
- `npm run test:e2e -- engineering-flow` exits 0
- Smoke: criar item sem fornecedor e verificar que grade exibe "--" em 5+ colunas; criar item com 2 fornecedores e verificar badge "+1"
- Grade de fichas re-validada contra HTML (status documentado)
</verification>

<success_criteria>
1. mapItemListRow retorna "--" em todas as colunas derivadas quando preferredPurchase ausente.
2. items-listing-view.tsx render tolera "--" (nao tenta formatar como numero).
3. Sort client-side por preco trata "--" como valor menor (nao quebra).
4. Badge "+N" continua funcionando (pendencias-v3 preservado).
5. Grade de fichas pixel-perfect re-validation e ownership de SPEC-4-TELAS-ESTRITO transferidos para 08-07 (B-03 option-A — 08-06 nao mais valida fichas-grade).
6. Zero regressao em engineering-flow.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-06-grades-ajustes-SUMMARY.md`
</output>
</content>
</invoke>