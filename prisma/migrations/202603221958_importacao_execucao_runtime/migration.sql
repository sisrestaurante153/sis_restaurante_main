ALTER TABLE "importacao_execucao"
  ADD COLUMN "origem_arquivo_caminho" TEXT,
  ADD COLUMN "mime_type_arquivo" TEXT,
  ADD COLUMN "tamanho_arquivo_bytes" INTEGER,
  ADD COLUMN "estagio_atual" TEXT NOT NULL DEFAULT 'aguardando_worker',
  ADD COLUMN "resumo_amigavel_json" JSONB,
  ADD COLUMN "detalhes_tecnicos_json" JSONB,
  ADD COLUMN "artefatos_json" JSONB,
  ADD COLUMN "solicitado_por_id" TEXT,
  ADD COLUMN "iniciado_em" TIMESTAMP(3);

CREATE INDEX "importacao_execucao_status_criado_em_idx"
  ON "importacao_execucao" ("status", "criado_em");

CREATE INDEX "importacao_execucao_solicitado_por_id_idx"
  ON "importacao_execucao" ("solicitado_por_id");

ALTER TABLE "importacao_execucao"
  ADD CONSTRAINT "importacao_execucao_solicitado_por_id_fkey"
  FOREIGN KEY ("solicitado_por_id") REFERENCES "usuario"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
