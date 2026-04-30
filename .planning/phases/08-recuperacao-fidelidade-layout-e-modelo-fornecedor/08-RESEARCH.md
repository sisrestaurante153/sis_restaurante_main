# Phase 8: Recuperacao fidelidade layout e modelo fornecedor - Research

**Researched:** 2026-04-17
**Domain:** Next.js 15 / React 19 / Prisma 7 / PostgreSQL — refactor de modelo de dados de item + fidelidade pixel-perfect de 4 telas
**Confidence:** HIGH (todas as decisoes ja trancadas em CONTEXT.md D-01..D-19; pesquisa confirma viabilidade no codigo atual e mapeia arquivos/funcoes exatos)
**Linguagem:** pt-BR (consumo interno, alinhado ao CONTEXT.md)

---

## 1. Phase Summary

Refactor do modelo de dados de item para deslocar unidade/qtde/preco do item mestre (`Item`) para `ItemCompra` por fornecedor (com unidade de uso e quantidade de uso **derivadas do principal** na leitura), casado com fidelidade pixel-perfect aos 4 HTMLs aprovados em `update/*.html`. A fase tambem fecha os 5 bugs de NaN/null do Quadro Final (PDFV2-CRIT-03..07), adiciona o banner "ingrediente ja aparece em ficha semelhante" (PDFV2-FICHA-07), re-valida as 18 entregas de `pendencias-v3` e empacota a entrega como ZIP para homologacao async (nao ha demo). Stack confirmada como Next 15.1.11 + React 19 + Prisma 7.5 + PostgreSQL + MUI 7 + Zod 4 + Playwright 1.55 + Vitest 3 (verificado via `package.json`).

**Recomendacao primaria:** seguir rigorosamente a ordem D-19 (NaN → schema → UI fornecedor → Identificacao enxuta → ficha fidelidade → grades → checklists+ZIP). Cada plano consome sem refatorar a base da Phase 7 + pendencias-v3.

---

## 2. Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-ITEM-FORNECEDOR | Bloco 2 com Fornecedor 1 principal + N; unidade/qtde de uso, fator, preco de uso por card | Secao 4 (schema) + Secao 5 (UI fornecedor) |
| SPEC-ITEM-LAYOUT | Identificacao enxuta sem unidade/qtde/preco soltos | Secao 6 (item-form) |
| SPEC-FICHA-FIDELIDADE | Ficha Tecnica bate com `tela-ficha-tecnica-v2.html` | Secao 7 (ficha fidelidade + banner PDFV2-FICHA-07) |
| SPEC-4-TELAS-ESTRITO | 4 telas pixel-perfect | Secao 9 (checklists) |
| PDFV2-CRIT-03 | Venda de referencia nunca `R$ NaN` | Secao 3 (NaN guards) |
| PDFV2-CRIT-04 | SESSION_SECRET sem fallback hardcoded (ja resolvido em `f01a522`, so confirmar) | Secao 3 |
| PDFV2-CRIT-05 | CMV total com "Calcular peso" quando Peso Final ausente | Secao 3 |
| PDFV2-CRIT-06 | Margem de contribuicao com fallback coerente | Secao 3 |
| PDFV2-CRIT-07 | CMV da marmita sem divisao invalida | Secao 3 |
| PDFV2-FICHA-07 | Banner "ingrediente ja aparece em ficha semelhante" | Secao 7.2 |
| PDFV2-ITEM-05 | Remover cards laterais de rastreabilidade; usar largura principal | Secao 6 (efeito colateral da reescrita do layout) |

---

## 3. Plan Area A — NaN/null guards (D-14, blast radius minimo, PRIMEIRO plano)

**Arquivo alvo:** `src/modules/engineering/ui/TotaisIndicadores.tsx`.

**Estado atual (bom, mas incompleto):** ja possui `parseFiniteMetric`, `formatMetricValue` retornando `"--"` quando null. `formatCurrency`, `formatPercent`, `formatFactorValue` usam esse pipeline. Guards principais funcionam. **Gaps a cobrir na fase:**

| Criterio | Localizacao atual | Fix necessario |
|----------|------------------|----------------|
| CRIT-03 (Venda de referencia nunca `R$ NaN`) | `operationalReading` linha 307 (`formatCurrency(summary.referencePrice)`) | Verificar que `summary.referencePrice` computado no `components-editor.tsx` nunca produz string `"NaN"` apos split invalido; se `salePriceInput` for `""` ou `"abc"`, presenter deve setar `referencePrice = null` e UI exibira `--` ✓ ja funciona, mas testar unit. |
| CRIT-05 (CMV total com "Calcular peso") | linhas 199-219, metrics `costWithoutPackagingPerKg`, `costWithPackagingPerKg`, `finalAppliedCmv` — exibem `--` quando null | Substituir o `--` por literal `"Calcular peso"` quando `postCookingWeight === "--"` (sem Peso Final). Nova condicional no `formatMetricValue` ou branch dedicado. |
| CRIT-06 (Margem de contribuicao fallback) | linha 272, `formatCurrency(summary.contributionMarginValue)` | Quando `salePriceInput === ""` ou `<= 0`, exibir `"Informe o valor"` em vez de `--`. Condicional no call site. |
| CRIT-07 (CMV da marmita sem divisao invalida) | `costWithPackagingPerKg` / `finalAppliedCmv` quando `peso_final_informado` ausente/zero | Mesma logica CRIT-05: literal `"Calcular peso"`. |
| CRIT-04 (SESSION_SECRET) | `src/modules/platform/server/env.ts` | Verificar commit `f01a522`: `getServerEnv()` deve lancar erro explicito se var ausente, sem fallback. Se ja implementado, **plano apenas confirma e adiciona teste**, nao re-implementa. |

**Sketch de UI condicional:**

```tsx
// TotaisIndicadores.tsx dentro de costsAndCmv
const weightMissing = summary.postCookingWeight === "--" || summary.postCookingWeight === "" || !Number.isFinite(Number(summary.postCookingWeight));
const cmvWithoutPackagingLabel = weightMissing
  ? "Calcular peso"
  : formatMetricValue(summary.costWithoutPackagingPerKg, (parsed) => `${currencyFormatter.format(parsed)} / kg`);
metricRow("CMV sem embalagem", cmvWithoutPackagingLabel);
// idem para CMV com Embalagem e CMV final aplicado
```

```tsx
// Margem de contribuicao (CRIT-06)
const salePriceValid = parseFiniteMetric(salePriceInput) !== null && Number(salePriceInput) > 0;
const marginValue = salePriceValid
  ? formatCurrency(summary.contributionMarginValue)
  : "Informe o valor";
metricRow("Margem de contribuicao R$", marginValue, { highlight: true });
```

**Testes (unit, Vitest):**
- `src/tests/unit/engineering/TotaisIndicadores.test.tsx`:
  - `peso_final ausente` → "Calcular peso" em CMV sem embalagem, CMV com embalagem, CMV final aplicado
  - `salePriceInput = ""` → "Informe o valor" em Margem de contribuicao R$
  - Todos os `metricRow` com input invalido → nunca retorna string contendo `NaN` / `null` / `undefined`
- `src/tests/unit/platform/env.test.ts`: `SESSION_SECRET` ausente em production → throw.

