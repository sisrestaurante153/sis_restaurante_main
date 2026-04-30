---
phase: 08
plan: 02
plan_id: 08-02
description: Schema ItemCompra (unidade_uso_id + quantidade_uso) + migracao idempotente + presenter derivation + Zod/repository + import CSV alinhado
type: execute
wave: 2
depends_on:
  - 08-01
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql
  - src/modules/catalog/server/catalog-prisma-mappers.ts
  - src/modules/catalog/server/catalog-repository.ts
  - src/modules/catalog/server/item-form-schema.ts
  - src/modules/import/server/import-actions.ts
  - src/tests/integration/catalog/catalog-repository-fornecedor.test.ts
  - src/tests/integration/catalog/catalog-presenter-derivation.test.ts
  - src/tests/integration/prisma/migration-idempotence.test.ts
  - tests/e2e/importacao.spec.ts
autonomous: false
requirements:
  - SPEC-ITEM-FORNECEDOR
  - SPEC-ITEM-LAYOUT
tags:
  - prisma
  - schema
  - migration
  - catalog
  - presenter
  - import-csv
must_haves:
  truths:
    - "ItemCompra persiste unidadeUsoId e quantidadeUso somente no principal; secundarios recebem esses campos derivados do principal na leitura."
    - "Migration aplica sem perda de dados: itens existentes tem unidade_uso_padrao_id e quantidade_uso=1 movidos para o ItemCompra principal."
    - "Migration e idempotente: rodar 2x via `docker compose run --rm migrate` produz mesmo estado."
    - "Fator de conversao e sempre computado na leitura (nenhuma coluna fator em ItemCompra)."
    - "precoUso(fornN) = precoCompra(fornN) / fator(fornN) — cada fornecedor usa seus proprios valores."
    - "Import CSV cria/atualiza ItemCompra principal com unidade_uso_id = unidade_compra_id e quantidade_uso = 1 por default."
    - "Zero regressao em tests/e2e/importacao.spec.ts e tests/e2e/engineering-flow.spec.ts."
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Modelo ItemCompra com unidadeUsoId + quantidadeUso + relation alias"
      contains: "unidadeUso UnidadeMedida"
    - path: "prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql"
      provides: "Migration idempotente: ADD COLUMN IF NOT EXISTS + pg_constraint guard + backfill CTE"
      contains: "unidade_uso_id"
    - path: "src/modules/catalog/server/catalog-prisma-mappers.ts"
      provides: "mapPurchases com derivacao do principal para secundarios (flag usageIsFixedFromPrimary)"
      contains: "usageIsFixedFromPrimary"
    - path: "src/tests/integration/prisma/migration-idempotence.test.ts"
      provides: "Prova que rodar migration 2x preserva estado"
      min_lines: 40
    - path: "src/tests/integration/catalog/catalog-repository-fornecedor.test.ts"
      provides: "Save + read roundtrip com 1/2/N fornecedores, derivacao de secundarios"
      min_lines: 80
  key_links:
    - from: "prisma/schema.prisma ItemCompra.unidadeUso"
      to: "UnidadeMedida (relation ItemCompraUnidadeUso)"
      via: "Prisma relation alias"
      pattern: 'unidadeUso\s+UnidadeMedida\?\s+@relation\("ItemCompraUnidadeUso"'
    - from: "catalog-prisma-mappers.ts mapPurchases"
      to: "primary row (item.compras.find(c => c.principal))"
      via: "derivacao unidadeUso/quantidadeUso para secundarios"
      pattern: "find\\(.*principal\\)"
    - from: "import-actions.ts createOperationalItemImportAction"
      to: "saveItem purchases[0]"
      via: "usageUnit + usageQuantity default"
      pattern: "purchaseIsPrimary: true"
---

<objective>
Fundacao de dados da Phase 8: estender `ItemCompra` com `unidadeUsoId` (nullable) + `quantidadeUso`
(nullable), criar migration idempotente com backfill dos itens existentes, atualizar presenter
para derivar campos fixados dos secundarios a partir do principal (D-05), atualizar Zod schema
+ repository + server action para aceitar novos campos, e alinhar o import CSV para criar/atualizar
ItemCompra principal com unidade_uso_id + quantidade_uso defaults (D-17).

Purpose: cumprir criterio de sucesso #2 da Phase 8 ("Migracao de dados ocorre sem perda: itens
existentes tem unidade/qtde/preco movidos para o fornecedor principal ja cadastrado.") e desbloquear
os planos seguintes (08-03 UI fornecedor, 08-04 Identificacao enxuta) que dependem do novo schema.

Output: schema + migration SQL + presenter derivado + Zod estendido + repository alinhado + import
alinhado + 3 specs de integration novos + spec e2e importacao estendido.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md
@.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-VALIDATION.md
@prisma/schema.prisma
@prisma/migrations/202604022030_phase7_docker_alignment/migration.sql
@prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql
@src/modules/catalog/server/catalog-prisma-mappers.ts
@src/modules/catalog/server/catalog-repository.ts
@src/modules/catalog/server/item-form-schema.ts
@src/modules/import/server/import-actions.ts
@src/tests/integration/catalog-prisma.test.ts

<interfaces>
<!-- Contratos extraidos de 08-RESEARCH.md §4 + 08-PATTERNS.md §§1-5, 12. -->

