# Phase 8: Recuperacao fidelidade layout e modelo fornecedor — Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 22 (13 source modificados + 9 novos incluindo testes)
**Analogs found:** 21/22 (um novo sem analogo direto: banner PDFV2-FICHA-07)
**Linguagem:** pt-BR

---

## File Classification

| Arquivo novo/modificado | Role | Data Flow | Analog mais proximo | Match |
|-------------------------|------|-----------|---------------------|-------|
| `prisma/schema.prisma` §ItemCompra / §UnidadeMedida | model | schema | proprio (extensao, nao rewrite) | exact |
| `prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql` | migration | schema+backfill | `prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql` + `202604022030_phase7_docker_alignment/migration.sql` | exact |
| `src/modules/catalog/server/catalog-prisma-mappers.ts` (modificar) | presenter | transform (read) | proprio (estender `mapPurchases` lines 100-113 + `resolveUsageMetrics` 82-98) | exact |
| `src/modules/catalog/server/catalog-repository.ts` (modificar) | repository | CRUD tx | proprio `saveItemWithPrisma` 469-614 + `queryItem` 253-298 | exact |
| `src/modules/catalog/server/catalog-actions.ts` (leve) | server action | request-response | proprio `saveItemAction` 32-77 | exact |
| `src/modules/catalog/server/item-form-schema.ts` (modificar) | zod schema | validate | proprio 1-101 (estender `purchaseSchema` + `superRefine`) | exact |
| `src/modules/catalog/ui/item-form.tsx` (modificar) | component | form state | proprio 1-337 (remover FormSection 245-324, manter Identificacao 150-243) | exact |
| `src/modules/catalog/ui/purchases-editor.tsx` (estender) | component | form state | proprio 1-402 (preservar estrutura, adicionar campos) | exact |
| `src/modules/catalog/ui/items-listing-view.tsx` (modificar) | component | CRUD read+filter | proprio 1-80+ (ajuste em mapping de `mapItemListRow`) | exact |
| `src/modules/engineering/ui/TotaisIndicadores.tsx` (modificar) | component | derived-read | proprio 1-320 (estender formatters) | exact |
| `src/modules/engineering/ui/components-editor.tsx` (estender) | component | form state | proprio 1-60+ (hook para banner FICHA-07) | exact |
| `src/modules/engineering/ui/FichaFlatGrid.tsx` (re-validar) | component | form state | proprio 1-40+ (confirmar GRID_TEMPLATE) | exact |
| `src/modules/engineering/ui/ficha-form.tsx` (leve) | component | form state | proprio | exact |
| `src/modules/engineering/server/ficha-similar-lookup.ts` (NOVO) | server action | request-response | `src/modules/catalog/server/catalog-repository.ts` `queryItem` + `engineering-repository.ts` | role-match |
| `src/modules/engineering/ui/SimilarFichasBanner.tsx` (NOVO, nome a criterio) | component | read-only banner | nenhum identico (novo padrao); base MUI `Alert` + `Link` | no-analog |
| `src/modules/import/server/import-actions.ts` (modificar) | server action | file-I/O → CRUD | proprio `createOperationalItemImportAction` 65-140 | exact |
| `scripts/ops/pack-release.sh` (NOVO) | script | batch | `scripts/ops/backup-db.sh` + `migrate-and-seed.sh` | role-match |
| `docs/qa/2026-04-17-recuperacao-cliente.md` (NOVO) | docs | — | `docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md` + `homologation-checklist.md` | role-match |
| `src/tests/unit/engineering/TotaisIndicadores.test.tsx` (NOVO) | test unit | assert | `src/tests/unit/components-editor.test.tsx` | role-match |
| `src/tests/unit/catalog/ItemForm.test.tsx` (NOVO) | test unit | assert | `src/tests/unit/item-form.test.tsx` (ja existe como arquivo; revalidar) + `item-form-schema.test.ts` | exact |
| `src/tests/unit/catalog/purchases-editor.test.tsx` (NOVO) | test unit | assert | `src/tests/unit/item-form.test.tsx` | role-match |
| `src/tests/integration/catalog-fornecedor.test.ts` (NOVO) | test integration | DB round-trip | `src/tests/integration/catalog-prisma.test.ts` | exact |
| `src/tests/integration/prisma-migration-idempotence.test.ts` (NOVO) | test integration | DB schema | nenhum 1:1; base `catalog-prisma.test.ts` scaffold + `information_schema` query | partial |
| `tests/e2e/engineering-flow.spec.ts` (estender) | test e2e | UI flow | proprio 1-60+ | exact |
| `tests/e2e/importacao.spec.ts` (estender) | test e2e | UI flow | proprio | exact |
| `src/tests/unit/env.test.ts` (confirmar/estender) | test unit | env throw | proprio ja existe | exact |