---

## 4. Plan Area B — Schema + migracao (D-01, D-02, D-03, D-04)

### 4.1 Prisma schema (`prisma/schema.prisma`)

**Alteracoes em `model ItemCompra` (linhas 210-230):**

```prisma
model ItemCompra {
  id                     String        @id @default(cuid())
  itemId                 String        @map("item_id")
  fornecedorId           String        @map("fornecedor_id")
  unidadeCompraId        String        @map("unidade_compra_id")
  unidadeUsoId           String?       @map("unidade_uso_id")            // NOVO — nullable; obrigatorio somente no principal (validado na aplicacao)
  principal              Boolean       @default(false)
  quantidadePorEmbalagem Decimal       @db.Decimal(18, 4) @map("quantidade_por_embalagem")
  quantidadeUso          Decimal?      @db.Decimal(18, 4) @map("quantidade_uso")            // NOVO — nullable; obrigatorio somente no principal
  custoCompra            Decimal       @db.Decimal(18, 4) @map("custo_compra")
  custoUnitarioBase      Decimal       @db.Decimal(18, 6) @map("custo_unitario_base")
  dataAtualizacaoPreco   DateTime?     @map("data_atualizacao_preco")
  observacao             String?
  criadoEm               DateTime      @default(now()) @map("criado_em")
  atualizadoEm           DateTime      @updatedAt @map("atualizado_em")
  item                   Item          @relation(fields: [itemId], references: [id], onDelete: Cascade)
  fornecedor             Fornecedor    @relation(fields: [fornecedorId], references: [id])
  unidadeCompra          UnidadeMedida @relation("ItemCompraUnidadeCompra", fields: [unidadeCompraId], references: [id])
  unidadeUso             UnidadeMedida? @relation("ItemCompraUnidadeUso", fields: [unidadeUsoId], references: [id])  // NOVO

  @@unique([itemId, fornecedorId, unidadeCompraId])
  @@index([fornecedorId])
  @@index([unidadeUsoId])
  @@map("item_compra")
}
```

**Importante:** `UnidadeMedida` hoje tem `itensCompra ItemCompra[]` sem alias (linha 125). Precisa de rename para `itensCompraUnidadeCompra ItemCompra[] @relation("ItemCompraUnidadeCompra")` e adicionar `itensCompraUnidadeUso ItemCompra[] @relation("ItemCompraUnidadeUso")`. **Blast radius controlado** — nenhum caller usa o backref por nome; so o Prisma client regenera.

**Alteracoes em `model Item` (D-03):** `unidadeEstoqueId` e `unidadeUsoPadraoId` ja sao `String?` (linhas 71-72). **Nao alterar schema**, apenas parar de escrever nesses campos em `saveItemWithPrisma`. Drop fisico fica deferido (D-03 locked).

**Fator de conversao (D-02):** NENHUMA coluna adicionada. Presenter calcula `fator = quantidadeCompra / quantidadeUso` na leitura.

### 4.2 Migration SQL (`prisma/migrations/202604172100_phase8_item_compra_fornecedor/migration.sql`)

```sql
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

-- 2. Backfill idempotente: principais herdam unidade_uso_padrao_id do item; quantidade_uso = 1
UPDATE "item_compra" AS ic
SET "unidade_uso_id" = i."unidade_uso_padrao_id",
    "quantidade_uso" = 1
FROM "item" AS i
WHERE ic."item_id" = i."id"
  AND ic."principal" = true
  AND ic."unidade_uso_id" IS NULL;

-- 3. Promover 1o compra a principal quando item tiver compras mas nenhum principal marcado
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

-- 4. Fallback: unidade_uso_id IS NULL apos backfill (item sem unidade_uso_padrao_id) — copia unidade_compra_id
UPDATE "item_compra"
SET "unidade_uso_id" = "unidade_compra_id",
    "quantidade_uso" = COALESCE("quantidade_uso", 1)
WHERE "principal" = true AND "unidade_uso_id" IS NULL;
```

**Idempotencia:** passos 1, 2, 3 e 4 usam `IF NOT EXISTS` / `WHERE ... IS NULL` — rodar 2x nao altera estado. **Exec canonico:** `docker compose run --rm migrate` (D-04, padrao Phase 7 confirmado em `202604022030_phase7_docker_alignment/migration.sql`).

**Reversao:** SQL de rollback em comentario no topo (nao `DOWN` automatico — Prisma 7 usa migrate deploy forward-only): `ALTER TABLE "item_compra" DROP COLUMN "unidade_uso_id"; DROP COLUMN "quantidade_uso";`. Documentar em `docs/qa/2026-04-17-recuperacao-cliente.md`.

### 4.3 Presenter derivation (D-05) — atualizar `catalog-prisma-mappers.ts`

**Mudanca em `mapPurchases` (linhas 100-113):** localizar o principal; para cada compra, derivar `unidadeUso`, `quantidadeUso`, `fator`, `usagePrice`:

```ts
function mapPurchases(item: CatalogItemRecord) {
  const primary = item.compras.find((c) => c.principal);
  const primaryUnidadeUso = primary?.unidadeUso?.codigo ?? primary?.unidadeCompra.codigo ?? "";
  const primaryQtdeUso = primary?.quantidadeUso?.toFixed(4) ?? "1.0000";

  return item.compras.map((purchase) => {
    const isPrimary = purchase.principal;

    // Secundarios: fixado do principal (D-05). Principal: valores proprios.
    const unidadeUsoCodigo = isPrimary
      ? (purchase.unidadeUso?.codigo ?? primary?.unidadeCompra.codigo ?? "")
      : primaryUnidadeUso;
    const quantidadeUso = isPrimary
      ? (purchase.quantidadeUso?.toFixed(4) ?? "1.0000")
      : primaryQtdeUso;

    // Fator = quantidadeCompra / quantidadeUso (D-02). Por fornecedor usa *seus proprios* valores (D-07).
    const qtdeCompraNum = Number(purchase.quantidadePorEmbalagem);
    const qtdeUsoNum = Number(quantidadeUso);
    const fator = qtdeUsoNum > 0 ? qtdeCompraNum / qtdeUsoNum : 1;
    const precoUso = fator > 0 ? Number(purchase.custoCompra) / fator : Number(purchase.custoCompra);

    return {
      id: purchase.id,
      supplierName: purchase.fornecedor.nome,
      purchaseUnit: purchase.unidadeCompra.codigo,
      purchaseIsPrimary: isPrimary,
      purchaseQuantity: purchase.quantidadePorEmbalagem.toFixed(4),
      purchaseCost: purchase.custoCompra.toFixed(4),
      usageUnit: unidadeUsoCodigo,            // NOVO
      usageQuantity: quantidadeUso,           // NOVO (derivado para secundarios)
      conversionFactor: fator.toFixed(4),     // derivado
      usagePrice: precoUso.toFixed(4),        // derivado por fornecedor (D-07)
      usageIsFixedFromPrimary: !isPrimary,    // NOVO — flag para badge UI (D-05)
      baseUnitCost: purchase.custoUnitarioBase.toFixed(6),
      priceUpdatedAt: purchase.dataAtualizacaoPreco?.toISOString().slice(0, 10) ?? "",
      notes: purchase.observacao ?? ""
    };
  });
}
```

