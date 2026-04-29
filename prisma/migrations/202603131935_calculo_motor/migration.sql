-- AlterTable
ALTER TABLE "custo_snapshot_item"
  ADD COLUMN "calculo_execucao_id" TEXT;

-- CreateTable
CREATE TABLE "calculo_execucao" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "ficha_tecnica_id" TEXT,
  "item_gatilho_id" TEXT,
  "motivo" TEXT NOT NULL,
  "custo_anterior" DECIMAL(18,6),
  "custo_novo" DECIMAL(18,6) NOT NULL,
  "quantidade_saida" DECIMAL(18,6) NOT NULL,
  "metadados_json" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "calculo_execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculo_componente_snapshot" (
  "id" TEXT NOT NULL,
  "calculo_execucao_id" TEXT NOT NULL,
  "ficha_componente_id" TEXT,
  "item_componente_id" TEXT NOT NULL,
  "caminho" TEXT NOT NULL,
  "profundidade" INTEGER NOT NULL,
  "tipo_componente" "TipoComponente" NOT NULL,
  "quantidade_bruta" DECIMAL(18,6) NOT NULL,
  "quantidade_liquida" DECIMAL(18,6) NOT NULL,
  "fator_correcao_equivalente" DECIMAL(18,6) NOT NULL,
  "indice_coccao_equivalente" DECIMAL(18,6),
  "custo_direto" DECIMAL(18,6) NOT NULL,
  "custo_herdado" DECIMAL(18,6) NOT NULL,
  "custo_total" DECIMAL(18,6) NOT NULL,
  "percentual_impacto" DECIMAL(18,6),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "calculo_componente_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custo_snapshot_item_calculo_execucao_id_idx"
  ON "custo_snapshot_item" ("calculo_execucao_id");

-- CreateIndex
CREATE INDEX "calculo_execucao_item_id_criado_em_idx"
  ON "calculo_execucao" ("item_id", "criado_em");

-- CreateIndex
CREATE INDEX "calculo_execucao_item_gatilho_id_idx"
  ON "calculo_execucao" ("item_gatilho_id");

-- CreateIndex
CREATE INDEX "calculo_componente_snapshot_calculo_execucao_id_profundidade_idx"
  ON "calculo_componente_snapshot" ("calculo_execucao_id", "profundidade");

-- CreateIndex
CREATE INDEX "calculo_componente_snapshot_item_componente_id_idx"
  ON "calculo_componente_snapshot" ("item_componente_id");

-- AddForeignKey
ALTER TABLE "custo_snapshot_item"
  ADD CONSTRAINT "custo_snapshot_item_calculo_execucao_id_fkey"
  FOREIGN KEY ("calculo_execucao_id") REFERENCES "calculo_execucao"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao"
  ADD CONSTRAINT "calculo_execucao_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "item"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao"
  ADD CONSTRAINT "calculo_execucao_ficha_tecnica_id_fkey"
  FOREIGN KEY ("ficha_tecnica_id") REFERENCES "ficha_tecnica"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao"
  ADD CONSTRAINT "calculo_execucao_item_gatilho_id_fkey"
  FOREIGN KEY ("item_gatilho_id") REFERENCES "item"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_componente_snapshot"
  ADD CONSTRAINT "calculo_componente_snapshot_calculo_execucao_id_fkey"
  FOREIGN KEY ("calculo_execucao_id") REFERENCES "calculo_execucao"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_componente_snapshot"
  ADD CONSTRAINT "calculo_componente_snapshot_ficha_componente_id_fkey"
  FOREIGN KEY ("ficha_componente_id") REFERENCES "ficha_componente"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_componente_snapshot"
  ADD CONSTRAINT "calculo_componente_snapshot_item_componente_id_fkey"
  FOREIGN KEY ("item_componente_id") REFERENCES "item"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manual constraints
ALTER TABLE "calculo_execucao"
  ADD CONSTRAINT "calculo_execucao_quantidade_saida_chk" CHECK ("quantidade_saida" > 0);

ALTER TABLE "calculo_componente_snapshot"
  ADD CONSTRAINT "calculo_componente_snapshot_profundidade_chk" CHECK ("profundidade" > 0),
  ADD CONSTRAINT "calculo_componente_snapshot_quantidade_bruta_chk" CHECK ("quantidade_bruta" >= 0),
  ADD CONSTRAINT "calculo_componente_snapshot_quantidade_liquida_chk" CHECK ("quantidade_liquida" >= 0),
  ADD CONSTRAINT "calculo_componente_snapshot_custo_direto_chk" CHECK ("custo_direto" >= 0),
  ADD CONSTRAINT "calculo_componente_snapshot_custo_herdado_chk" CHECK ("custo_herdado" >= 0),
  ADD CONSTRAINT "calculo_componente_snapshot_custo_total_chk" CHECK ("custo_total" >= 0);