---

## Pattern Assignments

### 1. `prisma/schema.prisma` §ItemCompra — extensao de model

**Analog:** proprio (lines 210-230). Manter padrao de mapping existente.

**Padrao atual (linhas 210-230):**
```prisma
model ItemCompra {
  id                     String        @id @default(cuid())
  itemId                 String        @map("item_id")
  fornecedorId           String        @map("fornecedor_id")
  unidadeCompraId        String        @map("unidade_compra_id")
  principal              Boolean       @default(false)
  quantidadePorEmbalagem Decimal       @db.Decimal(18, 4) @map("quantidade_por_embalagem")
  custoCompra            Decimal       @db.Decimal(18, 4) @map("custo_compra")
  // ...
  unidadeCompra          UnidadeMedida @relation(fields: [unidadeCompraId], references: [id])

  @@unique([itemId, fornecedorId, unidadeCompraId])
  @@index([fornecedorId])
  @@map("item_compra")
}
```

**Padrao de relation com alias** (copiar de `UnidadeMedida` linhas 125-129 onde ja ha multiplas relacoes):
```prisma
itensComoUnidadeEstoque Item[] @relation("ItemUnidadeEstoque")
itensComoUnidadeUsoPadrao Item[] @relation("ItemUnidadeUsoPadrao")
```

**Copiar em Phase 8:** rename `itensCompra ItemCompra[]` (linha 125) para `itensCompraUnidadeCompra ItemCompra[] @relation("ItemCompraUnidadeCompra")` + adicionar `itensCompraUnidadeUso ItemCompra[] @relation("ItemCompraUnidadeUso")`. No `ItemCompra` usar `@relation("ItemCompraUnidadeCompra")` no existing `unidadeCompra` e adicionar `unidadeUso UnidadeMedida? @relation("ItemCompraUnidadeUso", fields: [unidadeUsoId], references: [id])`.

---

### 2. `prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql` — schema + backfill idempotente

**Analog primario:** `prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql` (linhas 1-22) + `202604022030_phase7_docker_alignment/migration.sql`.

**Idempotencia ADD COLUMN + INDEX + FK (copiar de phase7_ficha_schema_alignment 1-22):**
```sql
ALTER TABLE "ficha_tecnica"
ADD COLUMN IF NOT EXISTS "nome_exibicao" TEXT,
ADD COLUMN IF NOT EXISTS "unidade_rendimento_id" TEXT;

CREATE INDEX IF NOT EXISTS "ficha_tecnica_unidade_rendimento_id_idx" ON "ficha_tecnica"("unidade_rendimento_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ficha_tecnica_unidade_rendimento_id_fkey'
  ) THEN
    ALTER TABLE "ficha_tecnica"
    ADD CONSTRAINT "ficha_tecnica_unidade_rendimento_id_fkey"
    FOREIGN KEY ("unidade_rendimento_id") REFERENCES "unidade_medida"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
```

**Backfill com window function idempotente (copiar de phase7_docker_alignment lines 1-25):**
```sql
ALTER TABLE "item_compra"
ADD COLUMN IF NOT EXISTS "principal" BOOLEAN NOT NULL DEFAULT false;

WITH preferred_purchase AS (
  SELECT
    "id", "item_id",
    row_number() OVER (
      PARTITION BY "item_id"
      ORDER BY COALESCE("data_atualizacao_preco", "atualizado_em", "criado_em") DESC, "id" ASC
    ) AS purchase_rank
  FROM "item_compra"
),
items_with_primary AS (
  SELECT DISTINCT "item_id" FROM "item_compra" WHERE "principal" = true
)
UPDATE "item_compra" AS purchase
SET "principal" = true
FROM preferred_purchase
WHERE purchase."id" = preferred_purchase."id"
  AND preferred_purchase.purchase_rank = 1
  AND preferred_purchase."item_id" NOT IN (SELECT "item_id" FROM items_with_primary);
```

**Aplicar em Phase 8:** mesma estrutura — `ADD COLUMN IF NOT EXISTS unidade_uso_id/quantidade_uso` + `CREATE INDEX IF NOT EXISTS` + `DO $$ ... pg_constraint ... END $$` para FK + UPDATE JOIN com COALESCE para backfill (nao forca escrita onde `unidade_uso_id IS NOT NULL` ja).