**Tipo `CatalogItemRecord` (linhas 11-36) precisa extensao:** `compras[].unidadeUso: UnidadeMedida | null` (relacao nova). `queryItem` include em `catalog-repository.ts` linha 268-273: adicionar `unidadeUso: true` no include de `compras`.

### 4.4 Repositorio: `saveItemWithPrisma` (catalog-repository.ts linhas 469-614)

**Mudancas necessarias:**
1. Extender `SaveItemInput.purchases[]` com `usageUnit: string`, `usageQuantity: string` (opcionais nos secundarios, obrigatorios no principal).
2. No loop `for (const purchase of input.purchases)` (linha 571), persistir os novos campos:

```ts
await tx.itemCompra.create({
  data: {
    itemId: item.id,
    fornecedorId: supplier.id,
    unidadeCompraId: purchaseUnit.id,
    unidadeUsoId: purchase.purchaseIsPrimary
      ? (await ensureUnit(tx, purchase.usageUnit)).id
      : null,                                    // D-08: secundarios ignoram
    principal: purchase.purchaseIsPrimary,
    quantidadePorEmbalagem: purchase.purchaseQuantity,
    quantidadeUso: purchase.purchaseIsPrimary ? purchase.usageQuantity : null,
    custoCompra: purchase.purchaseCost,
    custoUnitarioBase: calculateCanonicalUnitCost(
      purchase.purchaseCost,
      purchase.purchaseQuantity,
      purchase.purchaseUnit
    ).toString(),
    dataAtualizacaoPreco: parsePurchaseUpdatedAt(purchase.priceUpdatedAt)
  }
});
```

3. Remover da persistencia do `Item`: `unidadeEstoqueId` e `unidadeUsoPadraoId` (linhas 508-509, 521-522) — ainda nullable no schema, apenas nao escreve mais. Manter leitura via fallback do principal (se codigo legado ainda referenciar, cai no presenter).

### 4.5 Zod schema (`item-form-schema.ts`)

Extender `purchaseSchema`:

```ts
const purchaseSchema = z.object({
  supplierName: z.string().trim().min(1, "Fornecedor obrigatorio."),
  purchaseUnit: z.string().trim().min(1, "Unidade de compra obrigatoria."),
  purchaseIsPrimary: z.boolean().default(false),
  purchaseQuantity: positiveDecimal,
  purchaseCost: positiveDecimal,
  priceUpdatedAt: z.string().trim().min(1, "Data de atualizacao obrigatoria."),
  usageUnit: z.string().trim().optional(),       // obrigatorio so no principal (superRefine)
  usageQuantity: z.string().trim().optional(),   // obrigatorio so no principal
});
```

`superRefine` em `itemFormSchema.purchases` (hoje linha 54):
- `primaryCount === 1` (ja existe, manter)
- **NOVO:** para o row com `purchaseIsPrimary === true`, exigir `usageUnit` e `usageQuantity > 0`; adicionar `ZodIssueCode.custom` com `path: ["purchases", idx, "usageUnit" | "usageQuantity"]` quando vazio/invalido (D-08).
- **NOVO:** secundarios — `usageUnit` e `usageQuantity` se presentes, sao ignorados (presenter deriva); nao adiciona issue.

Remover do `itemFormSchema` top-level: `stockUnit`, `usageUnit`, `conversionFactor` (D-09, campos agora viram "derivados por fornecedor"). Manter `stockUnit` opcional com default temporario por 1 ciclo para nao quebrar caller ate front migrar — OU remover ja e ajustar `item-form.tsx` no mesmo plano. **Recomendacao:** remover ja, plano B aplica no mesmo PR.

---

## 5. Plan Area C — UI fornecedor (D-11, D-12, estender purchases-editor)

**Arquivo alvo:** `src/modules/catalog/ui/purchases-editor.tsx` (ja entregue em pendencias-v3/07, commit `592d0c8`).

**PRESERVAR:** estrutura de cards, bordas verde `#C0DD97` + bg `#F0F7E8` no principal, bg `#FAFAF9` nos secundarios, labels overline, `IconButton` remover, supplierLabel dinamico, grid `2fr 1fr` no cabecalho, grids `1fr 1fr 1fr` nas linhas de medidas. **Tudo isso ja bate com HTML `tela-item-v1.html` linhas 227-362.**

**ESTENDER:**

1. Novos campos em `PurchaseRow`:
   ```ts
   export interface PurchaseRow {
     supplierName: string;
     purchaseUnit: string;
     purchaseIsPrimary: boolean;
     purchaseQuantity: string;
     purchaseCost: string;
     priceUpdatedAt: string;
     usageUnit: string;              // NOVO
     usageQuantity: string;          // NOVO
     usageIsFixedFromPrimary: boolean; // NOVO (calculado client-side a partir de purchaseIsPrimary + presenca do principal)
   }
   ```

2. No grid de medidas, substituir a linha atual (`Unidade de compra | Qtde compra | Preco`) pelo contrato do HTML — duas linhas:
   - Linha A: `Unidade de compra` + `Unidade de uso` (quando principal: select livre; quando secundario: input readonly com class `calc` + badge `<span>fixado do 1o fornecedor</span>`)
   - Linha B: `Quantidade de compra` + `Quantidade de uso` (mesma regra readonly+badge para secundarios) + `Fator de conversao` (sempre readonly calc verde, hint "Calculado automaticamente.")
   - Linha C: `Preco de compra` + `Preco de uso` (readonly calc verde, hint "Calculado a partir da compra principal.") + slot vazio

3. Badge `fixado do 1o fornecedor`: componente inline proximo ao `<label>`. Estilo: `fontSize: 10, bgcolor: "#EAF3DE", color: "#1B6B2C", border: "0.5px solid #C0DD97", borderRadius: "4px", padding: "1px 6px", ml: 0.75`.

4. Campo readonly verde: herdar do padrao atual de `Preco de uso` (linhas 280-296 do purchases-editor atual ja usam `bgcolor: "#EAF3DE", color: "#1B6B2C"` — replicar para `Unidade de uso`, `Qtde de uso`, `Fator` quando `usageIsFixedFromPrimary === true` ou campo derivado).

5. Derivacao client-side em tempo real:
   ```ts
   const primaryRow = rows.find(r => r.purchaseIsPrimary);
   // Para render dos secundarios:
   const displayUsageUnit = row.purchaseIsPrimary ? row.usageUnit : (primaryRow?.usageUnit ?? "");
   const displayUsageQty = row.purchaseIsPrimary ? row.usageQuantity : (primaryRow?.usageQuantity ?? "");
   const qc = Number(row.purchaseQuantity) || 0;
   const qu = Number(displayUsageQty) || 0;
   const factor = qu > 0 ? qc / qu : null;
   const pu = factor && factor > 0 ? Number(row.purchaseCost) / factor : null;
   ```

6. Serializacao: `<input type="hidden" name="purchasesJson" value={JSON.stringify(rows)} />` (ja existe, linha 124) — agora carrega os novos campos. Zod parser em `item-form-schema.ts` ja consumira via `JSON.parse`.

