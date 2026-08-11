import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";

export interface LinkedRow {
  id: string;
  code: string;
  name: string;
  role?: string;
  removable: boolean;
  removeBlockedReason?: string;
  href: string;
}

export interface LinkedItemsResult {
  rows: LinkedRow[];
  canAdd: boolean;
  addBlockedReason?: string;
  // "items": add/remove opera sobre Item; "fichas": as linhas sao fichas
  // tecnicas (somente leitura aqui, editadas dentro da propria ficha).
  mode: "items" | "fichas";
}

function resolvePrisma() {
  return getPrismaClient(getServerEnv().DATABASE_URL);
}

const NO_DB_RESULT: LinkedItemsResult = { rows: [], canAdd: false, addBlockedReason: "Banco de dados indisponivel.", mode: "items" };

export function getLinkedItemsRepository() {
  return {
    async list(kind: string, recordId: string): Promise<LinkedItemsResult> {
      const prisma = resolvePrisma();
      if (!prisma) return NO_DB_RESULT;

      if (kind === "operational-category") {
        const category = await prisma.categoriaOperacional.findUnique({ where: { cd_categoria: recordId } });
        if (!category) return { rows: [], canAdd: false, mode: "items" };
        const items = await prisma.item.findMany({
          where: { nm_categoria_operacional: category.nm_categoria },
          orderBy: { nm_item: "asc" }
        });
        return {
          mode: "items",
          canAdd: true,
          rows: items.map((item) => ({
            id: item.cd_item,
            code: item.ds_codigo_interno ?? "",
            name: item.nm_item,
            removable: true,
            href: `/itens/${item.cd_item}`
          }))
        };
      }

      if (kind === "supplier") {
        const purchases = await prisma.itemCompra.findMany({
          where: { cd_fornecedor: recordId },
          include: { item: true }
        });
        // Pra saber se uma compra e a unica fonte de custo do item, precisamos
        // contar quantas compras cada item tem no total (nao so as desse fornecedor).
        const itemIds = purchases.map((p) => p.cd_item);
        const totalPurchasesByItem = itemIds.length
          ? await prisma.itemCompra.groupBy({ by: ["cd_item"], where: { cd_item: { in: itemIds } }, _count: true })
          : [];
        const totalByItemId = new Map(totalPurchasesByItem.map((row) => [row.cd_item, row._count]));

        return {
          mode: "items",
          canAdd: true,
          rows: purchases.map((purchase) => {
            const totalForItem = totalByItemId.get(purchase.cd_item) ?? 1;
            const isOnly = totalForItem <= 1;
            return {
              id: purchase.item.cd_item,
              code: purchase.item.ds_codigo_interno ?? "",
              name: purchase.item.nm_item,
              removable: !isOnly,
              removeBlockedReason: isOnly
                ? "Unico fornecedor cadastrado para esse item — remover deixaria o item sem custo. Cadastre outro fornecedor antes."
                : undefined,
              href: `/itens/${purchase.item.cd_item}`
            };
          })
        };
      }

      if (kind === "unit") {
        const [estoqueItems, usoPadraoItems, compraLinks, usoLinks, componenteLinks] = await Promise.all([
          prisma.item.findMany({ where: { cd_unidade_estoque: recordId }, orderBy: { nm_item: "asc" } }),
          prisma.item.findMany({ where: { cd_unidade_uso_padrao: recordId }, orderBy: { nm_item: "asc" } }),
          prisma.itemCompra.findMany({ where: { cd_unidade_compra: recordId }, include: { item: true } }),
          prisma.itemCompra.findMany({ where: { cd_unidade_uso: recordId }, include: { item: true } }),
          prisma.fichaComponente.findMany({ where: { cd_unidade_uso: recordId }, include: { itemComponente: true } })
        ]);

        const rows: LinkedRow[] = [
          ...estoqueItems.map((item) => ({
            id: item.cd_item,
            code: item.ds_codigo_interno ?? "",
            name: item.nm_item,
            role: "Unidade de estoque",
            removable: true,
            href: `/itens/${item.cd_item}`
          })),
          ...usoPadraoItems.map((item) => ({
            id: item.cd_item,
            code: item.ds_codigo_interno ?? "",
            name: item.nm_item,
            role: "Unidade de uso padrão",
            removable: true,
            href: `/itens/${item.cd_item}`
          })),
          ...compraLinks.map((purchase) => ({
            id: purchase.item.cd_item,
            code: purchase.item.ds_codigo_interno ?? "",
            name: purchase.item.nm_item,
            role: "Unidade de compra",
            removable: false,
            removeBlockedReason: "Unidade de compra é obrigatória e usada no cálculo de custo — mudar aqui corromperia o custo salvo. Edite pela ficha de compra do item.",
            href: `/itens/${purchase.item.cd_item}`
          })),
          ...usoLinks.map((purchase) => ({
            id: purchase.item.cd_item,
            code: purchase.item.ds_codigo_interno ?? "",
            name: purchase.item.nm_item,
            role: "Unidade de uso na compra",
            removable: false,
            removeBlockedReason: "Usada no cálculo do fator de conversão/custo — mudar aqui corromperia o custo salvo. Edite pela ficha de compra do item.",
            href: `/itens/${purchase.item.cd_item}`
          })),
          ...componenteLinks.map((componente) => ({
            id: componente.itemComponente.cd_item,
            code: componente.itemComponente.ds_codigo_interno ?? "",
            name: componente.itemComponente.nm_item,
            role: "Unidade de uso em componente de ficha técnica",
            removable: false,
            removeBlockedReason: "Usada no cálculo de custo de um componente de ficha técnica — mudar aqui corromperia o custo salvo. Edite pela ficha técnica correspondente.",
            href: `/itens/${componente.itemComponente.cd_item}`
          }))
        ];

        return {
          mode: "items",
          canAdd: false,
          addBlockedReason: "Vincular uma unidade a um item existente recalcula custo/conversão — feito pela edição do item, não por aqui.",
          rows
        };
      }

      if (kind === "item-type") {
        const typeRow = await prisma.tipoItemCadastro.findUnique({ where: { cd_tipo_item: recordId } });
        if (!typeRow) return { rows: [], canAdd: false, mode: "items" };
        const items = await prisma.item.findMany({ where: { tp_item: typeRow.tp_codigo }, orderBy: { nm_item: "asc" } });
        return {
          mode: "items",
          canAdd: false,
          addBlockedReason: "O tipo do item é o próprio cadastro do item (não um vínculo) — para mudar, reclassifique o item na tela de Itens.",
          rows: items.map((item) => ({
            id: item.cd_item,
            code: item.ds_codigo_interno ?? "",
            name: item.nm_item,
            removable: false,
            removeBlockedReason: "Remover significaria reclassificar o tipo do item — feito na tela de Itens, não por aqui.",
            href: `/itens/${item.cd_item}`
          }))
        };
      }

      if (kind === "stage-type") {
        const componentes = await prisma.fichaComponente.findMany({
          where: { fichaEtapa: { cd_tipo_etapa: recordId } },
          include: { itemComponente: true },
          distinct: ["cd_item_componente"]
        });
        return {
          mode: "items",
          canAdd: false,
          addBlockedReason: "Tipo de etapa é escolhido dentro do editor da ficha técnica — não por aqui.",
          rows: componentes.map((componente) => ({
            id: componente.itemComponente.cd_item,
            code: componente.itemComponente.ds_codigo_interno ?? "",
            name: componente.itemComponente.nm_item,
            role: "Ingrediente usado em etapa desse tipo",
            removable: false,
            removeBlockedReason: "Editado dentro da ficha técnica correspondente.",
            href: `/itens/${componente.itemComponente.cd_item}`
          }))
        };
      }

      if (kind === "modality") {
        const fichas = await prisma.fichaTecnica.findMany({
          where: { cd_modalidade: recordId },
          include: { itemResultante: true },
          orderBy: { nm_exibicao: "asc" }
        });
        return {
          mode: "fichas",
          canAdd: false,
          addBlockedReason: "Modalidade é escolhida dentro do editor de cada ficha técnica — não por aqui.",
          rows: fichas.map((ficha) => ({
            id: ficha.cd_ficha_tecnica,
            code: `v${ficha.nr_versao}`,
            name: ficha.nm_exibicao || ficha.itemResultante.nm_item,
            removable: false,
            removeBlockedReason: "Editado dentro da ficha técnica correspondente.",
            href: `/fichas/${ficha.cd_ficha_tecnica}`
          }))
        };
      }

      return { rows: [], canAdd: false, mode: "items" };
    },

    async searchAddableItems(kind: string, query: string): Promise<Array<{ id: string; code: string; name: string }>> {
      const prisma = resolvePrisma();
      if (!prisma) return [];
      if (kind !== "operational-category" && kind !== "supplier") return [];

      const items = await prisma.item.findMany({
        where: {
          sn_ativo: true,
          ...(query.trim() ? { nm_item: { contains: query.trim(), mode: "insensitive" as const } } : {})
        },
        orderBy: { nm_item: "asc" },
        take: 20
      });
      return items.map((item) => ({ id: item.cd_item, code: item.ds_codigo_interno ?? "", name: item.nm_item }));
    },

    async addLink(kind: string, recordId: string, itemId: string): Promise<{ ok: boolean; message?: string }> {
      const prisma = resolvePrisma();
      if (!prisma) return { ok: false, message: "Banco de dados indisponivel." };

      if (kind === "operational-category") {
        const category = await prisma.categoriaOperacional.findUnique({ where: { cd_categoria: recordId } });
        if (!category) return { ok: false, message: "Categoria não encontrada." };
        await prisma.item.update({ where: { cd_item: itemId }, data: { nm_categoria_operacional: category.nm_categoria } });
        return { ok: true };
      }

      if (kind === "supplier") {
        const item = await prisma.item.findUnique({ where: { cd_item: itemId }, include: { unidadeEstoque: true } });
        if (!item) return { ok: false, message: "Item não encontrado." };
        const fallbackUnit = item.cd_unidade_estoque ?? (await prisma.unidadeMedida.findFirst())?.cd_unidade_medida;
        if (!fallbackUnit) return { ok: false, message: "Cadastre uma unidade antes de vincular um fornecedor." };
        await prisma.itemCompra.upsert({
          where: {
            cd_item_cd_fornecedor_cd_unidade_compra: {
              cd_item: itemId,
              cd_fornecedor: recordId,
              cd_unidade_compra: fallbackUnit
            }
          },
          update: {},
          create: {
            cd_item: itemId,
            cd_fornecedor: recordId,
            cd_unidade_compra: fallbackUnit,
            vl_qtd_embalagem: "1.0000",
            vl_custo_compra: "0.0000",
            vl_custo_unitario_base: "0.000000"
          }
        });
        return { ok: true, message: "Vinculado com preço/quantidade zerados — edite o preço real na ficha do item." };
      }

      return { ok: false, message: "Vínculo não suportado para este cadastro." };
    },

    async removeLink(kind: string, recordId: string, itemId: string): Promise<{ ok: boolean; message?: string }> {
      const prisma = resolvePrisma();
      if (!prisma) return { ok: false, message: "Banco de dados indisponivel." };

      if (kind === "operational-category") {
        await prisma.item.update({ where: { cd_item: itemId }, data: { nm_categoria_operacional: null } });
        return { ok: true };
      }

      if (kind === "supplier") {
        const totalForItem = await prisma.itemCompra.count({ where: { cd_item: itemId } });
        if (totalForItem <= 1) {
          return { ok: false, message: "Único fornecedor cadastrado para esse item — remover deixaria o item sem custo." };
        }
        await prisma.itemCompra.deleteMany({ where: { cd_item: itemId, cd_fornecedor: recordId } });
        return { ok: true };
      }

      return { ok: false, message: "Remoção não suportada para este cadastro por aqui." };
    }
  };
}