**Exec canonico:** `docker compose run --rm migrate` (D-04).

---

### 3. `src/modules/catalog/server/catalog-prisma-mappers.ts` — presenter derivation

**Analog:** proprio `resolveUsageMetrics` (82-98) + `mapPurchases` (100-113). Padrao ja derivado por compra para `conversionFactor`, `usageQuantity`, `usagePrice`.

**Padrao atual (lines 82-113):**
```ts
function resolveUsageMetrics(item: CatalogItemRecord, purchase: CatalogItemRecord["compras"][number]) {
  const conversionFactor = resolveConversionFactor(item, purchase);

  if (conversionFactor.isZero()) {
    return {
      conversionFactor: "1.0000",
      usageQuantity: purchase.quantidadePorEmbalagem.toFixed(4),
      usagePrice: purchase.custoCompra.toFixed(4)
    };
  }

  return {
    conversionFactor: conversionFactor.toFixed(4),
    usageQuantity: purchase.quantidadePorEmbalagem.div(conversionFactor).toFixed(4),
    usagePrice: purchase.custoCompra.div(conversionFactor).toFixed(4)
  };
}

function mapPurchases(item: CatalogItemRecord) {
  return item.compras.map((purchase) => ({
    ...resolveUsageMetrics(item, purchase),
    id: purchase.id,
    supplierName: purchase.fornecedor.nome,
    purchaseIsPrimary: purchase.principal,
    purchaseQuantity: purchase.quantidadePorEmbalagem.toFixed(4),
    purchaseCost: purchase.custoCompra.toFixed(4),
    // ...
  }));
}
```

**Aplicar em Phase 8 (D-05, D-07):** alterar `mapPurchases` para localizar `primary = item.compras.find(c => c.principal)` **antes** do `.map`, derivar `primaryUsageUnit/primaryUsageQuantity` do principal, e para cada row:
- Se `purchase.principal` → usa `purchase.unidadeUso/quantidadeUso` proprios.
- Senao → injeta `primaryUsageUnit/primaryUsageQuantity` + flag `usageIsFixedFromPrimary: true`.
- Fator = `Number(quantidadeCompra) / Number(quantidadeUsoExibida)` (D-02, sempre computado).
- `usagePrice = custoCompra / fator` (D-07, por fornecedor com seus proprios valores).

Tambem estender `CatalogItemRecord` (lines 20-25) para incluir `unidadeUso: UnidadeMedida | null` na relacao compras.

---

### 4. `src/modules/catalog/server/catalog-repository.ts` — saveItemWithPrisma + queryItem

**Analog:** proprio (linhas 253-298 query, 469-614 save).

**Padrao include (copiar da linha 266-273):**
```ts
compras: {
  orderBy: [{ principal: "desc" }, { dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
  include: {
    fornecedor: { select: { nome: true } },
    unidadeCompra: true
  }
}
```

**Aplicar:** adicionar `unidadeUso: true` no include (D-05 read side).

**Padrao de deleteMany + create loop (linhas 567-600):**
```ts
await tx.itemCompra.deleteMany({ where: { itemId: item.id } });

for (const purchase of input.purchases) {
  const supplier = await tx.fornecedor.upsert({
    where: { nome: purchase.supplierName.trim() },
    update: { ativo: true },
    create: { nome: purchase.supplierName.trim(), ativo: true }
  });

  const purchaseUnit = await ensureUnit(tx, purchase.purchaseUnit);
  await tx.itemCompra.create({
    data: {
      itemId: item.id,
      fornecedorId: supplier.id,
      unidadeCompraId: purchaseUnit.id,
      principal: purchase.purchaseIsPrimary,
      quantidadePorEmbalagem: purchase.purchaseQuantity,
      custoCompra: purchase.purchaseCost,
      custoUnitarioBase: calculateCanonicalUnitCost(...).toString(),
      dataAtualizacaoPreco: parsePurchaseUpdatedAt(purchase.priceUpdatedAt)
    }
  });
}
```

**Aplicar em Phase 8 (D-08):** estender `data` do `itemCompra.create` com:
- `unidadeUsoId: purchase.purchaseIsPrimary ? (await ensureUnit(tx, purchase.usageUnit)).id : null`
- `quantidadeUso: purchase.purchaseIsPrimary ? purchase.usageQuantity : null`

Remover linhas 508-509 e 521-522 (escrita de `unidadeEstoqueId`/`unidadeUsoPadraoId`) conforme D-03.