7. D-06 (troca de principal): no handler que toggla `purchaseIsPrimary`, garantir exatamente 1 principal (reset dos demais para `false`); exibir `Alert severity="info"` inline acima dos cards: `"Campos fixados atualizados a partir de ${newPrimary.supplierName}"` (discreto, desaparece apos 3s ou fica ate proximo toggle).

8. Botao "Adicionar fornecedor" (ja existe, linha 106-121) — manter texto e icone; novo row vem com `purchaseIsPrimary: false`, `usageUnit: ""`, `usageQuantity: ""`.

**Campo `Atualizado em` no HTML tem placeholder `dd/mm/aaaa` em secundarios** — confirmar DatePicker aceita null; editor atual ja faz isso.

---

## 6. Plan Area D — Identificacao enxuta do item (D-09, D-12)

**Arquivo alvo:** `src/modules/catalog/ui/item-form.tsx`.

**Estado atual:** tem 2 `FormSection`: "Identificacao" (Codigo/Nome/Tipo/Categoria/Status/Descricao) + "Descricao e detalhamento operacional" (Unidade compra/Unidade uso/Fator/Qtde Uso/Preco Uso). O HTML `tela-item-v1.html` manda remover toda a segunda secao.

**Mudancas:**

1. **Remover** a segunda `FormSection` (linhas 245-324) inteira — nao existe mais "Descricao e detalhamento operacional" no HTML.
2. **Mover** o `<textarea>` de Descricao para um terceiro bloco `FormSection title="Observacoes"` (espelha Bloco 3 do HTML linhas 374-381), apos o `<PurchasesEditor>`.
3. **Eliminar props derivadas:** `stockUnitValue`, `conversionFactorValue`, `usageQuantity`, `usagePrice`, `syncPurchaseUnit`, `toPositiveNumber`, `formatOperationalMetric`. Tudo isso migra para dentro de `PurchasesEditor`.
4. **Simplificar `ItemFormProps.initialValues`:** remover `stockUnit`, `usageUnit`, `conversionFactor`, `usageQuantity`, `usagePrice` (passam para dentro de `purchases[]`).
5. **Grid na Identificacao:** respeitar HTML linhas 181-219:
   - Row 1 (`grid-template-columns: 140px 1fr 160px`): Codigo 140px | Nome flex | Status 160px
   - Row 2 (`1fr 1fr`): Tipo | Categoria operacional
   Substituir MUI Grid atual `size={{ xs:12, sm:6, md:4 }}` por grid com colunas fixas conforme HTML (ou manter Grid + Grid `size={1.4}/size={fill}` via `flex`).
6. **Remover** o campo Descricao da row 1 da Identificacao (HTML so tem 5 campos: Codigo, Nome, Status, Tipo, Categoria). Descricao fica no Bloco 3.

**Efeito colateral (PDFV2-ITEM-05):** ao remover a segunda `FormSection`, os "cards laterais de rastreabilidade/custos" tambem saem. O plano ja cobre isso implicitamente, mas validar visualmente no checklist.

**Callers afetados:**
- `src/app/itens/[id]/page.tsx` (ou similar) — props `initialValues.stockUnit/usageUnit/...` serao opcionais; remover ou passar dummy. Grep:
  ```bash
  rg "stockUnit:|usageUnit:|conversionFactor:" src/app src/modules
  ```
- `catalog-prisma-mappers.ts` `mapItemDetail` retorna `stock`, `usage` — os consumidores agora podem ignorar; manter no DTO por 1 ciclo (deprecado) ou remover ja. **Recomendacao:** manter no DTO como campos "legacy" mas **nao renderizar** na UI. Drop do DTO fica para depois do drop fisico das colunas.

---

## 7. Plan Area E — Ficha fidelidade (D-13, PDFV2-FICHA-07)

### 7.1 Re-validacao pixel-perfect dos 3 itens entregues em pendencias-v3

**Item 10 (FichaFlatGrid):** arquivo `src/modules/engineering/ui/FichaFlatGrid.tsx`. `GRID_TEMPLATE = "22px minmax(240px, 1fr) 80px 60px 240px 96px 96px 32px"` — **confirmar contra HTML `tela-ficha-tecnica-v2.html` linhas 224-280.** Colunas esperadas no HTML: handle | Item | Qtde | Unidade | Etapa | Custo unit | Custo insumo | del. Se houver divergencia (ex: Qtde 80px vs HTML 72px), ajustar.

**FC/IC coloridos:** `TotaisIndicadores.tsx` linhas 105-116 ja faz `resolveFactorColor` (verde >=100, verm <100, cinza vazio) — **bate com HTML**. Validar larguras e font-weight.

**Botao "Adicionar Coccao Final":** HTML linhas 378-379 mostra botao `btn-cf` aparece quando Coccao Final foi removida; some quando Coccao Final visivel. Logica esperada em `components-editor.tsx`:
   - Existe linha com `stageCode === COCCAO_FINAL_CODE`? esconde o botao: mostra row
   - Nao existe? esconde row: mostra botao "Adicionar Coccao Final"

Validar que `FichaFlatGrid` tem um slot de `cf-row` com grid `CF_GRID_TEMPLATE = "22px minmax(160px, auto) 128px 128px 96px 1fr 32px"` — bate com HTML? HTML usa mesma estrutura (handle + label "Coccao / Preparo Final" + Tipo + Rendimento + IC + empty + del). Inspecionar arquivo `FichaFlatGrid.tsx` completo durante o plano.

**Checklist pixel-perfect (ver secao 9):** larguras de coluna, padding 5px 8px dos inputs de etapa (`font-size:12px`), cor de fundo `#fff`, hints "IC: -- Automatico" em `font-size:10px;color:var(--text-3)`.

### 7.2 Banner PDFV2-FICHA-07 — "ingrediente ja aparece em ficha semelhante"

**Regra (D-13):** ao adicionar componente (item selecionado em `ComponentEditorRow`), sistema busca outras fichas da mesma modalidade/grupo operacional que usam o mesmo `itemComponenteId`. Exibe aviso inline nao-bloqueante.

**Implementacao:**

1. **Nova server action** `src/modules/engineering/server/ficha-similar-lookup.ts`:
   ```ts
   "use server";
   export async function findFichasUsingItem(
     itemComponenteId: string,
     currentFichaId: string | null,
     modalidadeId: string | null
   ): Promise<Array<{ id: string; nomeExibicao: string; modalidadeNome: string | null }>> {
     const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
     if (!prisma) return [];
     return prisma.fichaTecnica.findMany({
       where: {
         id: currentFichaId ? { not: currentFichaId } : undefined,
         status: { in: [FichaStatus.ativa, FichaStatus.rascunho] },
         modalidadeId,  // "semelhante" = mesma modalidade (D-13 Claude's discretion — justificar no plano)
         componentes: { some: { itemComponenteId } }
       },
       select: { id: true, nomeExibicao: true, modalidade: { select: { nome: true } } },
       take: 5
     }).then(rows => rows.map(r => ({
       id: r.id,
       nomeExibicao: r.nomeExibicao ?? "Ficha sem nome",
       modalidadeNome: r.modalidade?.nome ?? null
     })));
   }
   ```

2. **Hook em `components-editor.tsx`:** ao `onChange` do select de item em um row (ja existe handler `updateRow`), disparar `useEffect` que chama a action e popula `state.similarFichas[rowId]`. Renderizar inline abaixo do row: `<Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>Este ingrediente ja aparece em: <Link>{nomeExibicao}</Link></Alert>`. **Nao bloqueante** — usuario pode ignorar.

