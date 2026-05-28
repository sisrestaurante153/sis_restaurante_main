import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";

export function getCloneRepository() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    throw new Error("Não foi possível conectar ao banco de dados.");
  }

  return {
    async getCloneSummary(originId: string) {
      const itemsCount = await prisma.item.count({
        where: { cd_restaurante: originId }
      });
      const fichasCount = await prisma.fichaTecnica.count({
        where: { cd_restaurante: originId }
      });
      return { itemsCount, fichasCount };
    },

    async cloneItems(originId: string, destinationId: string) {
      const items = await prisma.item.findMany({
        where: { cd_restaurante: originId }
      });

      const mapping: Record<string, string> = {};
      let created = 0;
      let ignored = 0;

      for (const item of items) {
        const existing = await prisma.item.findFirst({
          where: {
            cd_restaurante: destinationId,
            nm_normalizado: item.nm_normalizado
          }
        });

        if (existing) {
          mapping[item.cd_item] = existing.cd_item;
          ignored++;
        } else {
          let code = item.ds_codigo_interno;
          if (code) {
            const codeConflict = await prisma.item.findFirst({
              where: {
                cd_restaurante: destinationId,
                ds_codigo_interno: code
              }
            });
            if (codeConflict) {
              code = `${code}-cloned`;
            }
          }

          const createdItem = await prisma.item.create({
            data: {
              nm_item: item.nm_item,
              nm_normalizado: item.nm_normalizado,
              ds_codigo_interno: code,
              ds_descricao: item.ds_descricao,
              nm_categoria_operacional: item.nm_categoria_operacional,
              tp_item: item.tp_item,
              cd_unidade_estoque: item.cd_unidade_estoque,
              cd_unidade_uso_padrao: item.cd_unidade_uso_padrao,
              sn_ativo: item.sn_ativo,
              ds_observacoes: item.ds_observacoes,
              cd_restaurante: destinationId
            }
          });
          mapping[item.cd_item] = createdItem.cd_item;
          created++;
        }
      }

      return { mapping, created, ignored };
    },

    async clonePurchases(originId: string, destinationId: string, mapping: Record<string, string>) {
      const items = await prisma.item.findMany({
        where: { cd_restaurante: originId },
        select: { cd_item: true }
      });
      const originItemIds = items.map(i => i.cd_item);

      const purchases = await prisma.itemCompra.findMany({
        where: {
          cd_item: { in: originItemIds }
        }
      });

      let created = 0;
      let ignored = 0;

      for (const pur of purchases) {
        const destItemId = mapping[pur.cd_item];
        if (!destItemId) {
          ignored++;
          continue;
        }

        const existing = await prisma.itemCompra.findFirst({
          where: {
            cd_item: destItemId,
            cd_fornecedor: pur.cd_fornecedor,
            cd_unidade_compra: pur.cd_unidade_compra
          }
        });

        if (existing) {
          ignored++;
        } else {
          await prisma.itemCompra.create({
            data: {
              cd_item: destItemId,
              cd_fornecedor: pur.cd_fornecedor,
              cd_unidade_compra: pur.cd_unidade_compra,
              cd_unidade_uso: pur.cd_unidade_uso,
              sn_principal: pur.sn_principal,
              vl_qtd_embalagem: pur.vl_qtd_embalagem,
              vl_qtd_uso: pur.vl_qtd_uso,
              vl_custo_compra: pur.vl_custo_compra,
              vl_custo_unitario_base: pur.vl_custo_unitario_base,
              ts_atualizacao_preco: pur.ts_atualizacao_preco,
              ds_observacao: pur.ds_observacao
            }
          });
          created++;
        }
      }

      return { created, ignored };
    },

    async cloneFichas(originId: string, destinationId: string, mapping: Record<string, string>) {
      const fichas = await prisma.fichaTecnica.findMany({
        where: { cd_restaurante: originId },
        include: {
          etapas: true,
          componentes: true
        }
      });

      let created = 0;
      let ignored = 0;

      for (const f of fichas) {
        const destItemResultanteId = mapping[f.cd_item_resultante];
        if (!destItemResultanteId) {
          ignored++;
          continue;
        }

        const existing = await prisma.fichaTecnica.findFirst({
          where: {
            cd_item_resultante: destItemResultanteId,
            nr_versao: f.nr_versao
          }
        });

        if (existing) {
          ignored++;
          continue;
        }

        const newFicha = await prisma.fichaTecnica.create({
          data: {
            cd_item_resultante: destItemResultanteId,
            nm_exibicao: f.nm_exibicao,
            cd_modalidade: f.cd_modalidade,
            cd_unidade_rendimento: f.cd_unidade_rendimento,
            nr_versao: f.nr_versao,
            tp_status: f.tp_status,
            tp_modo_rendimento: f.tp_modo_rendimento,
            vl_pct_perda: f.vl_pct_perda,
            vl_peso_final: f.vl_peso_final,
            vl_rendimento_porcoes: f.vl_rendimento_porcoes,
            vl_preco_venda: f.vl_preco_venda,
            vl_pct_despesa_variavel: f.vl_pct_despesa_variavel,
            ds_modo_preparo: f.ds_modo_preparo,
            ds_observacoes: f.ds_observacoes,
            cd_criador: f.cd_criador,
            cd_restaurante: destinationId
          }
        });

        const etapaMapping: Record<string, string> = {};
        for (const et of f.etapas) {
          const newEtapa = await prisma.fichaEtapa.create({
            data: {
              cd_ficha_tecnica: newFicha.cd_ficha_tecnica,
              cd_tipo_etapa: et.cd_tipo_etapa,
              nr_ordem: et.nr_ordem,
              nm_etapa: et.nm_etapa,
              vl_peso_entrada: et.vl_peso_entrada,
              vl_peso_saida: et.vl_peso_saida,
              vl_fator_correcao: et.vl_fator_correcao,
              vl_indice_coccao: et.vl_indice_coccao,
              vl_total_snapshot: et.vl_total_snapshot,
              ds_observacao: et.ds_observacao
            }
          });
          etapaMapping[et.cd_ficha_etapa] = newEtapa.cd_ficha_etapa;
        }

        for (const comp of f.componentes) {
          const destComponentItemId = mapping[comp.cd_item_componente];
          if (!destComponentItemId) continue;

          const newEtapaId = comp.cd_ficha_etapa ? etapaMapping[comp.cd_ficha_etapa] : null;

          await prisma.fichaComponente.create({
            data: {
              cd_ficha_tecnica: newFicha.cd_ficha_tecnica,
              cd_ficha_etapa: newEtapaId,
              cd_item_componente: destComponentItemId,
              tp_componente: comp.tp_componente,
              nr_ordem: comp.nr_ordem,
              vl_qtd_bruta: comp.vl_qtd_bruta,
              vl_qtd_limpa: comp.vl_qtd_limpa,
              cd_unidade_uso: comp.cd_unidade_uso,
              vl_fator_correcao: comp.vl_fator_correcao,
              vl_indice_coccao: comp.vl_indice_coccao,
              vl_custo_unitario_snapshot: comp.vl_custo_unitario_snapshot,
              vl_custo_total_snapshot: comp.vl_custo_total_snapshot,
              ds_observacao: comp.ds_observacao
            }
          });
        }

        created++;
      }

      return { created, ignored };
    }
  };
}