---

### 5. `src/modules/catalog/server/item-form-schema.ts` — Zod + superRefine

**Analog:** proprio (linhas 1-101).

**Padrao positiveDecimal + purchaseSchema (linhas 17-31):**
```ts
const positiveDecimal = z
  .string()
  .trim()
  .refine((value) => Number(value) > 0, "Deve ser maior que zero.");

const purchaseSchema = z.object({
  supplierName: z.string().trim().min(1, "Fornecedor obrigatorio."),
  purchaseUnit: z.string().trim().min(1, "Unidade de compra obrigatoria."),
  purchaseIsPrimary: z.boolean().default(false),
  purchaseQuantity: positiveDecimal,
  purchaseCost: positiveDecimal,
  priceUpdatedAt: z.string().trim().min(1, "Data de atualizacao obrigatoria."),
  usageQuantity: z.string().trim().optional(),
  usagePrice: z.string().trim().optional()
});
```

**Padrao superRefine existente (54-64):**
```ts
.superRefine((rows, context) => {
  const primaryCount = rows.filter((row) => row.purchaseIsPrimary).length;
  if (primaryCount > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione apenas um fornecedor principal.",
      path: []
    });
  }
})
```

**Aplicar em Phase 8 (D-08):** estender `purchaseSchema` com `usageUnit: z.string().trim().optional()` + (ja existe) `usageQuantity`. No `superRefine` do array `purchases`, adicionar:
```ts
const primaryIdx = rows.findIndex(r => r.purchaseIsPrimary);
if (primaryIdx >= 0) {
  const primary = rows[primaryIdx];
  if (!primary.usageUnit || primary.usageUnit.trim().length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unidade de uso obrigatoria no fornecedor principal.",
      path: [primaryIdx, "usageUnit"]
    });
  }
  if (!primary.usageQuantity || Number(primary.usageQuantity) <= 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Quantidade de uso deve ser maior que zero no fornecedor principal.",
      path: [primaryIdx, "usageQuantity"]
    });
  }
}
```

Remover `stockUnit/usageUnit/conversionFactor` do `itemFormSchema` top-level (D-09).

---

### 6. `src/modules/catalog/ui/item-form.tsx` — Identificacao enxuta

**Analog:** proprio (linhas 1-337).

**Padrao FormSection + Grid Identificacao (preservar, 150-243):**
```tsx
<FormSection title="Identificacao" description="...">
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <TextField required fullWidth label="Codigo do item" name="code" ... />
    </Grid>
    {/* Nome, Tipo, Categoria, Status, Descricao */}
  </Grid>
</FormSection>
```

**Aplicar (D-09):**
- Manter este bloco (linhas 150-243) com ajustes de largura conforme `update/tela-item-v1.html` 181-219 (`140px 1fr 160px` para Row 1).
- **Remover inteira** a segunda `FormSection "Descricao e detalhamento operacional"` (linhas 245-324).
- **Remover** state `stockUnitValue`, `conversionFactorValue`, helpers `toPositiveNumber`, `formatOperationalMetric`, derivados `usageQuantity`, `usagePrice`, e props relacionadas em `ItemFormProps.initialValues`.
- Mover textarea Descricao para novo bloco `<FormSection title="Observacoes">` apos `<PurchasesEditor>` (HTML 374-381).

---

### 7. `src/modules/catalog/ui/purchases-editor.tsx` — Estender cards fornecedor

**Analog:** proprio (linhas 1-402). Preservar TODA a estrutura atual; **estender** apenas.

**Padrao card principal/secundario atual (143-178):**
```tsx
<Box
  sx={{
    p: 2.5,
    border: "0.5px solid",
    borderColor: isPrimary ? "#C0DD97" : "divider",
    borderRadius: 2,
    bgcolor: isPrimary ? "#F0F7E8" : "#FAFAF9"
  }}
>
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
    <Typography variant="overline" sx={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      color: isPrimary ? "#1B6B2C" : "text.secondary"
    }}>
      {supplierLabel}
    </Typography>
    <IconButton aria-label={...} size="small" onClick={() => removeRow(index)}>
      <DeleteOutlineIcon fontSize="small" />
    </IconButton>
  </Stack>
  {/* grids de campos */}
</Box>
```