3. **Criterio de semelhanca (discricao, D-13):** usar `mesma modalidade` como criterio. Justificativa documentada no plano: modalidade e o conceito operacional mais visivel para o cozinheiro; grupo operacional pode ser amplo demais (muitos falsos positivos); item_componente igual + modalidade igual + ficha ativa/rascunho da um filtro com signal/noise aceitavel.

4. **Testes:** E2E Playwright em `tests/e2e/engineering-flow.spec.ts` — criar 2 fichas mesma modalidade com mesmo ingrediente, verificar que a segunda exibe o banner com link para a primeira.

### 7.3 Coccao Final — bloco dedicado ou flag?

**Phase 7 ja implementou como bloco dedicado** (`COCCAO_FINAL_CODE` em `ficha-flat-rows.ts`). HTML linhas 356-376 corrobora: linha separada com label "Coccao / Preparo Final", campo `Tipo de etapa` readonly com valor "Coccao / Preparo", campo `Rendimento da Porcao` com hint "Peso Pos-coccao", IC readonly. **Plano mantem bloco dedicado.** Nao ha necessidade de flag `is_final` — reduz blast radius.

---

## 8. Plan Area F — Grades (D-10)

### 8.1 Grade de itens (`items-listing-view.tsx`)

**Estado atual:** ja possui 15 colunas + badges hex (pendencias-v3/07-03), Fornecedor +N. **Validacao:** confirmar que `ItemRow` consome `supplierCount` derivado em `mapItemListRow` (linhas 138-140 de `catalog-prisma-mappers.ts`) e exibe `+N` quando > 1.

**Ajustes:**
- `purchaseQuantity`, `stockUnit`, `usageQuantity`, `usageUnit`, `conversionFactor`, `baseUnitCost`, `usagePrice` agora vem do presenter derivado do principal — **ja e o comportamento atual** via `selectedPurchase`. Garantir que item sem principal exibe `--`.
- Ordenacao por preco client-side (Phase 7 D-07) — manter.

**Mudancas exatas:**
- Em `mapItemListRow`, quando `preferredPurchase === null` (item sem compra), retornar `usageUnit: "--"`, `purchaseQuantity: "--"`, `baseUnitCost: "--"`, `usagePrice: "--"` em vez de strings numericas. **Alteracao pequena no mapper.**
- UI ja usa `DataGridNumericCell` que deve tolerar "--" (verificar em `data-grid-pattern.tsx`).

### 8.2 Grade de fichas (`fichas-listing-view.tsx` / similar)

**Ja entregue em pendencias-v3.** Checklist pixel-perfect contra `tela-fichas-grade-v1.html` (12 colunas, badge versao inline, FC/IC coloridos, Preco de Venda). Se nao houver mudanca funcional, este plano e **so checklist** (sem codigo).

---

## 9. Plan Area G — Checklists pixel-perfect + ZIP (D-15, D-18)

### 9.1 Estrutura de checklists em `VERIFICATION.md`

Por tela, uma tabela:

```markdown
### tela-item-v1.html — Checklist pixel-perfect

| # | Item | HTML ref | Componente app | Status | Commit |
|---|------|----------|----------------|--------|--------|
| 1 | `.main` max-width 960px | linha 39 | `/itens/[id]/page.tsx` container | ☐ | — |
| 2 | `.card` border 0.5px #D3D1C7, radius 10px, padding 20px 24px | linha 55 | `FormSection` borders | ☐ | — |
| 3 | `.card-label` font-size 10px, letter-spacing .1em, uppercase, color #888780, mb 16px | linha 56 | `FormSection.title` override | ☐ | — |
| 4 | `.field label` 11px/500, color #5F5E5A | linha 70 | MUI `InputLabel` sx | ☐ | — |
| 5 | `.field input` padding 8px 11px, font-size 13px, border 0.5px #D3D1C7, radius 6px | linha 73-77 | MUI TextField sx global | ☐ | — |
| 6 | `.field input.calc` bg #EAF3DE, color #1B6B2C, weight 500, border #C0DD97 | linha 91-93 | readonly derivado | ☐ | — |
| 7 | `.fornecedor-block` border 0.5px #D3D1C7, radius 6px, padding 16px, bg #FAFAF9 | linha 97 | `PurchasesEditor` card | ☐ | — |
| 8 | `.fornecedor-block + .fornecedor-block` bg #F0F7E8, border #C0DD97 | linha 98 | card secundario — ATENCAO: hoje invertido (principal e verde) | ☐ | — |
| 9 | `.tag-fixado` bg #EAF3DE, color #1B6B2C, border 0.5px #C0DD97, radius 4px, padding 1px 6px, font-size 10px | linha 110 | badge componente | ☐ | — |
| 10 | `.add-btn` color #185FA5, font-size 12px | linha 105-107 | botao Adicionar fornecedor | ☐ | — |
| ... | (continuar para cada regra CSS do HTML) | | | ☐ | — |
```

**OBSERVACAO CRITICA descoberta no research:** o HTML linha 98 (`.fornecedor-block + .fornecedor-block { background: #F0F7E8; border-color: #C0DD97; }`) aplica o **verde** aos secundarios (item 2+), mas `purchases-editor.tsx` atual aplica verde ao **principal** (linha 151: `bgcolor: isPrimary ? "#F0F7E8" : "#FAFAF9"`). **Ler o HTML com cuidado:** o primeiro bloco (Fornecedor 1 Principal) e `.fornecedor-block` cinza claro `#FAFAF9`; os seguintes (Fornecedor 2+) herdam `+` selector e ficam verde `#F0F7E8`. **Isto contradiz o comportamento atual.** O planejador precisa confirmar com o usuario se o HTML esta correto ou se a app esta correta; **flag como decisao explicita no plano** (possivel D-20 de plano/discuss se houver duvida).

Gerar checklists analogos para:
- `tela-itens-grade-v2.html` (15 colunas — larguras fixas, ordering, filtros)
- `tela-fichas-grade-v1.html` (12 colunas, badge V{n} inline, FC/IC cores)
- `tela-ficha-tecnica-v2.html` (FichaFlatGrid, Coccao Final, Quadro Final, Montagem)

### 9.2 Checklist de regressao 18 itens pendencias-v3 (D-16)

Em `VERIFICATION.md`, secao separada. Cada item com:
- Descricao do que foi entregue
- Commit original
- Teste de regressao: `npm run test:e2e -- engineering-flow` OU `npm run test:unit -- <specfile>` OU inspecao visual
- Status ☐/✓/✗ apos re-validacao

### 9.3 Pacote ZIP + release notes (D-18)

**Script novo:** `scripts/ops/pack-release.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSION="v1.2-phase8-$(date +%Y%m%d)"
OUT="output/release-${VERSION}.zip"
mkdir -p output
npm run build
zip -r "$OUT" \
  .next public prisma src scripts docs package.json package-lock.json tsconfig.json next.config.ts docker-compose.yml \
  -x "*.log" "*.tsbuildinfo" "node_modules/*" ".git/*" ".next/cache/*"
echo "Release ZIP: $OUT"
```

