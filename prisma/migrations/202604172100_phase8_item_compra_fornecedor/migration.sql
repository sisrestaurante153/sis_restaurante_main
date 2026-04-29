-- Phase 8 — Item fornecedor refactor
-- D-01, D-04 (idempotente), D-17 (default unidade_uso = unidade_compra em principais sem backfill prev)
-- Rollback manual: ALTER TABLE "item_compra" DROP COLUMN "unidade_uso_id"; ALTER TABLE "item_compra" DROP COLUMN "quantidade_uso";

-- 1. Schema changes (idempotentes)
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