**Padrao readonly verde (linhas 277-296):**
```tsx
<TextField
  fullWidth size="small"
  label="Preco de uso"
  value={usagePricePerUnit !== null ? usagePricePerUnit.toFixed(4) : "--"}
  slotProps={{
    input: { readOnly: true },
    htmlInput: { "aria-readonly": "true" }
  }}
  helperText="Calculado a partir da compra."
  sx={{
    "& .MuiInputBase-root": { bgcolor: "#EAF3DE" },
    "& .MuiInputBase-input": { color: "#1B6B2C", fontWeight: 500 }
  }}
/>
```

**Padrao Adicionar fornecedor (linhas 106-121):**
```tsx
<Button type="button" variant="text" startIcon={<AddIcon />}
  onClick={() => onRowsChange([
    ...rows.map((row, index) => ({
      ...row,
      purchaseIsPrimary: index === 0 ? row.purchaseIsPrimary : false
    })),
    buildDefaultRow(purchaseUnit)
  ])}>
  Adicionar fornecedor
</Button>
```

**Aplicar em Phase 8 (D-05, D-06, D-11, D-12):**
1. Estender `PurchaseRow` com `usageUnit: string`, `usageQuantity: string`, `usageIsFixedFromPrimary: boolean`.
2. Trocar o layout das linhas de medidas por 3 linhas conforme HTML `tela-item-v1.html` 227-362 (ver checklist em §9).
3. Para secundarios (rows onde `!purchaseIsPrimary`), renderizar `Unidade de uso` e `Qtde de uso` como readonly verde (copiar pattern linhas 277-296) + badge ao lado do label com sx `{ fontSize: 10, bgcolor: "#EAF3DE", color: "#1B6B2C", border: "0.5px solid #C0DD97", borderRadius: "4px", padding: "1px 6px", ml: 0.75 }` (conforme HTML linha 110).
4. Derivacao client-side: localizar `primaryRow = rows.find(r => r.purchaseIsPrimary)`; para secundarios usar `primaryRow?.usageUnit/usageQuantity` no render; ao salvar (serializedRows linha 65), enviar `usageUnit=""/usageQuantity=""` nos secundarios (presenter deriva).
5. Toggle principal (D-06): em `updateRow`, quando toggla `purchaseIsPrimary: true`, resetar demais para `false`; exibir inline `<Alert severity="info">Campos fixados atualizados a partir de {newPrimary.supplierName}</Alert>` transitorio.

**ATENCAO (R10):** HTML `.fornecedor-block + .fornecedor-block` pinta **secundarios** em verde `#F0F7E8`; app atual pinta **principal** verde. Decisao a tomar em plano: inverter ou manter.

---

### 8. `src/modules/catalog/ui/items-listing-view.tsx` — Grade + coluna Fornecedor +N

**Analog:** proprio (1-80+) + `mapItemListRow` em `catalog-prisma-mappers.ts` (132-163).

**Padrao TYPE_BADGE_COLORS (69-77):**
```ts
const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  insumo:        { bg: "#EAF3DE", text: "#27500A" },
  intermediario: { bg: "#E6F1FB", text: "#0C447C" },
  // ...
};
```

**Padrao supplierCount (mapper 138-140):**
```ts
const supplierCount = new Set(
  item.compras.map((c) => c.fornecedor?.nome).filter(Boolean)
).size;
```

**Aplicar (D-10):**
- Em `mapItemListRow` (linhas 142-162), quando `preferredPurchase === null` retornar `"--"` em `purchaseQuantity`, `baseUnitCost`, `usagePrice`, `usageUnit`, `conversionFactor`, `supplierName` (ao inves de `"0.0000"`/`"-"`/`"sem fornecedor"`).
- Garantir que `selectedPurchase` venha do `principal` (ja vem via `resolvePreferredPurchase` 56-66).
- Badge `+N` ao lado do nome do fornecedor na render (ja implementado em pendencias-v3/07-03 — verificar).
- Usar `DataGridNumericCell` ja importado (linha 33) que aceita "--".

---

### 9. `src/modules/engineering/ui/TotaisIndicadores.tsx` — NaN guards + Calcular peso

**Analog:** proprio (1-320).

**Padrao parseFiniteMetric + formatMetricValue (33-50):**
```ts
function parseFiniteMetric(value: string | null | undefined) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetricValue(value: string | null | undefined, formatter: (parsed: number) => string) {
  const parsed = parseFiniteMetric(value);
  if (parsed === null) {
    return value && value.trim() !== "" ? value : "--";
  }
  return formatter(parsed);
}
```

**Padrao metricRow (60-90):**
```ts
function metricRow(label, value, options?) { /* ... */ }
```