**Release notes em `docs/qa/2026-04-17-recuperacao-cliente.md`:** ja existe artefato esperado. Conteudo:
- Lista de mudancas por area (schema, UI fornecedor, Identificacao, ficha, grades, NaN guards)
- Instrucoes de homologacao (extrair ZIP, `docker compose up -d db`, `docker compose run --rm migrate`, `npm run db:seed`, `npm start`)
- **4 screenshots comparativos** (HTML vs app lado-a-lado) — executor usa `scripts/ops/capture-ficha-layout.ts` (ja existe, linha 33 do package.json) adaptado para tela-item e tela-itens-grade.
- Changelog de migrations Prisma aplicadas
- Confirmacao de testes verdes (cole output de `npm run typecheck && npm run test:unit && npm run test:e2e -- engineering-flow`).

---

## 10. Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Frameworks | Vitest 3.2.4 (unit + integration), Playwright 1.55 (e2e) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (existem) |
| Quick run commands | `npm run test:unit`, `npm run typecheck` |
| Full suite | `npm run test` (unit + integration + e2e) |
| Migration canonical | `docker compose run --rm migrate` (D-04) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDFV2-CRIT-03 | Venda de referencia nunca `R$ NaN` | unit | `npm run test:unit -- TotaisIndicadores` | ❌ criar Wave 0 |
| PDFV2-CRIT-04 | SESSION_SECRET throw sem fallback | unit | `npm run test:unit -- env` | ⚠ verificar; criar se ausente |
| PDFV2-CRIT-05 | CMV total "Calcular peso" sem peso_final | unit | `npm run test:unit -- TotaisIndicadores` | ❌ Wave 0 |
| PDFV2-CRIT-06 | Margem "Informe o valor" sem preco | unit | idem | ❌ Wave 0 |
| PDFV2-CRIT-07 | CMV marmita sem divisao invalida | unit | idem | ❌ Wave 0 |
| PDFV2-FICHA-07 | Banner ingrediente em ficha semelhante | e2e | `npm run test:e2e -- engineering-flow` | ⚠ estender spec existente |
| SPEC-ITEM-FORNECEDOR | Save com 2 fornecedores preserva unidadeUso derivado | integration | `npm run test:integration -- catalog-repository` | ❌ Wave 0 (spec novo) |
| SPEC-ITEM-LAYOUT | item-form renderiza so 3 blocos (Identificacao/Compras/Observacoes) | unit (RTL) | `npm run test:unit -- ItemForm` | ❌ Wave 0 |
| SPEC-FICHA-FIDELIDADE | FichaFlatGrid grid template bate | unit | `npm run test:unit -- FichaFlatGrid` | ⚠ confirmar existe |
| SPEC-4-TELAS-ESTRITO | Checklist manual | manual-only | — (VERIFICATION.md) | — |
| D-04 migration idempotence | Rodar migration 2x preserva estado | integration | `npm run test:integration -- migrations` | ❌ Wave 0 (spec novo) |
| D-05 presenter derivation | Secundario sem unidadeUso recebe do principal no read | integration | `npm run test:integration -- catalog-presenter` | ❌ Wave 0 |
| D-17 Import CSV → ItemCompra principal | import_actions.ts cria `principal=true` | e2e/integration | `npm run test:e2e -- importacao` | ⚠ estender spec existente |
| 18 itens pendencias-v3 regressao | Nenhuma quebra | e2e | `npm run test:e2e -- engineering-flow` | ✓ existe |

### Sampling Rate (Nyquist)

| Frequencia | O que valida | Quando roda | Artefato |
|-----------|-------------|-------------|----------|
| Per commit / per tarefa | `npm run typecheck && npm run test:unit` (< 60s) | Cada commit de desenvolvedor | Pre-commit hook ou make target |
| Per plano (fim de plano da fase) | `npm run test:unit && npm run test:integration` | Ao fechar cada plano 08-XX | CI local ou docs/qa/<plan>-VERIFY.md |
| Per schema change (D-04) | `docker compose run --rm migrate` + migration idempotence test | Logo apos merge do plano de schema + 1x de confirmacao manual re-executando | Migration log + integration test |
| Per fase (phase gate) | `npm run test` (full) + `engineering-flow.spec.ts` + `importacao.spec.ts` verdes | Antes de gerar ZIP release | VERIFICATION.md + console output |
| Per tela (pixel-perfect) | Checklist manual linha-a-linha contra HTML + 4 screenshots comparativos | Plano G antes de empacotar | VERIFICATION.md checklists + `docs/qa/2026-04-17-recuperacao-cliente.md` screenshots |
| Per presenter change (D-05) | Unit test de derivacao: secundario sem unidadeUso → read retorna unidadeUso do principal | Em cada commit que toca `catalog-prisma-mappers.ts` | `src/tests/integration/catalog-presenter.test.ts` |
| Per UI state change (NaN) | Unit test componente com inputs invalidos → nunca renderiza "NaN"/"null"/"undefined" | Em cada commit que toca `TotaisIndicadores` ou `ficha-flat-rows` | `src/tests/unit/engineering/*.test.tsx` |
| Regressao 18 itens pendencias-v3 | E2E + checklist visual per item | Antes do ZIP | `VERIFICATION.md` secao regressao |
| Import CSV round-trip (D-17) | Importar CSV → ler item → ItemCompra `principal=true` com `unidade_uso_id` + `quantidade_uso=1` | Ao fechar plano de schema | E2E importacao ou integration |

### Wave 0 Gaps (testes a criar antes da implementacao)

- [ ] `src/tests/unit/engineering/TotaisIndicadores.test.tsx` — cobre CRIT-03, 05, 06, 07
- [ ] `src/tests/unit/platform/env.test.ts` — cobre CRIT-04 (confirmar se ja existe; criar se ausente)
- [ ] `src/tests/unit/catalog/ItemForm.test.tsx` — cobre SPEC-ITEM-LAYOUT (render so 3 blocos)
- [ ] `src/tests/integration/catalog/catalog-repository-fornecedor.test.ts` — cobre D-05, D-07, D-08 (save+read roundtrip)
- [ ] `src/tests/integration/prisma/migration-idempotence.test.ts` — cobre D-04 (rodar migration 2x via `docker compose run --rm migrate` e diffar)
- [ ] `src/tests/unit/catalog/purchases-editor.test.tsx` — cobre D-06 (toggle principal reassigna readonly nos secundarios)
- [ ] Estender `tests/e2e/engineering-flow.spec.ts` — adicionar cenario PDFV2-FICHA-07
- [ ] Estender `tests/e2e/importacao.spec.ts` — confirmar que linha importada produz ItemCompra principal com `unidade_uso_id` + `quantidade_uso`

**Framework install:** nenhum — Vitest + Playwright + Prisma ja instalados.

---

## 11. Risks & Landmines

### R1. Dual-path repositorio (Prisma + demo JSON) diverge

Presente em `catalog-repository.ts` (saveItemWithPrisma vs demo store em `toItemDetail`/demo-data.ts). Qualquer nova regra (D-05 derivacao) precisa ser refletida nos dois lados — **ou** o demo store e abandonado para este plano. **Recomendacao:** demo store usa single-row equivalente (`purchases: [...]`), expandir para suportar N com derivacao; OU desabilitar demo store para testes Phase 8 (flag). Decisao do planejador — documentar em plano B.