Schema ItemCompra (alvo Phase 8):
```prisma
model ItemCompra {
  id                     String         @id @default(cuid())
  itemId                 String         @map("item_id")
  fornecedorId           String         @map("fornecedor_id")
  unidadeCompraId        String         @map("unidade_compra_id")
  unidadeUsoId           String?        @map("unidade_uso_id")       // NOVO
  principal              Boolean        @default(false)
  quantidadePorEmbalagem Decimal        @db.Decimal(18, 4) @map("quantidade_por_embalagem")
  quantidadeUso          Decimal?       @db.Decimal(18, 4) @map("quantidade_uso")  // NOVO
  custoCompra            Decimal        @db.Decimal(18, 4) @map("custo_compra")
  custoUnitarioBase      Decimal        @db.Decimal(18, 6) @map("custo_unitario_base")
  dataAtualizacaoPreco   DateTime?      @map("data_atualizacao_preco")
  observacao             String?
  criadoEm               DateTime       @default(now()) @map("criado_em")
  atualizadoEm           DateTime       @updatedAt @map("atualizado_em")
  item                   Item           @relation(fields: [itemId], references: [id], onDelete: Cascade)
  fornecedor             Fornecedor     @relation(fields: [fornecedorId], references: [id])
  unidadeCompra          UnidadeMedida  @relation("ItemCompraUnidadeCompra", fields: [unidadeCompraId], references: [id])
  unidadeUso             UnidadeMedida? @relation("ItemCompraUnidadeUso", fields: [unidadeUsoId], references: [id])  // NOVO

  @@unique([itemId, fornecedorId, unidadeCompraId])
  @@index([fornecedorId])
  @@index([unidadeUsoId])
  @@map("item_compra")
}
```

UnidadeMedida (backrefs — rename + adicionar):
```prisma
// ANTES (linha 125): itensCompra ItemCompra[]
// DEPOIS:
itensCompraUnidadeCompra ItemCompra[] @relation("ItemCompraUnidadeCompra")
itensCompraUnidadeUso    ItemCompra[] @relation("ItemCompraUnidadeUso")
```

Zod purchaseSchema (estender em item-form-schema.ts linhas 17-31):
```ts
const purchaseSchema = z.object({
  supplierName: z.string().trim().min(1, "Fornecedor obrigatorio."),
  purchaseUnit: z.string().trim().min(1, "Unidade de compra obrigatoria."),
  purchaseIsPrimary: z.boolean().default(false),
  purchaseQuantity: positiveDecimal,
  purchaseCost: positiveDecimal,
  priceUpdatedAt: z.string().trim().min(1, "Data de atualizacao obrigatoria."),
  usageUnit: z.string().trim().optional(),       // NOVO — obrigatorio so no principal (superRefine)
  usageQuantity: z.string().trim().optional()    // NOVO — obrigatorio so no principal (superRefine)
});
```

Presenter mapPurchases (estender em catalog-prisma-mappers.ts ~100-113):
```ts
function mapPurchases(item: CatalogItemRecord) {
  const primary = item.compras.find((c) => c.principal);
  const primaryUsageUnit     = primary?.unidadeUso?.codigo ?? primary?.unidadeCompra.codigo ?? "";
  const primaryUsageQuantity = primary?.quantidadeUso?.toFixed(4) ?? "1.0000";

  return item.compras.map((purchase) => {
    const isPrimary = purchase.principal;
    const displayUsageUnit     = isPrimary ? (purchase.unidadeUso?.codigo ?? purchase.unidadeCompra.codigo) : primaryUsageUnit;
    const displayUsageQuantity = isPrimary ? (purchase.quantidadeUso?.toFixed(4) ?? "1.0000")                : primaryUsageQuantity;

    const qc = Number(purchase.quantidadePorEmbalagem);
    const qu = Number(displayUsageQuantity);
    const fator = qu > 0 ? qc / qu : 1;
    const precoUso = fator > 0 ? Number(purchase.custoCompra) / fator : Number(purchase.custoCompra);

    return {
      id: purchase.id,
      supplierName: purchase.fornecedor.nome,
      purchaseUnit: purchase.unidadeCompra.codigo,
      purchaseIsPrimary: isPrimary,
      purchaseQuantity: purchase.quantidadePorEmbalagem.toFixed(4),
      purchaseCost: purchase.custoCompra.toFixed(4),
      usageUnit: displayUsageUnit,                   // NOVO
      usageQuantity: displayUsageQuantity,           // NOVO
      conversionFactor: fator.toFixed(4),            // derivado (D-02)
      usagePrice: precoUso.toFixed(4),               // derivado por fornecedor (D-07)
      usageIsFixedFromPrimary: !isPrimary,           // NOVO (D-05)
      baseUnitCost: purchase.custoUnitarioBase.toFixed(6),
      priceUpdatedAt: purchase.dataAtualizacaoPreco?.toISOString().slice(0, 10) ?? "",
      notes: purchase.observacao ?? ""
    };
  });
}
```

Query include (catalog-repository.ts ~linhas 266-273):
```ts
compras: {
  orderBy: [{ principal: "desc" }, { dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
  include: {
    fornecedor: { select: { nome: true } },
    unidadeCompra: true,
    unidadeUso: true     // NOVO
  }
}
```

