-- CreateEnum
CREATE TYPE "ImportacaoStatus" AS ENUM (
  'pendente',
  'processando',
  'concluida',
  'concluida_com_conflitos',
  'falha'
);

-- CreateEnum
CREATE TYPE "ImportacaoLinhaStatus" AS ENUM (
  'pending',
  'imported',
  'conflict',
  'skipped'
);

-- CreateTable
CREATE TABLE "importacao_execucao" (
  "id" TEXT NOT NULL,
  "origem_arquivo" TEXT NOT NULL,
  "hash_arquivo" TEXT,
  "status" "ImportacaoStatus" NOT NULL DEFAULT 'pendente',
  "resumo_json" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizado_em" TIMESTAMP(3),

  CONSTRAINT "importacao_execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao_staging" (
  "id" TEXT NOT NULL,
  "execucao_id" TEXT NOT NULL,
  "entidade" TEXT NOT NULL,
  "chave_externa" TEXT NOT NULL,
  "sheet_name" TEXT,
  "row_number" INTEGER,
  "payload_json" JSONB NOT NULL,
  "status" "ImportacaoLinhaStatus" NOT NULL DEFAULT 'pending',
  "item_id" TEXT,
  "ficha_tecnica_id" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "importacao_staging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao_conflito" (
  "id" TEXT NOT NULL,
  "execucao_id" TEXT NOT NULL,
  "staging_id" TEXT,
  "tipo" TEXT NOT NULL,
  "raw_name" TEXT,
  "normalized_name" TEXT,
  "sheet_name" TEXT,
  "row_number" INTEGER,
  "confidence" DECIMAL(5,4),
  "detalhes_json" JSONB,
  "resolvido" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "importacao_conflito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "importacao_staging_execucao_id_entidade_chave_externa_key"
  ON "importacao_staging" ("execucao_id", "entidade", "chave_externa");

-- CreateIndex
CREATE INDEX "importacao_staging_sheet_name_row_number_idx"
  ON "importacao_staging" ("sheet_name", "row_number");

-- CreateIndex
CREATE INDEX "importacao_staging_status_idx"
  ON "importacao_staging" ("status");

-- CreateIndex
CREATE INDEX "importacao_conflito_tipo_resolvido_idx"
  ON "importacao_conflito" ("tipo", "resolvido");

-- CreateIndex
CREATE INDEX "importacao_conflito_sheet_name_row_number_idx"
  ON "importacao_conflito" ("sheet_name", "row_number");

-- AddForeignKey
ALTER TABLE "importacao_staging"
  ADD CONSTRAINT "importacao_staging_execucao_id_fkey"
  FOREIGN KEY ("execucao_id") REFERENCES "importacao_execucao"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_staging"
  ADD CONSTRAINT "importacao_staging_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "item"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_staging"
  ADD CONSTRAINT "importacao_staging_ficha_tecnica_id_fkey"
  FOREIGN KEY ("ficha_tecnica_id") REFERENCES "ficha_tecnica"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_conflito"
  ADD CONSTRAINT "importacao_conflito_execucao_id_fkey"
  FOREIGN KEY ("execucao_id") REFERENCES "importacao_execucao"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_conflito"
  ADD CONSTRAINT "importacao_conflito_staging_id_fkey"
  FOREIGN KEY ("staging_id") REFERENCES "importacao_staging"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