### R2. Zod schema migration dos payloads — quebra de formulario legado

`item-form-schema.ts` hoje exige `stockUnit`, `usageUnit`, `conversionFactor`. Qualquer cliente que submeta o form antigo (inclusive aba aberta do navegador) quebrara. **Mitigacao:** no save, aceitar `stockUnit/usageUnit/conversionFactor` como opcionais por 1 ciclo (fallback para `undefined`); plano seguinte remove quando confirmado que nao ha front legado em producao.

### R3. Typecheck ripple ao remover campos do DTO de `Item`

`mapItemDetail` retorna `stock.unit`, `usage.unit`, `usage.conversionFactor`, `usage.usageQuantity`, `usage.usagePrice`. Se removidos, varios callers quebram (item-form, items-listing). **Mitigacao:** manter campos no DTO marcados como `@deprecated` (comentario JSDoc), apontando para `purchases[]`; UI nao renderiza mais; drop fisico do DTO em fase posterior junto com o drop das colunas.

### R4. `UnidadeMedida.itensCompra ItemCompra[]` precisa rename p/ alias

Adicionar relation `ItemCompraUnidadeUso` exige mudar `itensCompra` para `itensCompraUnidadeCompra @relation("ItemCompraUnidadeCompra")`. **Efeito:** qualquer `include: { itensCompra: true }` em queries quebra. Grep antes do plano:
```bash
rg "itensCompra\b" src/
```
Provavelmente zero hits (Prisma typed client inclui automaticamente). Se houver hits, rename no caller.

### R5. `@@unique([itemId, fornecedorId, unidadeCompraId])` e o toggle de principal

Cenario: usuario troca unidade_compra de um fornecedor → nova linha (mesma tupla invalida?); atualmente `saveItemWithPrisma` faz `deleteMany + create`, entao o unique e sempre vazio no momento da criacao. **Manter este padrao**, nao migrar para `upsert` por id.

### R6. Migration em producao self-hosted fora do Docker canonico

Usuario (cliente) roda via ZIP, nao via CI. **Mitigacao:** release notes explicitam sequencia: `docker compose up -d db` → `docker compose run --rm migrate` → `npm start`. Se cliente roda fora Docker, adicionar `npm run db:migrate` como alternativa (ja existe em package.json).

### R7. Ficha component sharing (FichaFlatGrid consumido por telas diferentes?)

Grep:
```bash
rg "FichaFlatGrid" src/
```
Se usado so em `components-editor.tsx`, baixo risco; se em outras paginas (ex: pagina preview/print), mudar GRID_TEMPLATE afeta todas. **Verificar antes do plano E.**

### R8. Rollback de migration (D-04 idempotente mas irreversivel de facto)

Prisma 7 nao tem `DOWN`. Rollback requer SQL manual `ALTER TABLE DROP COLUMN`. **Mitigacao:** `ops:backup` (ja existe, linha 35 do package.json) roda `./scripts/ops/backup-db.sh` — orientar release notes para rodar antes do migrate.

### R9. Import CSV (D-17) pode produzir payload invalido no novo schema

`createOperationalItemImportAction` hoje monta payload com `stockUnit`, `usageUnit`, `conversionFactor` como campos soltos (linhas 119-124 de `import-actions.ts`). No novo modelo, `SaveItemInput` muda; import action precisa mover valores para `purchases[0]` como `usageUnit` e `usageQuantity=1`. **Atualizar no mesmo plano de schema ou logo depois** (D-19 ordem 2-3).

### R10. `tela-item-v1.html` linha 98 vs `purchases-editor.tsx` linha 151 — inversao de cor verde

HTML faz secundarios verdes; app hoje faz principal verde. **Decisao:** plano E (checklist) levanta para user confirmar. Se HTML correto, purchases-editor precisa inverter (so 1 linha). Se app correto, atualizar HTML como artefato de referencia.

---

## 12. Testing Strategy

### 12.1 Unit (Vitest + RTL)

- `TotaisIndicadores.test.tsx`: fornece `summary` com varios campos null/NaN/zero/vazio, verifica que render nunca contem `NaN`/`null`/`undefined`; testa condicionais "Calcular peso" e "Informe o valor".
- `ItemForm.test.tsx`: render com e sem `initialValues`; confirma presenca de 3 `FormSection` (Identificacao, Compras, Observacoes); confirma ausencia de campos soltos `stockUnit`/`usageUnit`.
- `purchases-editor.test.tsx`: render com 1 e com 3 rows; toggle de principal; derivacao client-side do `displayUsageUnit` dos secundarios; badge `fixado do 1o fornecedor` presente nos secundarios.
- `FichaFlatGrid.test.tsx`: snapshot do GRID_TEMPLATE; render com + sem Coccao Final; botao aparece/esconde.

### 12.2 Integration (Vitest + Prisma contra PG local via docker-compose)

- `catalog-repository-fornecedor.test.ts`: `saveItem` com 2 purchases (principal + secundario); `getItemDetail` retorna secundario com `usageUnit` = principal.usageUnit (derivado). Inversa tambem: toggle de principal propaga.
- `migration-idempotence.test.ts`: aplica migration; re-aplica; compara `information_schema.columns` antes/depois. Conta linhas com `principal=true` antes e depois do backfill.
- `import-operational-roundtrip.test.ts`: importa CSV com 3 linhas; confirma que `ItemCompra` principal criado com `unidade_uso_id = unidade_compra_id` e `quantidade_uso = 1`.

### 12.3 E2E (Playwright)

- `engineering-flow.spec.ts` (ja existe): adicionar cenario PDFV2-FICHA-07 — criar 2 fichas mesma modalidade, adicionar mesmo ingrediente, verificar banner.
- `importacao.spec.ts` (ja existe): adicionar assert que item importado tem purchase principal com os novos campos.
- Novo: `catalog-item-multi-fornecedor.spec.ts`: fluxo end-to-end de adicionar 2 fornecedores, salvar, recarregar, verificar fixado+readonly.

### 12.4 Pixel-perfect checklist automation scope

**Fora do escopo automatizado** (D-15 deferido: "Screenshot diff automatizado ... baseline para futuro"). Verificacao e manual via `VERIFICATION.md` + screenshots de comparacao. Scripts uteis: `scripts/ops/capture-ficha-layout.ts` (existente) — estender para capturar tela de item.

### 12.5 Regressao pendencias-v3 (D-16)

Matriz de 18 itens em `VERIFICATION.md` secao "Regressao pendencias-v3". Cada item tem:
1. Teste automatico associado (E2E ou unit) — se existir
2. Verificacao manual (descricao do que inspecionar visualmente)
3. Status ☐/✓/✗ com commit sha apos execucao

Execucao do full suite ao menos 1 vez no encerramento de cada plano + 1 vez no phase gate.

---

## 13. Open Questions (RESOLVED)

Todas as 3 questoes originais foram resolvidas via CONTEXT.md + decisoes de planejamento subsequentes:

1. **Cor verde do card de fornecedor (R10):** **RESOLVED** — deferido a 08-03 como `checkpoint:decision` (Task 1.5, reordenada para rodar ANTES da implementacao per W-03 do checker). Default em option-b documentado, mas usuario decide entre inverter (bate HTML) ou manter (atual com divergencia anotada em 08-DIVERGENCES.md).

