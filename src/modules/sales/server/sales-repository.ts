import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import {
  createDemoId,
  getDemoStore,
  persistDemoStore,
  type DemoVendaRecord
} from "@/modules/platform/server/demo-data";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import type { FinancialReturnRow, SaveVendaInput, VendaRow } from "@/modules/sales/domain/types";

export interface ListVendasFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function getSalesRepository(restaurantId: string) {
  return {
    async listVendas(filters: ListVendasFilters = {}): Promise<VendaRow[]> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        const rows = await prisma.venda.findMany({
          where: {
            cd_restaurante: restaurantId,
            dt_venda: {
              gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
              lte: filters.dateTo ? new Date(filters.dateTo) : undefined
            }
          },
          include: { item: { select: { nm_item: true } } },
          orderBy: { dt_venda: "desc" }
        });

        return rows.map((row) => ({
          id: row.cd_venda,
          itemId: row.cd_item,
          itemName: row.item.nm_item,
          date: row.dt_venda.toISOString().slice(0, 10),
          quantity: row.nr_quantidade.toFixed(4),
          unitPrice: row.vl_preco_unitario.toFixed(4),
          total: row.vl_total.toFixed(4),
          channel: row.tp_canal,
          origin: row.ds_origem
        }));
      }

      const items = getDemoStore().items;
      return getDemoStore()
        .vendas.filter((venda) => {
          if (filters.dateFrom && venda.date < filters.dateFrom) return false;
          if (filters.dateTo && venda.date > filters.dateTo) return false;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((venda) => ({
          id: venda.id,
          itemId: venda.itemId,
          itemName: items.find((item) => item.id === venda.itemId)?.name ?? "(item removido)",
          date: venda.date,
          quantity: venda.quantity,
          unitPrice: venda.unitPrice,
          total: venda.total,
          channel: venda.channel,
          origin: venda.origin
        }));
    },

    async saveVenda(input: SaveVendaInput): Promise<void> {
      const quantity = Number(input.quantity);
      const unitPrice = Number(input.unitPrice);
      const total = (quantity * unitPrice).toFixed(4);

      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        await prisma.venda.create({
          data: {
            cd_restaurante: restaurantId,
            cd_item: input.itemId,
            dt_venda: new Date(input.date),
            nr_quantidade: input.quantity,
            vl_preco_unitario: input.unitPrice,
            vl_total: total,
            tp_canal: input.channel || null,
            ds_origem: "manual"
          }
        });
        return;
      }

      const store = getDemoStore();
      const record: DemoVendaRecord = {
        id: createDemoId("venda"),
        itemId: input.itemId,
        date: input.date,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        total,
        channel: input.channel || null,
        origin: "manual",
        createdAt: new Date().toISOString()
      };
      store.vendas.push(record);
      persistDemoStore(store);
    },

    // Cruza vendas do periodo com o custo unitario calculado da ficha (custo por
    // porcao/saida, ver mapCosts.perPortion) para mostrar a margem real por item —
    // diferente da margem cadastrada na grade de fichas, que usa o preco de venda
    // configurado e nao a venda de fato ocorrida.
    async getFinancialReturn(filters: ListVendasFilters = {}): Promise<FinancialReturnRow[]> {
      const vendas = await this.listVendas(filters);
      if (vendas.length === 0) return [];

      const catalogRepository = getCatalogRepository(restaurantId);
      const uniqueItemIds = [...new Set(vendas.map((venda) => venda.itemId))];
      const costByItemId = new Map<string, number>();

      await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          const detail = await catalogRepository.getItemDetail(itemId);
          const unitCost = Number(detail?.costs.perPortion ?? detail?.costs.total ?? "0");
          costByItemId.set(itemId, Number.isFinite(unitCost) ? unitCost : 0);
        })
      );

      const totalsByItem = new Map<string, FinancialReturnRow>();

      for (const venda of vendas) {
        const quantity = Number(venda.quantity);
        const revenue = Number(venda.total);
        const unitCost = costByItemId.get(venda.itemId) ?? 0;
        const cost = unitCost * quantity;

        const existing = totalsByItem.get(venda.itemId);
        if (existing) {
          existing.quantitySold += quantity;
          existing.revenueTotal += revenue;
          existing.costTotal += cost;
          existing.marginTotal += revenue - cost;
        } else {
          totalsByItem.set(venda.itemId, {
            itemId: venda.itemId,
            itemName: venda.itemName,
            quantitySold: quantity,
            revenueTotal: revenue,
            costTotal: cost,
            marginTotal: revenue - cost,
            marginPercent: null
          });
        }
      }

      return [...totalsByItem.values()]
        .map((row) => ({
          ...row,
          marginPercent: row.revenueTotal > 0 ? (row.marginTotal / row.revenueTotal) * 100 : null
        }))
        .sort((a, b) => b.marginTotal - a.marginTotal);
    },

    async deleteVenda(id: string): Promise<void> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        await prisma.venda.delete({ where: { cd_venda: id } }).catch(() => null);
        return;
      }

      const store = getDemoStore();
      store.vendas = store.vendas.filter((venda) => venda.id !== id);
      persistDemoStore(store);
    }
  };
}
