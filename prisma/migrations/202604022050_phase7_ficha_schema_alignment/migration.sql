ALTER TABLE "ficha_tecnica"
ADD COLUMN IF NOT EXISTS "nome_exibicao" TEXT,
ADD COLUMN IF NOT EXISTS "unidade_rendimento_id" TEXT;

CREATE INDEX IF NOT EXISTS "ficha_tecnica_unidade_rendimento_id_idx" ON "ficha_tecnica"("unidade_rendimento_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ficha_tecnica_unidade_rendimento_id_fkey'
  ) THEN
    ALTER TABLE "ficha_tecnica"
    ADD CONSTRAINT "ficha_tecnica_unidade_rendimento_id_fkey"
    FOREIGN KEY ("unidade_rendimento_id")
    REFERENCES "unidade_medida"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
