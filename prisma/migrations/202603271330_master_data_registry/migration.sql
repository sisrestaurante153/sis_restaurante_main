CREATE TABLE "tipo_item_cadastro" (
    "id" TEXT NOT NULL,
    "codigo" "ItemType" NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_item_cadastro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categoria_operacional" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categoria_operacional_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipo_item_cadastro_codigo_key" ON "tipo_item_cadastro"("codigo");
CREATE UNIQUE INDEX "categoria_operacional_codigo_key" ON "categoria_operacional"("codigo");
CREATE UNIQUE INDEX "categoria_operacional_nome_key" ON "categoria_operacional"("nome");