Import payload (import-actions.ts ~linhas 115-138):
```ts
purchases: [
  {
    supplierName: existingItem?.supplierName || "Importacao operacional",
    purchaseUnit: row.purchaseUnit || "un",
    purchaseIsPrimary: true,
    purchaseQuantity: row.purchaseQuantity || "1.0000",
    purchaseCost: row.purchaseCost || "0.0000",
    priceUpdatedAt: row.updatedAt || new Date().toISOString(),
    usageUnit: row.purchaseUnit || "un",   // NOVO — D-17 default
    usageQuantity: "1.0000"                // NOVO — D-17 default
  }
]
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0 RED): Criar integration tests — migration-idempotence + catalog-repository-fornecedor + catalog-presenter-derivation</name>
  <files>src/tests/integration/prisma/migration-idempotence.test.ts, src/tests/integration/catalog/catalog-repository-fornecedor.test.ts, src/tests/integration/catalog/catalog-presenter-derivation.test.ts</files>
  <read_first>
    - src/tests/integration/catalog-prisma.test.ts (integral — analog do scaffold skipIf + helpers)
    - src/tests/integration/helpers/prisma-test-env.ts (getIntegrationPrisma, closeIntegrationPrisma, isIntegrationDatabaseAvailable)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §12 (Testing Strategy 12.2)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §15 (Padrao integration + §Shared: skipIf + cleanup)
    - prisma/schema.prisma §ItemCompra (estado atual pre-migracao)
  </read_first>
  <behavior>
    Test — migration-idempotence:
    - Aplicar migration via Prisma Migrate Programmatico ou chamando SQL raw: rodar 2x; comparar `information_schema.columns` WHERE table_name='item_compra' — resultado identico.
    - Contar linhas com `principal=true` antes e depois do backfill — identico em 2a execucao.

    Test — catalog-repository-fornecedor:
    - Save com 1 fornecedor principal: persiste unidadeUsoId + quantidadeUso no principal.
    - Save com 2 fornecedores (1 principal + 1 secundario): secundario persiste unidadeUsoId=null e quantidadeUso=null.
    - Save com secundario enviando usageUnit="kg"/usageQuantity="5": DEVE IGNORAR na escrita (secundario continua null no DB); read retorna secundario com unidadeUso derivada do principal.
    - Save com 2 principais no payload: deve falhar validacao Zod (Selecione apenas um fornecedor principal).
    - Save sem usageUnit/usageQuantity no principal: deve falhar validacao Zod ("Unidade de uso obrigatoria no fornecedor principal.").

    Test — catalog-presenter-derivation:
    - Seed item com 1 principal (unidadeUso=kg, qtdeUso=1) + 1 secundario (unidadeUso=null, qtdeUso=null).
    - Read via `getItemDetail` -> secundario.usageUnit === "kg", secundario.usageQuantity === "1.0000", secundario.usageIsFixedFromPrimary === true.
    - Troca principal (mark secundario.principal=true + unidadeUso=g, qtdeUso=1000): read -> ex-principal agora e secundario e recebe usageUnit="g", usageQuantity="1000.0000" derivado.
    - Fator por fornecedor (D-07): secundario com qtdeCompra=10 -> fator = 10/1 (usando qtdeUso derivada do principal) = "10.0000"; precoUso = custoCompra/10.
  </behavior>
  <action>
Criar tres arquivos Vitest com `// @vitest-environment node` e pattern skipIf.

**Arquivo 1: `src/tests/integration/prisma/migration-idempotence.test.ts`**