**Aplicar em Phase 8 (D-14, CRIT-03..07):**
1. Novo helper `weightMissing = summary.postCookingWeight === "--" || summary.postCookingWeight === "" || !Number.isFinite(Number(summary.postCookingWeight))`.
2. Em `costsAndCmv` (linhas 198-219), wrap `formatMetricValue(...)` com condicional para retornar literal `"Calcular peso"` quando `weightMissing === true` — aplicar em CMV sem embalagem, CMV com Embalagem, CMV final aplicado.
3. Margem de contribuicao R$ (linha 272): novo helper `const salePriceValid = parseFiniteMetric(salePriceInput) !== null && Number(salePriceInput) > 0;` — se invalido, exibir `"Informe o valor"`.
4. Confirmar linha 307 `operationalReading` nunca gera "R$ NaN" — presenter deve setar `referencePrice = null` em `components-editor.tsx` quando `salePriceInput` invalido.

---

### 10. `src/modules/engineering/ui/components-editor.tsx` — hook banner FICHA-07

**Analog:** proprio (1-60+). Padrao `useDeferredValue`, `useMemo`, `useState`, tabs MUI.

**Aplicar (PDFV2-FICHA-07):** ao `onChange` do select de item em um row (handler `updateRow`), disparar `useEffect` que invoca nova server action `findFichasUsingItem` (abaixo) e popula state `similarFichas[rowId]`. Renderizar `<SimilarFichasBanner rowId={...} fichas={state.similarFichas[rowId]} />` inline abaixo do row.

---

### 11. `src/modules/engineering/server/ficha-similar-lookup.ts` (NOVO) — server action

**Analog:** `src/modules/catalog/server/catalog-repository.ts` `queryItem` (253-298) + `catalog-actions.ts` pattern `"use server"` + `getPrismaClient(env.DATABASE_URL)`.

**Padrao a copiar (de `catalog-repository.ts` 398-411):**
```ts
async function getItemDetailWithPrisma(itemId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return null;

  try {
    const item = await queryItem(prisma, itemId);
    return item ? mapItemDetail(item) : null;
  } catch {
    return null;
  }
}
```

**Aplicar:**
```ts
"use server";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { FichaStatus } from "@/generated/prisma/client";

export async function findFichasUsingItem(
  itemComponenteId: string,
  currentFichaId: string | null,
  modalidadeId: string | null
): Promise<Array<{ id: string; nomeExibicao: string; modalidadeNome: string | null }>> {
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return [];
  try {
    const rows = await prisma.fichaTecnica.findMany({
      where: {
        id: currentFichaId ? { not: currentFichaId } : undefined,
        status: { in: [FichaStatus.ativa, FichaStatus.rascunho] },
        modalidadeId,
        componentes: { some: { itemComponenteId } }
      },
      select: { id: true, nomeExibicao: true, modalidade: { select: { nome: true } } },
      take: 5
    });
    return rows.map(r => ({
      id: r.id,
      nomeExibicao: r.nomeExibicao ?? "Ficha sem nome",
      modalidadeNome: r.modalidade?.nome ?? null
    }));
  } catch {
    return [];
  }
}
```

Criterio D-13: `mesma modalidade + mesmo itemComponenteId + status ativa/rascunho`.

---

### 12. `src/modules/import/server/import-actions.ts` — D-17 cria ItemCompra principal

**Analog:** proprio (linhas 115-138).

**Padrao atual (115-138):**
```ts
await catalogRepository.saveItem({
  id: existingItem?.id,
  code: existingItem?.code ?? "",
  name: row.itemName,
  type: row.type as ...,
  operationalCategory: row.operationalCategory || ... || "Operacional",
  stockUnit: row.purchaseUnit || "un",
  usageUnit: row.usageUnit || "un",
  conversionFactor: row.conversionFactor || "1.0000",
  description: ...,
  active: true,
  purchases: [
    {
      supplierName: existingItem?.supplierName || "Importacao operacional",
      purchaseUnit: row.purchaseUnit || "un",
      purchaseIsPrimary: true,
      purchaseQuantity: row.purchaseQuantity || "1.0000",
      purchaseCost: row.purchaseCost || "0.0000",
      priceUpdatedAt: row.updatedAt || new Date().toISOString()
    }
  ]
});
```

**Aplicar (D-17):** adicionar `usageUnit: row.purchaseUnit || "un"` e `usageQuantity: "1.0000"` no objeto dentro de `purchases[0]`. Remover campos `stockUnit/usageUnit/conversionFactor` do top-level do `saveItem` (ver §5 Zod mudanca). Se `SaveItemInput` ainda exigir, passar `""` e deixar repository ignorar via D-03.