2. **Demo JSON store:** **RESOLVED** — demo store expandido para suportar N fornecedores espelhando a derivacao Prisma; coberto por 08-02 Task 4 sub-item que atualiza o branch `if (useDemo)` em `catalog-repository.ts` para derivar `unidadeUso/quantidadeUso` nos secundarios a partir do principal (mesmo algoritmo do Prisma path). **Decisao lock:** demo store MANTIDO e ESPELHA o Prisma path — zero desabilitacao; o adapter em `toItemDetail`/`toItemListRow` recebe a mesma logica de derivacao que o presenter (mapPurchases).

3. **Criterio de "ficha semelhante" para PDFV2-FICHA-07:** **RESOLVED** — criterio = `mesma modalidade_id E mesmo item_componente_id` (operador AND, nao OR), status in (ativa, rascunho), ficha atual excluida. Locked em 08-05 Task 2-A server action query (`prisma.fichaTecnica.findMany({ where: { modalidadeId, componentes: { some: { itemComponenteId } }, status: { in: [FichaStatus.ativa, FichaStatus.rascunho] } } })`). Nenhum fallback para "grupo operacional" — se falsos positivos surgirem na homologacao, abrir ticket para phase futura.

---

## 14. Project Constraints (from AGENTS.md)

- Stack obrigatoria: Next.js 15 + React 19 + TypeScript + PostgreSQL + Prisma + MUI/Tailwind + Vitest + Playwright + Docker Compose. **Confirmado** via `package.json`.
- Monolito modular, self-hosted. Nao separar frontend/backend.
- `item` como tabela unica com perfis/tipos — confirmado em schema atual.
- Profundidade de composicao ilimitada — nao afeta Phase 8.
- Separar unidade de compra/estoque/uso com fator — **Phase 8 REFATORA** isso: estoque sai (deprecado, D-03); compra+uso+fator vivem em `ItemCompra` por fornecedor.
- Importacao preserva origem (D-17 reforca).

---

## 15. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `UnidadeMedida.itensCompra` backref nao e usado por nome em nenhum caller | 4.1, R4 | Rename do alias quebra callers — mitigado por grep antes do plano |
| A2 | Commit `f01a522` ja resolve CRIT-04 (SESSION_SECRET) | 3 | Se nao, plano NaN vira 2 tarefas em vez de 1 — facilmente ajustavel |
| A3 | `capture-ficha-layout.ts` gera screenshots comparaveis lado-a-lado | 9.3 | Se script nao comporta item/grades, executor usa Playwright manual screenshots — baixo risco |
| A4 | Prisma 7 aceita relacao opcional com alias sem dor (`ItemCompraUnidadeUso`) | 4.1 | Bem documentado em Prisma; baixo risco |
| A5 | Migration idempotente confirmada por re-execucao sem side-effects | 4.2 | Testado em CI antes do ZIP; mitigado por backup |
| A6 | "Mesma modalidade" e bom discriminador para "ficha semelhante" | 7.2 | Se false positives forem altos, ajuste e trivial |
| A7 | Demo JSON store pode ser adaptado em ~30 linhas para suportar purchases[] | O3 | Se for mais, desabilitar demo store para Phase 8 — sem perda de funcionalidade |
| A8 | 18 itens de pendencias-v3 passam todos sem regressao com as mudancas propostas | 9.2 | Baixo: mudancas sao aditivas no presenter e UI card; grids so consomem derivados ja existentes |

---

## 16. Sources

### Primary (HIGH)
- `prisma/schema.prisma` (codigo atual) — confirmou `ItemCompra` tem `unidadeCompraId`, `principal`, `quantidadePorEmbalagem`, `custoCompra`; nao tem `unidadeUsoId` nem `quantidadeUso`.
- `src/modules/catalog/server/catalog-repository.ts`, `catalog-prisma-mappers.ts`, `catalog-actions.ts`, `item-form-schema.ts` (codigo atual) — confirmaram o pipeline Zod → action → repository → presenter.
- `src/modules/catalog/ui/purchases-editor.tsx` (codigo atual) — confirmou que estrutura de cards ja existe, preservavel, precisa de extensao com unidadeUso + qtdeUso + badge.
- `src/modules/engineering/ui/TotaisIndicadores.tsx` (codigo atual) — confirmou que guardas NaN ja existem em formMetricValue, gaps identificados para CRIT-05, 06.
- `update/tela-item-v1.html` — contrato pixel-perfect (linhas 178-381), incluindo cores `#EAF3DE/#F0F7E8/#C0DD97`, paddings, larguras de grid.
- `update/tela-ficha-tecnica-v2.html` — contrato Coccao Final (linhas 356-376), FichaFlatGrid (linhas 224-354).
- `prisma/migrations/202604022030_phase7_docker_alignment/migration.sql` e `202604022050_phase7_ficha_schema_alignment/migration.sql` — padrao idempotente `DO $$ ... EXISTS ...` a replicar.
- `package.json` — confirmou versoes Prisma 7.5, Next 15.1.11, React 19, Vitest 3.2.4, Playwright 1.55, Zod 4.1.11.
- `.planning/phases/08-recuperacao-fidelidade-layout-e-modelo-fornecedor/08-CONTEXT.md` — decisoes D-01..D-19 locked.
- `.planning/quick/20260417-pendencias-v3/SUMMARY.md` — 18 itens entregues (commits abbcb63..e872872).

### Secondary (MEDIUM)
- `AGENTS.md` — stack obrigatoria e regras de dominio.
- `.planning/REQUIREMENTS.md` — PDFV2-CRIT-03..07, PDFV2-FICHA-07, PDFV2-ITEM-05 status Pending.
- `.planning/STATE.md` — snapshot Phase 7 concluida; dual-path Prisma/demo-json listado como risco estrutural.
- `.planning/ROADMAP.md` §Phase 8 — goal e success criteria.

### Tertiary (LOW)
- Nenhum — todas as fontes sao primarias do proprio projeto.

---

## 17. Metadata

**Confidence breakdown:**
- Schema + migration: HIGH — Prisma schema inspecionado, padrao de migration Phase 7 confirmado.
- Presenter derivation: HIGH — `catalog-prisma-mappers.ts` lido integralmente.
- UI fornecedor: HIGH — `purchases-editor.tsx` lido integralmente; HTML contrato confirmado.
- NaN guards: HIGH — `TotaisIndicadores.tsx` lido; gaps especificos identificados.
- Ficha fidelidade: MEDIUM — `FichaFlatGrid.tsx` inspecionado superficialmente (header); detalhe completo requer leitura completa no plano.
- Banner PDFV2-FICHA-07: MEDIUM — padrao proposto e idiomatic mas nao existe precedente identico no codigo; server action e hook sao novos.
- Import D-17: MEDIUM — `import-actions.ts` inspecionado; mudanca no payload e mecanica.
- Checklists pixel-perfect: HIGH — HTML linha-a-linha avaliado; inversao de cor (R10) identificada como unica descoberta anomala.

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 dias — fase de refactor, HTMLs aprovados sao contrato estavel)

---

## RESEARCH COMPLETE