```ts
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import {
  closeIntegrationPrisma, getIntegrationPrisma, isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("prisma migration idempotence (D-04)", () => {
  const prisma = getIntegrationPrisma();

  async function snapshotSchema() {
    const cols = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='item_compra' ORDER BY column_name`
    );
    const constraints = await prisma.$queryRawUnsafe<any[]>(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'item_compra'::regclass ORDER BY conname`
    );
    return { cols, constraints };
  }

  beforeAll(async () => { /* migration ja aplicada pelo setup do integration */ });
  afterAll(async () => { await closeIntegrationPrisma(); });

  it("apos migration inicial tem colunas unidade_uso_id e quantidade_uso", async () => {
    const snap = await snapshotSchema();
    expect(snap.cols.find(c => c.column_name === "unidade_uso_id")).toBeDefined();
    expect(snap.cols.find(c => c.column_name === "quantidade_uso")).toBeDefined();
  });

  it("schema snapshot estavel apos migration inicial (W-05: idempotencia end-to-end e provada pela Task 3 BLOCKING checkpoint que roda docker compose run --rm migrate 2x)", async () => {
    // W-05: removida re-execucao via $executeRawUnsafe — nao e confiavel porque migration.sql contem DO $$ ... $$ blocks que
    // o Prisma $executeRawUnsafe nao executa em single statement. Idempotencia real e provada no checkpoint Task 3 (docker run 2x).
    // Este teste confirma apenas o snapshot estavel (schema ja aplicado).
    const snap1 = await snapshotSchema();
    const count1 = await prisma.itemCompra.count({ where: { principal: true } });
    expect(snap1.cols.find(c => c.column_name === "unidade_uso_id")).toBeDefined();
    expect(snap1.cols.find(c => c.column_name === "quantidade_uso")).toBeDefined();
    expect(count1).toBeGreaterThanOrEqual(0); // sanity: query succeeds post-migration
  });
});
```

**Arquivo 2: `src/tests/integration/catalog/catalog-repository-fornecedor.test.ts`**

```ts
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemType, UnidadeTipo } from "@/generated/prisma/client";
import {
  closeIntegrationPrisma, getIntegrationPrisma, isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";
import { saveItem, getItemDetail } from "@/modules/catalog/server/catalog-repository";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("catalog fornecedor integration (SPEC-ITEM-FORNECEDOR, D-05, D-07, D-08)", () => {
  const prisma = getIntegrationPrisma();

  beforeAll(async () => {
    // cleanup em cascata como em catalog-prisma.test.ts
  });
  afterAll(async () => { await closeIntegrationPrisma(); });

  it("save principal persiste unidadeUsoId + quantidadeUso; secundario null", async () => { /* ... */ });

  it("secundario com usageUnit enviado no payload: escrita ignora (D-05)", async () => { /* ... */ });

  it("read retorna secundario com usageUnit derivado do principal (D-05)", async () => { /* ... */ });

  it("toggle principal propaga fixado automaticamente no read seguinte (D-06)", async () => { /* ... */ });

  it("precoUso por fornecedor usa seus proprios valores (D-07)", async () => {
    // seed: principal qc=1 qu=1 custo=10 -> fator=1 precoUso=10
    //       secundario qc=10 qu=derivado=1 custo=80 -> fator=10 precoUso=8
    // asserta ambos
  });

  it("save rejeita 2 principais (D-08)", async () => { /* ... */ });

  it("save rejeita principal sem usageUnit/usageQuantity (D-08)", async () => { /* ... */ });
});
```

**Arquivo 3: `src/tests/integration/catalog/catalog-presenter-derivation.test.ts`**

Focado EXCLUSIVAMENTE em leitura: seed direto via `prisma.itemCompra.create` com `unidadeUsoId=null`
nos secundarios, depois `getItemDetail(itemId)` -> asserta flag `usageIsFixedFromPrimary` e campos
derivados. Mais barato que o teste anterior (nao passa por Zod/save).

NOTA GREEN esperado: todos devem FALHAR agora (schema ainda nao tem as colunas novas, presenter
ainda nao deriva). Tasks 2-4 viram GREEN.
  </action>
  <verify>
    <automated>mkdir -p .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts && npm run test:integration -- migration-idempotence 2>&1 | tee .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-mig-red.log && (grep -qE 'FAIL|failed' .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/artifacts/t1-mig-red.log || (echo 'ERROR: RED gate not reached — tests did not fail' && exit 1))</automated>
  </verify>
  <acceptance_criteria>
    - `src/tests/integration/prisma/migration-idempotence.test.ts` existe com pelo menos 2 `it(...)` blocos
    - `src/tests/integration/catalog/catalog-repository-fornecedor.test.ts` existe com pelo menos 7 `it(...)` blocos cobrindo D-05, D-06, D-07, D-08
    - `src/tests/integration/catalog/catalog-presenter-derivation.test.ts` existe com pelo menos 3 `it(...)` blocos
    - `grep -c 'usageIsFixedFromPrimary' src/tests/integration/catalog/catalog-presenter-derivation.test.ts` >= 1
    - `grep -c 'principal: true' src/tests/integration/catalog/catalog-repository-fornecedor.test.ts` >= 3
    - `npm run test:integration -- migration-idempotence` retorna pelo menos 1 FAIL (RED esperado)
  </acceptance_criteria>
  <done>Tres specs RED criados, reproduzindo gaps descritos em RESEARCH §§4.2-4.5.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 (GREEN schema): Atualizar prisma/schema.prisma + criar migration SQL idempotente</name>
  <files>prisma/schema.prisma, prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql</files>
  <read_first>
    - prisma/schema.prisma (linhas 100-240 — modelos Item, ItemCompra, UnidadeMedida)
    - prisma/migrations/202604022030_phase7_docker_alignment/migration.sql (pattern CTE backfill)
    - prisma/migrations/202604022050_phase7_ficha_schema_alignment/migration.sql (pattern ADD COLUMN IF NOT EXISTS + pg_constraint DO $$)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §4.1 e §4.2
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §§1-2
  </read_first>
  <action>
**A) prisma/schema.prisma — estender ItemCompra e UnidadeMedida**

No modelo `ItemCompra`:
1. Adicionar campo `unidadeUsoId String? @map("unidade_uso_id")` (apos `unidadeCompraId`).
2. Adicionar campo `quantidadeUso Decimal? @db.Decimal(18, 4) @map("quantidade_uso")` (apos `quantidadePorEmbalagem`).
3. Trocar a relacao existente `unidadeCompra UnidadeMedida @relation(fields: ..., references: ...)` para `unidadeCompra UnidadeMedida @relation("ItemCompraUnidadeCompra", fields: [unidadeCompraId], references: [id])`.
4. Adicionar `unidadeUso UnidadeMedida? @relation("ItemCompraUnidadeUso", fields: [unidadeUsoId], references: [id])`.
5. Adicionar `@@index([unidadeUsoId])` apos o `@@index([fornecedorId])` existente.

No modelo `UnidadeMedida` (linha ~125):
6. Renomear `itensCompra ItemCompra[]` para `itensCompraUnidadeCompra ItemCompra[] @relation("ItemCompraUnidadeCompra")`.
7. Adicionar nova linha: `itensCompraUnidadeUso ItemCompra[] @relation("ItemCompraUnidadeUso")`.

NAO alterar `model Item`: `unidadeEstoqueId` e `unidadeUsoPadraoId` permanecem `String?` (D-03 — deprecacao apenas em UI/API, nao schema).

**B) Criar `prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql`**

Conteudo SQL idempotente (copiar estrutura de analogs — `CREATE DIRECTORY` se necessario primeiro):