---

### 13. `scripts/ops/pack-release.sh` (NOVO) — pacote ZIP

**Analog:** `scripts/ops/backup-db.sh`, `scripts/ops/migrate-and-seed.sh`.

**Padrao (shebang + set + operacao):**
```bash
#!/usr/bin/env bash
set -euo pipefail
# ...
```

**Aplicar:** script gera `output/release-v1.2-phase8-YYYYMMDD.zip` com `.next public prisma src scripts docs package.json package-lock.json tsconfig.json next.config.ts docker-compose.yml`, excluindo `node_modules`, `.git`, `.next/cache`, `*.log`, `*.tsbuildinfo` (spec em RESEARCH.md §9.3).

---

### 14. `docs/qa/2026-04-17-recuperacao-cliente.md` (NOVO) — release notes

**Analog:** `docs/qa/homologation-checklist.md`, `docs/qa/2026-03-26-plano-de-confirmacao-com-cliente.md`.

**Aplicar:** estrutura com secoes "Como rodar", "Changelog", "Screenshots comparativos", "Checklist de validacao", confirmacao de testes verdes.

---

### 15. Testes novos

**Unit — `src/tests/unit/engineering/TotaisIndicadores.test.tsx` (NOVO)**
**Analog:** `src/tests/unit/components-editor.test.tsx` (lines 1-60).

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";

