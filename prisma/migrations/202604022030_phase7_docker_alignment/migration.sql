ALTER TABLE "item_compra"
ADD COLUMN IF NOT EXISTS "principal" BOOLEAN NOT NULL DEFAULT false;

WITH preferred_purchase AS (
  SELECT
    "id",
    "item_id",
    row_number() OVER (
      PARTITION BY "item_id"
      ORDER BY COALESCE("data_atualizacao_preco", "atualizado_em", "criado_em") DESC, "id" ASC
    ) AS purchase_rank
  FROM "item_compra"
),
items_with_primary AS (
  SELECT DISTINCT "item_id"
  FROM "item_compra"
  WHERE "principal" = true
)
UPDATE "item_compra" AS purchase
SET "principal" = true
FROM preferred_purchase
WHERE purchase."id" = preferred_purchase."id"
  AND preferred_purchase.purchase_rank = 1
  AND preferred_purchase."item_id" NOT IN (SELECT "item_id" FROM items_with_primary);

CREATE TABLE IF NOT EXISTS "tipo_etapa" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tipo_etapa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tipo_etapa_codigo_key" ON "tipo_etapa"("codigo");

ALTER TABLE "ficha_etapa"
ADD COLUMN IF NOT EXISTS "tipo_etapa_id" TEXT;

CREATE INDEX IF NOT EXISTS "ficha_etapa_tipo_etapa_id_idx" ON "ficha_etapa"("tipo_etapa_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ficha_etapa_tipo_etapa_id_fkey'
  ) THEN
    ALTER TABLE "ficha_etapa"
    ADD CONSTRAINT "ficha_etapa_tipo_etapa_id_fkey"
    FOREIGN KEY ("tipo_etapa_id")
    REFERENCES "tipo_etapa"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "tipo_etapa" ("id", "codigo", "nome", "ativo", "criado_em", "atualizado_em")
VALUES
  ('stage-type-limpeza_pre_preparo', 'limpeza_pre_preparo', 'Limpeza / Pre-Preparo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('stage-type-coccao_preparo', 'coccao_preparo', 'Coccao / Preparo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('stage-type-montagem', 'montagem', 'Montagem', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO UPDATE
SET
  "nome" = EXCLUDED."nome",
  "ativo" = EXCLUDED."ativo",
  "atualizado_em" = CURRENT_TIMESTAMP;