```sql
-- Phase 8 — Item fornecedor refactor
-- D-01, D-04 (idempotente), D-17 (default unidade_uso = unidade_compra em principais sem backfill prev)
-- Rollback manual: ALTER TABLE "item_compra" DROP COLUMN "unidade_uso_id"; DROP COLUMN "quantidade_uso";

-- 1. Schema changes
ALTER TABLE "item_compra"
  ADD COLUMN IF NOT EXISTS "unidade_uso_id" TEXT,
  ADD COLUMN IF NOT EXISTS "quantidade_uso" DECIMAL(18, 4);

CREATE INDEX IF NOT EXISTS "item_compra_unidade_uso_id_idx" ON "item_compra"("unidade_uso_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'item_compra_unidade_uso_id_fkey'
  ) THEN
    ALTER TABLE "item_compra"
      ADD CONSTRAINT "item_compra_unidade_uso_id_fkey"
      FOREIGN KEY ("unidade_uso_id") REFERENCES "unidade_medida"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Backfill: principais herdam unidade_uso_padrao_id do item; quantidade_uso = 1
UPDATE "item_compra" AS ic
SET "unidade_uso_id" = i."unidade_uso_padrao_id",
    "quantidade_uso" = 1
FROM "item" AS i
WHERE ic."item_id" = i."id"
  AND ic."principal" = true
  AND ic."unidade_uso_id" IS NULL;

-- 3. Promover 1a compra a principal quando item tiver compras mas nenhum principal marcado
WITH candidatos AS (
  SELECT DISTINCT ON (ic."item_id") ic."id", ic."item_id"
  FROM "item_compra" ic
  WHERE NOT EXISTS (
    SELECT 1 FROM "item_compra" ic2
    WHERE ic2."item_id" = ic."item_id" AND ic2."principal" = true
  )
  ORDER BY ic."item_id", ic."criado_em" ASC
)
UPDATE "item_compra" AS ic
SET "principal" = true,
    "unidade_uso_id" = COALESCE(ic."unidade_uso_id", (SELECT "unidade_uso_padrao_id" FROM "item" WHERE "id" = ic."item_id")),
    "quantidade_uso" = COALESCE(ic."quantidade_uso", 1)
FROM candidatos c
WHERE ic."id" = c."id";

-- 4. Fallback: principal sem unidade_uso_padrao_id copia unidade_compra_id + quantidade_uso=1
UPDATE "item_compra"
SET "unidade_uso_id" = "unidade_compra_id",
    "quantidade_uso" = COALESCE("quantidade_uso", 1)
WHERE "principal" = true AND "unidade_uso_id" IS NULL;
```

**C) Regenerar Prisma client**

Rodar `npm run db:generate` (ou equivalente — ver package.json) para atualizar tipos.
Confirmar que `import { ItemCompra } from "@/generated/prisma/client"` ja expoe `unidadeUsoId` e `quantidadeUso`.

**D) Verificacao de schema antes de migrar**

Rodar `npm run typecheck` — vai quebrar em varios arquivos (esperado: presenter, repository, import). Gate para Task 3.
  </action>
  <verify>
    <automated>npm run db:generate 2>&1 | tail -20 && grep -c 'ItemCompraUnidadeUso' prisma/schema.prisma</automated>
  </verify>
  <acceptance_criteria>
    - `prisma/schema.prisma` contem `unidadeUso UnidadeMedida? @relation("ItemCompraUnidadeUso"`
    - `prisma/schema.prisma` contem `unidadeUsoId String? @map("unidade_uso_id")`
    - `prisma/schema.prisma` contem `quantidadeUso Decimal? @db.Decimal(18, 4) @map("quantidade_uso")`
    - `prisma/schema.prisma` contem `itensCompraUnidadeUso ItemCompra[] @relation("ItemCompraUnidadeUso")`
    - `prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql` existe
    - `grep -c 'IF NOT EXISTS' prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql` >= 2 (idempotencia)
    - `grep -c 'ON DELETE SET NULL' prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql` >= 1
    - `npm run db:generate` exits 0 (Prisma client regenerado)
  </acceptance_criteria>
  <done>Schema estendido, migration SQL escrita idempotente, Prisma client regenerado. Typecheck do repositorio ainda quebra — esperado e resolvido na Task 3.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>[BLOCKING] Task 3: Aplicar migration via `docker compose run --rm migrate` + confirmar idempotencia</name>
  <what-built>Migration SQL criada na Task 2. Executor precisa aplica-la no banco Docker Compose canonico e rodar 2x para confirmar idempotencia.</what-built>
  <how-to-verify>
    Checklist mandatorio (executar em ordem):

    1. Backup antes de aplicar (D-04 + R8):
       ```
       ./scripts/ops/backup-db.sh
       ```
       Confirma que arquivo de backup foi gerado em `backups/`.

    2. 1a execucao da migration:
       ```
       docker compose run --rm migrate
       ```
       Comando deve sair com exit 0. Log mostra `Applied migration 202604172100_phase8_item_compra_fornecedor`.

    3. 2a execucao imediata (idempotencia):
       ```
       docker compose run --rm migrate
       ```
       Exit 0. Prisma reporta "No pending migrations" OU re-aplica sem alterar nada (SQL idempotente por `IF NOT EXISTS` + `WHERE ... IS NULL`).

    4. Smoke check manual:
       ```
       docker compose exec db psql -U postgres -d sis_restaurante -c "\d item_compra"
       ```
       Saida deve conter colunas `unidade_uso_id text` e `quantidade_uso numeric(18,4)`.

    5. Rodar integration test:
       ```
       npm run test:integration -- migration-idempotence
       ```
       Spec criado na Task 1 deve sair GREEN (2 testes).

    **Fallback se `docker compose run --rm migrate` nao disponivel** (ambiente do executor sem Docker):
    Rodar `npx prisma migrate deploy` (aplica migrations commitadas) duas vezes e repetir verificacao #5.

    **Se houver prompt interativo que nao pode ser suprimido** (ex.: Prisma perguntando "Apply data loss warning?"):
    flagar plan como bloqueado, nao forcar; reportar ao usuario humano com o prompt exato e aguardar orientacao.
  </how-to-verify>
  <resume-signal>Type "approved" ou cole o output do passo 5 (migration-idempotence verde) para retomar. Se houver erro na migration ou prompt interativo, cole o stderr.</resume-signal>
  <acceptance_criteria>
    - `docker compose run --rm migrate` exits 0 (ou fallback `npx prisma migrate deploy` exits 0)
    - Segunda execucao do comando tambem exits 0 sem alterar dados
    - `npm run test:integration -- migration-idempotence` exits 0
    - Logs anexados ao resume signal confirmam aplicacao sem erro
  </acceptance_criteria>
