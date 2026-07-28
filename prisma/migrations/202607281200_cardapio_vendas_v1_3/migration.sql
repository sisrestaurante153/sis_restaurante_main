-- Milestone v1.3 — Cardapio, CardapioItem e Venda
-- Escrita a mao (idempotente) em vez de gerada por `prisma migrate dev` para
-- evitar qualquer conexao de escrita/diff contra o banco remoto configurado
-- em DATABASE_URL nesta sessao. Revisar e aplicar via `npm run db:migrate`
-- (ou `prisma migrate deploy`) quando o responsavel confirmar.
-- Rollback manual: DROP TABLE IF EXISTS "cardapio_item"; DROP TABLE IF EXISTS "cardapio"; DROP TABLE IF EXISTS "venda";

CREATE TABLE IF NOT EXISTS "cardapio" (
  "cd_cardapio"     TEXT NOT NULL,
  "cd_restaurante"  TEXT,
  "nm_cardapio"     TEXT NOT NULL,
  "tp_canal"        TEXT NOT NULL,
  "sn_ativo"        BOOLEAN NOT NULL DEFAULT true,
  "ts_criacao"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "ts_atualizacao"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "cardapio_pkey" PRIMARY KEY ("cd_cardapio")
);

CREATE INDEX IF NOT EXISTS "idx_cardapio_restaurante" ON "cardapio"("cd_restaurante");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_restaurante_id_fkey'
  ) THEN
    ALTER TABLE "cardapio"
      ADD CONSTRAINT "cardapio_restaurante_id_fkey"
      FOREIGN KEY ("cd_restaurante") REFERENCES "restaurante"("cd_restaurante")
      ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cardapio_item" (
  "cd_cardapio_item" TEXT NOT NULL,
  "cd_cardapio"       TEXT NOT NULL,
  "cd_item"           TEXT NOT NULL,
  "vl_preco_venda"    DECIMAL(18, 4) NOT NULL,
  "js_dias_semana"    JSONB,
  "sn_ativo"          BOOLEAN NOT NULL DEFAULT true,
  "ts_criacao"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "ts_atualizacao"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "cardapio_item_pkey" PRIMARY KEY ("cd_cardapio_item")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cardapio_item_cardapio_id_item_id_key" ON "cardapio_item"("cd_cardapio", "cd_item");
CREATE INDEX IF NOT EXISTS "idx_cardapio_item_item" ON "cardapio_item"("cd_item");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_item_cardapio_id_fkey'
  ) THEN
    ALTER TABLE "cardapio_item"
      ADD CONSTRAINT "cardapio_item_cardapio_id_fkey"
      FOREIGN KEY ("cd_cardapio") REFERENCES "cardapio"("cd_cardapio")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_item_item_id_fkey'
  ) THEN
    ALTER TABLE "cardapio_item"
      ADD CONSTRAINT "cardapio_item_item_id_fkey"
      FOREIGN KEY ("cd_item") REFERENCES "item"("cd_item")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "venda" (
  "cd_venda"          TEXT NOT NULL,
  "cd_restaurante"    TEXT,
  "cd_item"           TEXT NOT NULL,
  "dt_venda"          DATE NOT NULL,
  "nr_quantidade"     DECIMAL(18, 4) NOT NULL,
  "vl_preco_unitario" DECIMAL(18, 4) NOT NULL,
  "vl_total"          DECIMAL(18, 4) NOT NULL,
  "tp_canal"          TEXT,
  "ds_origem"         TEXT NOT NULL DEFAULT 'manual',
  "ts_criacao"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "venda_pkey" PRIMARY KEY ("cd_venda")
);

CREATE INDEX IF NOT EXISTS "idx_venda_restaurante_data" ON "venda"("cd_restaurante", "dt_venda");
CREATE INDEX IF NOT EXISTS "idx_venda_item_data" ON "venda"("cd_item", "dt_venda");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venda_restaurante_id_fkey'
  ) THEN
    ALTER TABLE "venda"
      ADD CONSTRAINT "venda_restaurante_id_fkey"
      FOREIGN KEY ("cd_restaurante") REFERENCES "restaurante"("cd_restaurante")
      ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venda_item_id_fkey'
  ) THEN
    ALTER TABLE "venda"
      ADD CONSTRAINT "venda_item_id_fkey"
      FOREIGN KEY ("cd_item") REFERENCES "item"("cd_item")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
