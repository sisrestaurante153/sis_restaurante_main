-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('insumo', 'pre_preparo', 'intermediario', 'produto_pronto', 'prato', 'porcao', 'marmita', 'combo', 'embalagem', 'apoio');

-- CreateEnum
CREATE TYPE "UnidadeTipo" AS ENUM ('massa', 'volume', 'contagem');

-- CreateEnum
CREATE TYPE "FichaStatus" AS ENUM ('rascunho', 'ativa', 'inativa', 'arquivada');

-- CreateEnum
CREATE TYPE "ModoRendimento" AS ENUM ('percentual_perda', 'peso_final');

-- CreateEnum
CREATE TYPE "TipoComponente" AS ENUM ('ingrediente', 'embalagem', 'apoio');

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "codigo_interno" TEXT,
    "nome" TEXT NOT NULL,
    "nome_normalizado" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria_operacional" TEXT,
    "tipo_principal" "ItemType" NOT NULL,
    "unidade_estoque_id" TEXT,
    "unidade_uso_padrao_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_alias" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "alias_normalizado" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "confianca" DECIMAL(5,2),
    "validado_por" TEXT,
    "validado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidade_medida" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "UnidadeTipo" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidade_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversao_unidade" (
    "id" TEXT NOT NULL,
    "item_id" TEXT,
    "unidade_origem_id" TEXT NOT NULL,
    "unidade_destino_id" TEXT NOT NULL,
    "fator" DECIMAL(18,6) NOT NULL,
    "observacao" TEXT,
    "origem" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversao_unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_compra" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "unidade_compra_id" TEXT NOT NULL,
    "quantidade_por_embalagem" DECIMAL(18,4) NOT NULL,
    "custo_compra" DECIMAL(18,4) NOT NULL,
    "custo_unitario_base" DECIMAL(18,6) NOT NULL,
    "data_atualizacao_preco" TIMESTAMP(3),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tecnica" (
    "id" TEXT NOT NULL,
    "item_resultante_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "status" "FichaStatus" NOT NULL,
    "modo_rendimento" "ModoRendimento" NOT NULL,
    "percentual_perda" DECIMAL(7,4),
    "peso_final_informado" DECIMAL(18,4),
    "rendimento_porcoes" DECIMAL(18,4),
    "modo_preparo" TEXT,
    "observacoes" TEXT,
    "criada_por_id" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_tecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_componente" (
    "id" TEXT NOT NULL,
    "ficha_tecnica_id" TEXT NOT NULL,
    "item_componente_id" TEXT NOT NULL,
    "tipo_componente" "TipoComponente" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "quantidade_bruta" DECIMAL(18,4) NOT NULL,
    "quantidade_limpa" DECIMAL(18,4),
    "unidade_uso_id" TEXT NOT NULL,
    "fator_correcao" DECIMAL(18,6),
    "indice_coccao" DECIMAL(18,6),
    "custo_unitario_snapshot" DECIMAL(18,6),
    "custo_total_snapshot" DECIMAL(18,6),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custo_snapshot_item" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "custo_unitario_atual" DECIMAL(18,6) NOT NULL,
    "custo_por_kg_ou_unidade_uso" DECIMAL(18,6),
    "custo_embalagem_atual" DECIMAL(18,6),
    "custo_total_atual" DECIMAL(18,6) NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem_recalculo" TEXT,

    CONSTRAINT "custo_snapshot_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencia_item" (
    "id" TEXT NOT NULL,
    "item_ascendente_id" TEXT NOT NULL,
    "item_descendente_id" TEXT NOT NULL,
    "profundidade" INTEGER NOT NULL,
    "relacao_direta" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencia_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissao" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_role" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "atribuida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissao" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "concedida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissao_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "antes_json" JSONB,
    "depois_json" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_codigo_interno_key" ON "item"("codigo_interno");

-- CreateIndex
CREATE UNIQUE INDEX "item_nome_normalizado_key" ON "item"("nome_normalizado");

-- CreateIndex
CREATE INDEX "item_tipo_principal_idx" ON "item"("tipo_principal");

-- CreateIndex
CREATE INDEX "item_unidade_estoque_id_idx" ON "item"("unidade_estoque_id");

-- CreateIndex
CREATE INDEX "item_unidade_uso_padrao_id_idx" ON "item"("unidade_uso_padrao_id");

-- CreateIndex
CREATE INDEX "item_alias_alias_normalizado_idx" ON "item_alias"("alias_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "item_alias_item_id_alias_normalizado_key" ON "item_alias"("item_id", "alias_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "unidade_medida_codigo_key" ON "unidade_medida"("codigo");

-- CreateIndex
CREATE INDEX "conversao_unidade_unidade_origem_id_unidade_destino_id_idx" ON "conversao_unidade"("unidade_origem_id", "unidade_destino_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversao_unidade_item_id_unidade_origem_id_unidade_destino_key" ON "conversao_unidade"("item_id", "unidade_origem_id", "unidade_destino_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_nome_key" ON "fornecedor"("nome");

-- CreateIndex
CREATE INDEX "item_compra_fornecedor_id_idx" ON "item_compra"("fornecedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_compra_item_id_fornecedor_id_unidade_compra_id_key" ON "item_compra"("item_id", "fornecedor_id", "unidade_compra_id");

-- CreateIndex
CREATE INDEX "ficha_tecnica_item_resultante_id_status_idx" ON "ficha_tecnica"("item_resultante_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_tecnica_item_resultante_id_versao_key" ON "ficha_tecnica"("item_resultante_id", "versao");

-- CreateIndex
CREATE INDEX "ficha_componente_item_componente_id_idx" ON "ficha_componente"("item_componente_id");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_componente_ficha_tecnica_id_ordem_key" ON "ficha_componente"("ficha_tecnica_id", "ordem");

-- CreateIndex
CREATE INDEX "custo_snapshot_item_item_id_calculado_em_idx" ON "custo_snapshot_item"("item_id", "calculado_em");

-- CreateIndex
CREATE INDEX "dependencia_item_item_descendente_id_profundidade_idx" ON "dependencia_item"("item_descendente_id", "profundidade");

-- CreateIndex
CREATE INDEX "dependencia_item_item_ascendente_id_profundidade_idx" ON "dependencia_item"("item_ascendente_id", "profundidade");

-- CreateIndex
CREATE UNIQUE INDEX "dependencia_item_item_ascendente_id_item_descendente_id_key" ON "dependencia_item"("item_ascendente_id", "item_descendente_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "role_codigo_key" ON "role"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permissao_codigo_key" ON "permissao"("codigo");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_unidade_estoque_id_fkey" FOREIGN KEY ("unidade_estoque_id") REFERENCES "unidade_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_unidade_uso_padrao_id_fkey" FOREIGN KEY ("unidade_uso_padrao_id") REFERENCES "unidade_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_alias" ADD CONSTRAINT "item_alias_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversao_unidade" ADD CONSTRAINT "conversao_unidade_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversao_unidade" ADD CONSTRAINT "conversao_unidade_unidade_origem_id_fkey" FOREIGN KEY ("unidade_origem_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversao_unidade" ADD CONSTRAINT "conversao_unidade_unidade_destino_id_fkey" FOREIGN KEY ("unidade_destino_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_unidade_compra_id_fkey" FOREIGN KEY ("unidade_compra_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_item_resultante_id_fkey" FOREIGN KEY ("item_resultante_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica" ADD CONSTRAINT "ficha_tecnica_criada_por_id_fkey" FOREIGN KEY ("criada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_componente" ADD CONSTRAINT "ficha_componente_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "ficha_tecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_componente" ADD CONSTRAINT "ficha_componente_item_componente_id_fkey" FOREIGN KEY ("item_componente_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_componente" ADD CONSTRAINT "ficha_componente_unidade_uso_id_fkey" FOREIGN KEY ("unidade_uso_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custo_snapshot_item" ADD CONSTRAINT "custo_snapshot_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencia_item" ADD CONSTRAINT "dependencia_item_item_ascendente_id_fkey" FOREIGN KEY ("item_ascendente_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencia_item" ADD CONSTRAINT "dependencia_item_item_descendente_id_fkey" FOREIGN KEY ("item_descendente_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_role" ADD CONSTRAINT "usuario_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_role" ADD CONSTRAINT "usuario_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissao" ADD CONSTRAINT "role_permissao_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissao" ADD CONSTRAINT "role_permissao_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manual constraints not expressible in Prisma schema
ALTER TABLE "conversao_unidade"
  ADD CONSTRAINT "conversao_unidade_fator_positivo_chk" CHECK ("fator" > 0),
  ADD CONSTRAINT "conversao_unidade_unidades_distintas_chk" CHECK ("unidade_origem_id" <> "unidade_destino_id");

ALTER TABLE "item_compra"
  ADD CONSTRAINT "item_compra_quantidade_positiva_chk" CHECK ("quantidade_por_embalagem" > 0),
  ADD CONSTRAINT "item_compra_custo_compra_positivo_chk" CHECK ("custo_compra" >= 0),
  ADD CONSTRAINT "item_compra_custo_unitario_positivo_chk" CHECK ("custo_unitario_base" >= 0);

ALTER TABLE "ficha_tecnica"
  ADD CONSTRAINT "ficha_tecnica_rendimento_chk" CHECK (
    ("modo_rendimento" = 'percentual_perda' AND "percentual_perda" IS NOT NULL AND "peso_final_informado" IS NULL AND "percentual_perda" >= 0 AND "percentual_perda" < 1)
    OR
    ("modo_rendimento" = 'peso_final' AND "peso_final_informado" IS NOT NULL AND "peso_final_informado" > 0 AND "percentual_perda" IS NULL)
  );

ALTER TABLE "ficha_componente"
  ADD CONSTRAINT "ficha_componente_quantidade_bruta_positiva_chk" CHECK ("quantidade_bruta" > 0),
  ADD CONSTRAINT "ficha_componente_quantidade_limpa_positiva_chk" CHECK ("quantidade_limpa" IS NULL OR "quantidade_limpa" > 0),
  ADD CONSTRAINT "ficha_componente_ordem_positiva_chk" CHECK ("ordem" > 0),
  ADD CONSTRAINT "ficha_componente_fator_correcao_positivo_chk" CHECK ("fator_correcao" IS NULL OR "fator_correcao" > 0),
  ADD CONSTRAINT "ficha_componente_indice_coccao_positivo_chk" CHECK ("indice_coccao" IS NULL OR "indice_coccao" > 0);

ALTER TABLE "custo_snapshot_item"
  ADD CONSTRAINT "custo_snapshot_item_custo_unitario_chk" CHECK ("custo_unitario_atual" >= 0),
  ADD CONSTRAINT "custo_snapshot_item_custo_total_chk" CHECK ("custo_total_atual" >= 0),
  ADD CONSTRAINT "custo_snapshot_item_custo_uso_chk" CHECK ("custo_por_kg_ou_unidade_uso" IS NULL OR "custo_por_kg_ou_unidade_uso" >= 0),
  ADD CONSTRAINT "custo_snapshot_item_custo_embalagem_chk" CHECK ("custo_embalagem_atual" IS NULL OR "custo_embalagem_atual" >= 0);

ALTER TABLE "dependencia_item"
  ADD CONSTRAINT "dependencia_item_profundidade_chk" CHECK ("profundidade" >= 0),
  ADD CONSTRAINT "dependencia_item_autorreferencia_chk" CHECK (
    ("item_ascendente_id" = "item_descendente_id" AND "profundidade" = 0)
    OR
    ("item_ascendente_id" <> "item_descendente_id" AND "profundidade" > 0)
  );

CREATE UNIQUE INDEX "ficha_tecnica_item_resultante_ativa_key"
  ON "ficha_tecnica" ("item_resultante_id")
  WHERE "status" = 'ativa';

CREATE UNIQUE INDEX "conversao_unidade_global_key"
  ON "conversao_unidade" ("unidade_origem_id", "unidade_destino_id")
  WHERE "item_id" IS NULL;