</task>

<task type="auto" tdd="true">
  <name>Task 4 (GREEN app): Atualizar presenter + repository + Zod + import-actions + regenerar tipos</name>
  <files>src/modules/catalog/server/catalog-prisma-mappers.ts, src/modules/catalog/server/catalog-repository.ts, src/modules/catalog/server/item-form-schema.ts, src/modules/import/server/import-actions.ts, tests/e2e/importacao.spec.ts</files>
  <read_first>
    - src/modules/catalog/server/catalog-prisma-mappers.ts (integral — entender resolveUsageMetrics 82-98 + mapPurchases 100-113)
    - src/modules/catalog/server/catalog-repository.ts (linhas 253-298 queryItem, 469-614 saveItemWithPrisma)
    - src/modules/catalog/server/item-form-schema.ts (integral — entender purchaseSchema + superRefine)
    - src/modules/import/server/import-actions.ts (linhas 65-140)
    - tests/e2e/importacao.spec.ts (integral — entender estrutura atual)
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-RESEARCH.md §§4.3, 4.4, 4.5 + §8.1
    - .planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-PATTERNS.md §§3, 4, 5, 12
  </read_first>
  <action>
**W-02 — commits intermediarios por sub-letter:** Executar Task 4 em 5 commits atomicos (4-A, 4-B, 4-C, 4-D, 4-E) para manter feedback latency < 60s por commit. Cada commit RODA `npm run test:unit -- <scope>` ANTES de avancar ao proximo sub-letter:
- 4-A → commit `feat(08-02): presenter deriva unidadeUso do principal` + `npm run test:integration -- catalog-presenter-derivation`
- 4-B → commit `feat(08-02): repository persiste unidadeUsoId no principal` + `npm run test:integration -- catalog-repository-fornecedor`
- 4-C → commit `feat(08-02): Zod superRefine + remove stockUnit top-level` + `npm run test:unit -- item-form-schema` (ou proxy via ItemForm test)
- 4-D → commit `feat(08-02): import CSV cria defaults unidadeUso` + `npm run test:e2e -- importacao` (se docker disponivel; senao deferir o E2E a Task 4-E)
- 4-E → commit `test(08-02): e2e importacao estende assert D-17` + suite final

Meta: **cada commit < 60s de feedback**; nenhum commit carrega mais de um sub-letter.

**A) `catalog-prisma-mappers.ts` — presenter com derivacao do principal (D-05, D-07)**

1. Estender tipo `CatalogItemRecord` (linhas 11-36): em `compras[]` adicionar `unidadeUso: { codigo: string } | null`.

2. Reescrever `mapPurchases` (linhas 100-113) seguindo o contrato no `<interfaces>` acima:
   - `const primary = item.compras.find((c) => c.principal)`
   - `const primaryUsageUnit = primary?.unidadeUso?.codigo ?? primary?.unidadeCompra.codigo ?? ""`
   - `const primaryUsageQuantity = primary?.quantidadeUso?.toFixed(4) ?? "1.0000"`
   - Dentro do `.map`: derivar `displayUsageUnit`, `displayUsageQuantity`, `fator`, `precoUso` conforme sketch em `<interfaces>`.
   - Incluir novos campos no retorno: `usageUnit`, `usageQuantity`, `usageIsFixedFromPrimary: !isPrimary`.
   - Manter `conversionFactor` e `usagePrice` (substituindo a chamada a `resolveUsageMetrics`).

3. `resolveUsageMetrics` (82-98) pode ser removido ou mantido como helper; se removido, atualizar qualquer outro consumidor (grep).

4. Atualizar `mapItemListRow` (~132-163): quando `preferredPurchase === null`, retornar strings `"--"` em `purchaseQuantity`, `baseUnitCost`, `usagePrice`, `usageUnit`, `conversionFactor`, `supplierName` (em vez de `"0.0000"`, `"-"`, etc. — D-10).

**B) `catalog-repository.ts` — queryItem include + saveItemWithPrisma persistencia (D-03, D-05, D-08)**

1. Em `queryItem` (~266-273), adicionar `unidadeUso: true` no `include.compras.include`.

2. Em `saveItemWithPrisma` (~469-614):
   - Remover da escrita de `Item` (linhas ~508-509, 521-522 — localizar por grep): `unidadeEstoqueId`, `unidadeUsoPadraoId`. Nao passar mais esses campos no `prisma.item.update`/`create`. (D-03: deprecado; permanecem `String?` no schema.)
   - No loop `for (const purchase of input.purchases)` (~linha 571): dentro do `prisma.itemCompra.create`, adicionar:
     ```ts
     unidadeUsoId: purchase.purchaseIsPrimary
       ? (await ensureUnit(tx, purchase.usageUnit!)).id
       : null,
     quantidadeUso: purchase.purchaseIsPrimary
       ? purchase.usageQuantity
       : null,
     ```
   (`ensureUnit` ja existe para `purchaseUnit`; reusar.)

3. Estender `SaveItemInput['purchases'][number]` no tipo TS com `usageUnit?: string` e `usageQuantity?: string`.

**C) `item-form-schema.ts` + consumidores — Zod estendido + remocao deterministica de campos D-09 (SPEC-ITEM-LAYOUT + B-02.2)**

