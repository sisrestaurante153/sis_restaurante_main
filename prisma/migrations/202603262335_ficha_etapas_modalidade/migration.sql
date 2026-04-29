-- CreateTable
CREATE TABLE "modalidade" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_etapa" (
    "id" TEXT NOT NULL,
    "ficha_tecnica_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "peso_entrada" DECIMAL(18,4),
    "peso_saida" DECIMAL(18,4),
    "fator_correcao" DECIMAL(18,6),
    "indice_coccao" DECIMAL(18,6),
    "valor_total_snapshot" DECIMAL(18,6),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_etapa_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ficha_tecnica"
ADD COLUMN "modalidade_id" TEXT;

-- AlterTable
ALTER TABLE "ficha_componente"
ADD COLUMN "ficha_etapa_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "modalidade_codigo_key" ON "modalidade"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "modalidade_nome_key" ON "modalidade"("nome");

-- CreateIndex
CREATE INDEX "ficha_tecnica_modalidade_id_idx" ON "ficha_tecnica"("modalidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_etapa_ficha_tecnica_id_ordem_key" ON "ficha_etapa"("ficha_tecnica_id", "ordem");

-- CreateIndex
CREATE INDEX "ficha_componente_ficha_etapa_id_idx" ON "ficha_componente"("ficha_etapa_id");

-- AddForeignKey
ALTER TABLE "ficha_tecnica"
ADD CONSTRAINT "ficha_tecnica_modalidade_id_fkey"
FOREIGN KEY ("modalidade_id") REFERENCES "modalidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_etapa"
ADD CONSTRAINT "ficha_etapa_ficha_tecnica_id_fkey"
FOREIGN KEY ("ficha_tecnica_id") REFERENCES "ficha_tecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_componente"
ADD CONSTRAINT "ficha_componente_ficha_etapa_id_fkey"
FOREIGN KEY ("ficha_etapa_id") REFERENCES "ficha_etapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