describe("TotaisIndicadores — NaN guards", () => {
  it('exibe "Calcular peso" quando postCookingWeight ausente', () => { /* ... */ });
  it('exibe "Informe o valor" quando salePriceInput vazio', () => { /* ... */ });
  it("nunca renderiza NaN/null/undefined na UI", () => { /* ... */ });
});
```

**Unit — `src/tests/unit/catalog/purchases-editor.test.tsx` (NOVO)**
**Analog:** `src/tests/unit/item-form.test.tsx`.
- Renderiza 1 row principal + 2 secundarios
- Badge `fixado do 1o fornecedor` aparece nos secundarios
- Toggle principal atualiza readonly nos demais
- Derivacao client-side: mudar `usageQuantity` do principal propaga no render dos secundarios

**Integration — `src/tests/integration/catalog-fornecedor.test.ts` (NOVO)**
**Analog:** `src/tests/integration/catalog-prisma.test.ts` (1-110).

Padrao a copiar:
```ts
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemType, UnidadeTipo } from "@/generated/prisma/client";
import {
  closeIntegrationPrisma, getIntegrationPrisma, isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("catalog fornecedor integration", () => {
  const prisma = getIntegrationPrisma();
  beforeAll(async () => { /* cleanup em cascata */ });
  afterAll(async () => { await closeIntegrationPrisma(); });

  it("save com 2 purchases persiste unidadeUso so no principal", async () => { /* ... */ });
  it("read retorna secundario com unidadeUso derivada do principal", async () => { /* ... */ });
  it("toggle principal propaga fixado automaticamente na leitura", async () => { /* ... */ });
});
```

**Integration — `src/tests/integration/prisma-migration-idempotence.test.ts` (NOVO, parcial-match)**
**Analog scaffold:** `catalog-prisma.test.ts` helpers + query de `information_schema.columns`.
- Aplica migration → snapshot columns/indexes/constraints
- Aplica de novo → diff === 0

**E2E — estender `tests/e2e/engineering-flow.spec.ts`**
**Analog:** proprio (linhas 1-60+).
- Adicionar cenario PDFV2-FICHA-07: cria 2 fichas mesma modalidade + mesmo ingrediente → banner aparece na segunda.

**E2E — estender `tests/e2e/importacao.spec.ts`**
**Analog:** proprio.
- Assert item importado tem `ItemCompra principal=true` com `unidade_uso_id` e `quantidade_uso=1`.

---

## Shared Patterns

### Presenter derivation de valores operacionais
**Source:** `src/modules/catalog/server/catalog-prisma-mappers.ts` 82-113
**Apply to:** `mapPurchases` (Phase 8) e qualquer metrica derivada no fluxo de fornecedor.
```ts
const qtdeCompra = Number(purchase.quantidadePorEmbalagem);
const qtdeUso = Number(displayUsageQuantity);
const fator = qtdeUso > 0 ? qtdeCompra / qtdeUso : 1;
const usagePrice = fator > 0 ? Number(purchase.custoCompra) / fator : Number(purchase.custoCompra);
```

### Server action pattern (use server + requirePermission + parse + repository + audit + redirect)
**Source:** `src/modules/catalog/server/catalog-actions.ts` 32-77
**Apply to:** todas as server actions novas (ficha-similar-lookup e outras).
```ts
"use server";
// ...
export async function saveItemAction(_: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const actor = await resolveCatalogActor();
  const parsed = parseItemFormData(formData);
  if (!parsed.success) return { status: "error", message: "...", errors: parsed.errors };
  // ...
}
```

### Zod schema + superRefine validation
**Source:** `src/modules/catalog/server/item-form-schema.ts` 17-65
**Apply to:** estender `purchaseSchema` e `superRefine` com regra principal-only.

### UI card com estado isPrimary (borders + bg)
**Source:** `src/modules/catalog/ui/purchases-editor.tsx` 143-178
**Apply to:** purchases-editor estendido.

### Readonly verde calc hint
**Source:** `src/modules/catalog/ui/purchases-editor.tsx` 277-296
```tsx
sx={{
  "& .MuiInputBase-root": { bgcolor: "#EAF3DE" },
  "& .MuiInputBase-input": { color: "#1B6B2C", fontWeight: 500 }
}}
slotProps={{ input: { readOnly: true }, htmlInput: { "aria-readonly": "true" } }}
helperText="Calculado automaticamente."
```
**Apply to:** campos Unidade de uso, Qtde de uso, Fator, Preco de uso nos secundarios.

### NaN-safe formatter
**Source:** `src/modules/engineering/ui/TotaisIndicadores.tsx` 33-50 + `src/modules/engineering/server/engineering-repository.ts` 89-99
**Apply to:** qualquer novo metric display na Phase 8.

### Prisma migration idempotente (ADD COLUMN IF NOT EXISTS + pg_constraint DO $$ + WITH CTE backfill)
**Source:** `prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql` 1-22 + `202604022030_phase7_docker_alignment/migration.sql` 1-25
**Apply to:** nova migration Phase 8.

### Integration test scaffold com skipIf + cleanup + prisma helper
**Source:** `src/tests/integration/catalog-prisma.test.ts` 1-30
**Apply to:** novos integration specs (fornecedor + migration-idempotence).

### E2E test helpers Playwright (selectMuiOption, uniqueName)
**Source:** `tests/e2e/engineering-flow.spec.ts` 1-60
**Apply to:** estensoes dos specs existentes.

---

## No Analog Found

| Arquivo | Role | Data Flow | Razao |
|---------|------|-----------|-------|
| `src/modules/engineering/ui/SimilarFichasBanner.tsx` (nome a criterio) | component | banner info | Nenhum banner inline contextual no codebase. Base: MUI `Alert severity="info"` + `Link` — seguir `sx={{ fontSize: 12, py: 0.5 }}`. Novo padrao, mas simples. |

---

## Metadata

**Analog search scope:** `prisma/`, `prisma/migrations/`, `src/modules/catalog/`, `src/modules/engineering/`, `src/modules/import/`, `src/tests/`, `tests/`, `scripts/ops/`, `docs/qa/`.

**Arquivos lidos (integralmente ou parcialmente):**
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md`
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md`
- `prisma/schema.prisma` (linhas 100-240)
- `prisma/migrations/202604022030_phase7_docker_alignment/migration.sql` (head)
- `prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql`
- `src/modules/catalog/server/catalog-prisma-mappers.ts` (1-170)
- `src/modules/catalog/server/catalog-repository.ts` (240-614)
- `src/modules/catalog/server/catalog-actions.ts` (1-80)
- `src/modules/catalog/server/item-form-schema.ts` (integral)
- `src/modules/catalog/ui/purchases-editor.tsx` (integral)
- `src/modules/catalog/ui/item-form.tsx` (integral)
- `src/modules/catalog/ui/items-listing-view.tsx` (1-80)
- `src/modules/engineering/ui/TotaisIndicadores.tsx` (1-320)
- `src/modules/engineering/ui/components-editor.tsx` (1-60)
- `src/modules/engineering/ui/FichaFlatGrid.tsx` (1-40)
- `src/modules/engineering/server/engineering-repository.ts` (1-120)
- `src/modules/import/server/import-actions.ts` (1-140)
- `src/tests/unit/item-form-schema.test.ts` (1-60)
- `src/tests/unit/components-editor.test.tsx` (1-60)
- `src/tests/integration/catalog-prisma.test.ts` (integral)
- `tests/e2e/engineering-flow.spec.ts` (1-60)

**Pattern extraction date:** 2026-04-17