1. No `purchaseSchema` (linhas 17-31) adicionar:
   ```ts
   usageUnit: z.string().trim().optional(),
   usageQuantity: z.string().trim().optional()
   ```

2. No `.superRefine` das `purchases` (linhas ~54-64), APOS o check de `primaryCount`, adicionar:
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
     const qu = Number(primary.usageQuantity);
     if (!primary.usageQuantity || !Number.isFinite(qu) || qu <= 0) {
       context.addIssue({
         code: z.ZodIssueCode.custom,
         message: "Quantidade de uso deve ser maior que zero no fornecedor principal.",
         path: [primaryIdx, "usageQuantity"]
       });
     }
   }
   ```

3. **Remocao deterministica dos campos top-level `stockUnit`, `usageUnit`, `conversionFactor` (D-09) — mandatoria, sem branch condicional.**

   Rodar grep deterministico no executor:
   ```
   rg 'stockUnit:|usageUnit:|conversionFactor:' src/ --type ts
   ```

   Superficies esperadas (patch INLINE nesta task, UMA commit atomica que cobre TODAS):
   - `src/modules/catalog/server/item-form-schema.ts` — definicao top-level (remover `stockUnit`, `usageUnit`, `conversionFactor`; NAO preservar como deprecated com `.optional()` a menos que um unit test existente (state-machine do parser) falhe sem o fallback. Se falhar, adicionar somente `.optional()` + comentario `@deprecated: viveu em top-level ate Phase 8`; senao remocao completa.)
   - `src/modules/catalog/ui/item-form.tsx` — form bindings (`<TextField name="stockUnit" .../>`) — remover; ja coberto por 08-04 se rodar apos, mas este task remove do Zod primeiro; referencias no JSX quebram typecheck e forcam 08-04.
   - `src/modules/catalog/server/catalog-actions.ts` — payload do action (destructure ou spread do Zod output) — remover referencia.
   - `src/modules/catalog/ui/items-listing-view.tsx` — optional getter (se houver leitura dos campos) — remover ou substituir por leitura do presenter derivado.
   - Todas as outras ocorrencias do grep — aplicar mesma remocao em lote. NAO parar no Zod schema.

   **Executor NAO pode deixar nenhuma das superficies acima intocada.** Se typecheck apos o patch indicar um caller que nao esta na lista, patch-lo tambem na mesma commit.

   **Sem conditional preserve-for-compat branch.** Removal e mandatoria; fallback `.optional()` so se uma suite de testes existente (state-machine do Zod parser) falhar sem ele — e mesmo assim com marker `@deprecated` + TODO de remocao.

**D) `import-actions.ts` — D-17 defaults usageUnit + usageQuantity**

No payload dentro de `createOperationalItemImportAction` (linhas ~115-138), objeto em `purchases[0]`:
```ts
purchases: [{
  supplierName: existingItem?.supplierName || "Importacao operacional",
  purchaseUnit: row.purchaseUnit || "un",
  purchaseIsPrimary: true,
  purchaseQuantity: row.purchaseQuantity || "1.0000",
  purchaseCost: row.purchaseCost || "0.0000",
  priceUpdatedAt: row.updatedAt || new Date().toISOString(),
  usageUnit: row.purchaseUnit || "un",   // D-17 — default = unidade de compra
  usageQuantity: "1.0000"                // D-17 — default 1
}]
```

Remover campos top-level `stockUnit/usageUnit/conversionFactor` se ainda presentes.

**D.5) Demo JSON store — paridade com Prisma path (B-01 Q2 RESOLVED lock)**

Atualizar o branch `if (useDemo)` em `src/modules/catalog/server/catalog-repository.ts` (e/ou os helpers `toItemDetail` / `toItemListRow` do demo data) para espelhar a derivacao Prisma do presenter:

1. Demo data deve suportar N fornecedores por item (array `purchases` com 1 principal + secundarios), nao single-row.
2. Na leitura do demo path, aplicar o MESMO algoritmo que `mapPurchases` (definido no passo A deste task):
   - Localizar `primary = purchases.find(c => c.purchaseIsPrimary)`
   - Secundarios recebem `usageUnit = primary.usageUnit`, `usageQuantity = primary.usageQuantity`, `usageIsFixedFromPrimary = true`
   - Fator e precoUso derivados por fornecedor usando seus proprios `purchaseQuantity`/`purchaseCost`
3. `toItemListRow` do demo path retorna `"--"` quando nao ha principal (D-10 parity com 08-06 mapItemListRow).
4. Garantir que `npm run dev` (sem DB) continua funcional com multi-fornecedor.

**Arquivo(s) afetado(s) adicional(is):** `src/modules/catalog/server/catalog-repository.ts` (branch demo) E/OU `src/modules/catalog/server/demo-data.ts` (se a derivacao for delegada ali). Grep `useDemo\|isDemoMode\|demoStore` para localizar entry points.

Sem teste integration (demo store nao usa Prisma); cobrir via smoke manual: `npm run dev` com `DEMO_MODE=true` → abrir item com 2 fornecedores em fixture → confirmar derivacao identica ao path Prisma (badge "fixado do 1o fornecedor" visivel, fator correto).

**E) Estender `tests/e2e/importacao.spec.ts` — D-17 assert**

Adicionar ao final do spec existente (apos o assert de criacao do item via CSV): assert via `page.goto()` na tela de item de que a row principal exibe `Unidade de uso = Unidade de compra` e `Quantidade de uso = 1,0000`. Seguir padrao `selectMuiOption`, `uniqueName` ja existente no spec.

**F) Validar:** rodar os tres specs Wave 0:
```
npm run typecheck
npm run test:integration -- catalog-repository-fornecedor
npm run test:integration -- catalog-presenter-derivation
npm run test:e2e -- importacao
```

Todos devem sair GREEN apos as mudancas acima.
  </action>
  <verify>
    <automated>npm run typecheck && npm run test:integration -- catalog-repository-fornecedor && npm run test:integration -- catalog-presenter-derivation</automated>
  </verify>
  <acceptance_criteria>
    - `npm run typecheck` exits 0
    - `grep -c 'usageIsFixedFromPrimary' src/modules/catalog/server/catalog-prisma-mappers.ts` >= 1
    - `grep -c 'find.*principal' src/modules/catalog/server/catalog-prisma-mappers.ts` >= 1 (derivacao do principal)
    - `grep -c 'unidadeUso: true' src/modules/catalog/server/catalog-repository.ts` >= 1 (include)
    - `grep -c 'Unidade de uso obrigatoria no fornecedor principal' src/modules/catalog/server/item-form-schema.ts` >= 1 (Zod refine D-08)
    - `grep -c "usageQuantity: \"1.0000\"" src/modules/import/server/import-actions.ts` >= 1 (D-17 default)
    - `! grep -nE '^[[:space:]]*(unidadeEstoqueId|unidadeUsoPadraoId)' src/modules/catalog/server/catalog-repository.ts` (zero linhas de escrita fora de comentarios; qualquer ocorrencia remanescente deve ser exclusivamente em JSDoc comment-only e deve ser documentada no SUMMARY)
    - `npm run test:integration -- catalog-repository-fornecedor` exits 0 (7 testes passam)
    - `npm run test:integration -- catalog-presenter-derivation` exits 0 (3 testes passam)
    - `npm run test:e2e -- importacao` exits 0
    - Demo path (B-01 Q2): `if (useDemo)` em catalog-repository.ts espelha mapPurchases — grep `usageIsFixedFromPrimary` na secao demo retorna >= 1 ocorrencia; smoke manual `npm run dev` com multi-fornecedor render correto
  </acceptance_criteria>
  <done>Presenter deriva secundarios do principal, repository persiste unidadeUsoId/quantidadeUso apenas no principal, Zod valida, import cria defaults, regressao importacao spec estendido e verde.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Migration SQL -> production DB | Schema change + backfill irreversivel em prod |
| CSV import -> server action -> DB | Input CSV nao confiavel; campos numericos e de unidade podem ser invalidos |
| Client form -> server action (Zod) -> repository | Payload de purchases[] nao validado se Zod refine incompleto |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-02-01 | Tampering | migration rollback perde dados | mitigate | scripts/ops/backup-db.sh executado antes do migrate (D-04 + R8); release notes Plan 08-07 explicita sequencia |
| T-08-02-02 | Info Disclosure | SQL raw em migration permite privilege escalation | accept | SQL review manual pelo executor; Prisma migrate usa usuario dedicado sem acesso a outras DBs; self-hosted restringe blast radius |
| T-08-02-03 | Tampering | CSV malformado (UTF-8 invalido, null bytes, numeros com unicode homoglyphs) | mitigate | Parser existente do import ja sanitiza; nova derivacao usageUnit=purchaseUnit nao adiciona superficie — reusa o mesmo input ja validado |
| T-08-02-04 | Tampering | Payload purchases[] com 2 principais ou principal sem usageUnit | mitigate | Zod superRefine rejeita antes de chegar ao repository (D-08) — test dedicado na Wave 0 |
| T-08-02-05 | Elevation of Privilege | saveItem aceita itemId arbitrario -> escrita cross-tenant | accept | Plano nao altera authz do saveItem (herdado da Phase 7 via requirePermission em catalog-actions); review de escopo fora da fase |
| T-08-02-06 | Repudiation | backfill UPDATE sem audit log | accept | Migration documentada em docs/qa/2026-04-17-recuperacao-cliente.md; logs DDL do Postgres cobrem rastreio; self-hosted sem compliance SOX |
</threat_model>

<verification>
- `prisma/schema.prisma` valida: `npx prisma validate` exits 0
- Migration aplica 2x sem erro: `docker compose run --rm migrate` (ou fallback) x 2
- `npm run typecheck` exits 0
- `npm run test:integration -- migration-idempotence` exits 0
- `npm run test:integration -- catalog-repository-fornecedor` exits 0 (7 testes)
- `npm run test:integration -- catalog-presenter-derivation` exits 0 (3 testes)
- `npm run test:e2e -- importacao` exits 0 (regressao + assert D-17)
- Integracao Phase 7 nao regride: `npm run test:e2e -- engineering-flow` exits 0
</verification>

<success_criteria>
1. Schema estendido com unidadeUsoId + quantidadeUso + alias relations (ItemCompraUnidadeCompra, ItemCompraUnidadeUso) em prisma/schema.prisma.
2. Migration 202604172100_phase8_item_compra_fornecedor aplicada via `docker compose run --rm migrate`, idempotente, com backfill para itens existentes.
3. Presenter mapPurchases deriva unidadeUso + quantidadeUso para secundarios do principal (flag usageIsFixedFromPrimary).
4. Zod superRefine rejeita principal sem usageUnit/usageQuantity (D-08).
5. Import CSV cria ItemCompra principal com defaults unidade_uso_id = unidade_compra_id e quantidade_uso = 1 (D-17).
6. 3 integration specs (migration-idempotence, catalog-repository-fornecedor, catalog-presenter-derivation) GREEN.
7. E2E importacao estendida GREEN.
8. Zero regressao: engineering-flow E2E continua GREEN.
</success_criteria>

<output>
Apos completar, criar `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-02-schema-migracao-import-SUMMARY.md`
</output>
</content>
</invoke>