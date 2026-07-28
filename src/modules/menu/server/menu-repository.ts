import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import {
  createDemoId,
  getDemoStore,
  persistDemoStore,
  type DemoCardapioItemRecord,
  type DemoCardapioRecord
} from "@/modules/platform/server/demo-data";
import type {
  AddCardapioItemInput,
  CardapioDetail,
  CardapioItemRow,
  CardapioSummary,
  SaveCardapioInput
} from "@/modules/menu/domain/types";

function parseWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value.filter((entry): entry is number => typeof entry === "number" && entry >= 0 && entry <= 6);
  return days.length > 0 ? days : null;
}

export function getMenuRepository(restaurantId: string) {
  return {
    async listCardapios(): Promise<CardapioSummary[]> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        const rows = await prisma.cardapio.findMany({
          where: { cd_restaurante: restaurantId },
          include: { itens: { select: { cd_cardapio_item: true } } },
          orderBy: { ts_atualizacao: "desc" }
        });

        return rows.map((row) => ({
          id: row.cd_cardapio,
          name: row.nm_cardapio,
          channel: row.tp_canal,
          active: row.sn_ativo,
          itemCount: row.itens.length,
          updatedAt: row.ts_atualizacao.toISOString()
        }));
      }

      return getDemoStore()
        .cardapios.slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((cardapio) => ({
          id: cardapio.id,
          name: cardapio.name,
          channel: cardapio.channel,
          active: cardapio.active,
          itemCount: cardapio.items.length,
          updatedAt: cardapio.updatedAt
        }));
    },

    async getCardapioDetail(id: string): Promise<CardapioDetail | null> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        const row = await prisma.cardapio.findFirst({
          where: { cd_cardapio: id, cd_restaurante: restaurantId },
          include: { itens: { include: { item: true } } }
        });

        if (!row) return null;

        return {
          id: row.cd_cardapio,
          name: row.nm_cardapio,
          channel: row.tp_canal,
          active: row.sn_ativo,
          items: row.itens.map((entry): CardapioItemRow => ({
            id: entry.cd_cardapio_item,
            itemId: entry.cd_item,
            itemName: entry.item.nm_item,
            itemType: entry.item.tp_item,
            salePrice: entry.vl_preco_venda.toFixed(4),
            weekdays: parseWeekdays(entry.js_dias_semana),
            active: entry.sn_ativo
          }))
        };
      }

      const cardapio = getDemoStore().cardapios.find((entry) => entry.id === id);
      if (!cardapio) return null;

      const items = getDemoStore().items;
      return {
        id: cardapio.id,
        name: cardapio.name,
        channel: cardapio.channel,
        active: cardapio.active,
        items: cardapio.items.map((entry): CardapioItemRow => {
          const item = items.find((it) => it.id === entry.itemId);
          return {
            id: entry.id,
            itemId: entry.itemId,
            itemName: item?.name ?? "(item removido)",
            itemType: item?.type ?? "prato",
            salePrice: entry.salePrice,
            weekdays: entry.weekdays,
            active: entry.active
          };
        })
      };
    },

    async saveCardapio(input: SaveCardapioInput): Promise<string> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        const row = input.id
          ? await prisma.cardapio.update({
              where: { cd_cardapio: input.id },
              data: { nm_cardapio: input.name, tp_canal: input.channel, sn_ativo: input.active }
            })
          : await prisma.cardapio.create({
              data: {
                cd_restaurante: restaurantId,
                nm_cardapio: input.name,
                tp_canal: input.channel,
                sn_ativo: input.active
              }
            });

        return row.cd_cardapio;
      }

      const store = getDemoStore();
      const now = new Date().toISOString();

      if (input.id) {
        const existing = store.cardapios.find((entry) => entry.id === input.id);
        if (existing) {
          existing.name = input.name;
          existing.channel = input.channel;
          existing.active = input.active;
          existing.updatedAt = now;
          persistDemoStore(store);
          return existing.id;
        }
      }

      const record: DemoCardapioRecord = {
        id: createDemoId("cardapio"),
        name: input.name,
        channel: input.channel,
        active: input.active,
        createdAt: now,
        updatedAt: now,
        items: []
      };
      store.cardapios.push(record);
      persistDemoStore(store);
      return record.id;
    },

    async deleteCardapio(id: string): Promise<void> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        await prisma.cardapio.delete({ where: { cd_cardapio: id } }).catch(() => null);
        return;
      }

      const store = getDemoStore();
      store.cardapios = store.cardapios.filter((entry) => entry.id !== id);
      persistDemoStore(store);
    },

    async addCardapioItem(input: AddCardapioItemInput): Promise<void> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        await prisma.cardapioItem.upsert({
          where: { cd_cardapio_cd_item: { cd_cardapio: input.cardapioId, cd_item: input.itemId } },
          update: {
            vl_preco_venda: input.salePrice,
            js_dias_semana: input.weekdays ?? undefined
          },
          create: {
            cd_cardapio: input.cardapioId,
            cd_item: input.itemId,
            vl_preco_venda: input.salePrice,
            js_dias_semana: input.weekdays ?? undefined
          }
        });
        await prisma.cardapio.update({
          where: { cd_cardapio: input.cardapioId },
          data: { ts_atualizacao: new Date() }
        });
        return;
      }

      const store = getDemoStore();
      const cardapio = store.cardapios.find((entry) => entry.id === input.cardapioId);
      if (!cardapio) return;

      const existing = cardapio.items.find((entry) => entry.itemId === input.itemId);
      if (existing) {
        existing.salePrice = input.salePrice;
        existing.weekdays = input.weekdays;
      } else {
        const record: DemoCardapioItemRecord = {
          id: createDemoId("cardapio-item"),
          itemId: input.itemId,
          salePrice: input.salePrice,
          weekdays: input.weekdays,
          active: true
        };
        cardapio.items.push(record);
      }
      cardapio.updatedAt = new Date().toISOString();
      persistDemoStore(store);
    },

    async removeCardapioItem(cardapioItemId: string): Promise<void> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        await prisma.cardapioItem.delete({ where: { cd_cardapio_item: cardapioItemId } }).catch(() => null);
        return;
      }

      const store = getDemoStore();
      for (const cardapio of store.cardapios) {
        cardapio.items = cardapio.items.filter((entry) => entry.id !== cardapioItemId);
      }
      persistDemoStore(store);
    }
  };
}
