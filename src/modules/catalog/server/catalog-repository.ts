import "server-only";
import { type Prisma } from "@/generated/prisma/client";
import {
  mapItemDetail,
  mapItemListRow,
  mapItemOption,
  type CatalogItemRecord
} from "@/modules/catalog/server/catalog-prisma-mappers";
import { recalculateCascade } from "@/modules/engineering/server/cost-engine-service";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import {
  calculateCanonicalUnitCost,
  inferUnitTypeFromCode,
  normalizeUnitCode
} from "@/modules/platform/domain/units";
import { getServerEnv } from "@/modules/platform/server/env";
import {
  cloneDemoStore,
  createDemoId,
  getDemoStore,
  persistDemoStore,
  resetDemoStore,
  toNormalizedName,
  type DemoItemRecord,
  type DemoItemType
} from "@/modules/platform/server/demo-data";
import { recalculateDemoStoreCosts } from "@/modules/platform/server/demo-costing";

export interface ListItemsInput {
  page: number;
  pageSize: number;
  query: string;
  type?: DemoItemType | "all";
  status?: "ativos" | "inativos" | "all";
  category?: string;
  sort?: "code" | "name" | "type" | "category" | "purchaseQuantity" | "stockUnit" | "baseUnitCost" | "conversionFactor" | "usageQuantity" | "usageUnit" | "usagePrice" | "supplierName" | "active" | "updatedAt";
  order?: "asc" | "desc";
}

export interface SaveItemInput {
  id?: string;
  code: string;
  name: string;
  type: DemoItemType;
  operationalCategory: string;
  // Phase 08-04: stockUnit/usageUnit/conversionFactor REMOVIDOS do contrato de escrita.
  // Legacy columns item.unidadeEstoqueId/item.unidadeUsoPadraoId derivadas do purchase principal
  // (purchase.purchaseUnit -> unidadeEstoque; purchase.usageUnit -> unidadeUsoPadrao).
  description: string;
  active: boolean;
  purchases: Array<{
    supplierName: string;
    purchaseUnit: string;
    purchaseIsPrimary: boolean;
    purchaseQuantity: string;
    purchaseCost: string;
    priceUpdatedAt: string;
    usageUnit?: string;
    usageQuantity?: string;
    usagePrice?: string;
  }>;
  // Pula recalculateCascade individual — use recalculateItems() em lote após importação em massa.
  skipCascadeRecalculate?: boolean;
}

export class CatalogRepositoryError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = "CatalogRepositoryError";
  }
}

interface CatalogDeleteResult {
  success: boolean;
  reason?: string;
}

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Math.max(page, 1);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const offset = (safePage - 1) * pageSize;

  return {
    items: rows.slice(offset, offset + pageSize),
    totalCount,
    totalPages,
    page: safePage
  };
}

function toItemListRow(item: DemoItemRecord) {
  // Demo path parity (B-01 Q2): espelha mapPurchases/mapItemListRow Prisma — single row sempre e principal.
  const hasPurchase = !!item.purchaseCost && item.purchaseCost !== "0.0000";
  const conversionFactor = Number(item.conversionFactor);
  const purchaseQuantity = Number(item.purchaseQuantity);
  const purchaseCost = Number(item.purchaseCost);
  const usageQuantity =
    Number.isFinite(conversionFactor) && conversionFactor > 0
      ? (purchaseQuantity / conversionFactor).toFixed(4)
      : "0.0000";
  const usagePrice =
    Number.isFinite(conversionFactor) && conversionFactor > 0 ? (purchaseCost / conversionFactor).toFixed(4) : "0.0000";

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    type: item.type,
    category: item.operationalCategory,
    stockUnit: item.stockUnit,
    purchaseQuantity: hasPurchase ? item.purchaseQuantity : "--",
    usageUnit: hasPurchase ? item.usageUnit : "--",
    conversionFactor: hasPurchase ? item.conversionFactor : "--",
    supplierName: hasPurchase ? item.supplier : "--",
    supplierCount: hasPurchase ? 1 : 0,
    baseUnitCost: hasPurchase ? item.purchaseCost : "--",
    usageQuantity: hasPurchase ? usageQuantity : "--",
    usagePrice: hasPurchase ? usagePrice : "--",
    description: item.description,
    totalCost: item.costs.total,
    fichaStatus: item.fichaStatus,
    active: item.active,
    updatedAt: item.lastCalculationAt
  };
}

function toItemDetail(item: DemoItemRecord) {
  const conversionFactor = Number(item.conversionFactor);
  const purchaseQuantity = Number(item.purchaseQuantity);
  const purchaseCost = Number(item.purchaseCost);
  const usageQuantity =
    Number.isFinite(conversionFactor) && conversionFactor > 0
      ? (purchaseQuantity / conversionFactor).toFixed(4)
      : "0.0000";
  const usagePrice =
    Number.isFinite(conversionFactor) && conversionFactor > 0 ? (purchaseCost / conversionFactor).toFixed(4) : "0.0000";

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    type: item.type,
    operationalCategory: item.operationalCategory,
    active: item.active,
    aliases: cloneDemoStore(item.aliases),
    stock: {
      unit: item.stockUnit
    },
    usage: {
      unit: item.usageUnit,
      conversionFactor: item.conversionFactor,
      usageQuantity,
      usagePrice
    },
    purchase: {
      unit: item.purchaseUnit,
      quantity: item.purchaseQuantity,
      cost: item.purchaseCost,
      supplier: item.supplier,
      baseUnitCost: item.purchaseCost,
      purchaseIsPrimary: true,
      usageQuantity,
      usagePrice,
      priceUpdatedAt: item.lastCalculationAt
    },
    purchases: [
      {
        id: `${item.id}-purchase`,
        supplierName: item.supplier,
        purchaseUnit: item.purchaseUnit,
        purchaseIsPrimary: true,
        purchaseQuantity: item.purchaseQuantity,
        purchaseCost: item.purchaseCost,
        baseUnitCost: item.purchaseCost,
        usageUnit: item.usageUnit,
        usageQuantity,
        conversionFactor: item.conversionFactor,
        usagePrice,
        usageIsFixedFromPrimary: false, // demo single row is always principal
        priceUpdatedAt: item.lastCalculationAt,
        notes: ""
      }
    ],
    costs: {
      ...cloneDemoStore(item.costs),
      perKg: item.costs.total,
      perPortion: null,
      finalOutput: "1.0000"
    },
    fichaStatus: item.fichaStatus,
    lastCalculationAt: item.lastCalculationAt
  };
}

function toItemOption(item: DemoItemRecord) {
  const linkedFicha = getDemoStore().fichas.find((ficha) => ficha.itemId === item.id);

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    code: item.code,
    operationalCategory: item.operationalCategory,
    usageUnit: item.usageUnit,
    currentCost: item.costs.total,
    finalOutput: "1.0000",
    linkedFichaId: linkedFicha?.id,
    linkedFichaName: linkedFicha?.displayName
  };
}

function buildUnitName(code: string) {
  const normalized = normalizeUnitCode(code);

  const knownNames: Record<string, string> = {
    kg: "Quilograma",
    g: "Grama",
    mg: "Miligramas",
    l: "Litro",
    ml: "Mililitro",
    un: "Unidade",
    unidade: "Unidade",
    maco: "Maco",
    "maço": "Maco"
  };

  return knownNames[normalized] ?? normalized.toUpperCase();
}

function parsePurchaseUpdatedAt(value: string) {
  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function buildDeleteBlockedMessage(linkedFichaCount: number) {
  return `Este item esta vinculado a ${linkedFichaCount} fichas tecnicas. Inative-o ou remova os vinculos antes de excluir.`;
}

async function ensureUnit(tx: Prisma.TransactionClient, code: string) {
  const normalized = normalizeUnitCode(code);

  return tx.unidadeMedida.upsert({
    where: { ds_codigo: normalized },
    update: {
      nm_unidade: buildUnitName(normalized),
      tp_unidade: inferUnitTypeFromCode(normalized)
    },
    create: {
      ds_codigo: normalized,
      nm_unidade: buildUnitName(normalized),
      tp_unidade: inferUnitTypeFromCode(normalized)
    }
  });
}

async function queryItem(
  client: Prisma.TransactionClient | NonNullable<ReturnType<typeof getPrismaClient>>,
  itemId: string
) {
  return client.item.findUnique({
    where: { cd_item: itemId },
    include: {
      unidadeEstoque: true,
      unidadeUsoPadrao: true,
      aliases: {
        orderBy: { nm_alias: "asc" }
      },
      conversoes: true,
      compras: {
        orderBy: [{ sn_principal: "desc" }, { ts_atualizacao_preco: "desc" }, { ts_criacao: "desc" }],
        include: {
          fornecedor: {
            select: { nm_fornecedor: true }
          },
          unidadeCompra: true,
          unidadeUso: true
        }
      },
      fichasResultantes: {
        where: {
          tp_status: {
            in: ["ativa", "rascunho", "inativa"]
          }
        },
        orderBy: [{ tp_status: "asc" }, { nr_versao: "desc" }],
        take: 5
      },
      custosSnapshot: {
        orderBy: { ts_calculo: "desc" },
        take: 1
      },
      execucoesCalculo: {
        orderBy: { ts_criacao: "desc" },
        take: 1,
        select: {
          ts_criacao: true,
          js_metadados: true
        }
      }
    }
  }) as Promise<CatalogItemRecord | null>;
}

const COMPLEX_ITEM_SORT_FIELDS = ["code", "baseUnitCost", "usagePrice", "purchaseQuantity", "conversionFactor", "usageQuantity", "supplierName"] as const;

function buildItemsOrderBy(sort: ListItemsInput["sort"], order: "asc" | "desc" | undefined): Prisma.ItemOrderByWithRelationInput {
  const dir = order ?? "asc";
  switch (sort) {
    case "name":     return { nm_item: dir };
    case "type":     return { tp_item: dir };
    case "category": return { nm_categoria_operacional: dir };
    case "active":   return { sn_ativo: dir };
    case "updatedAt": return { ts_atualizacao: dir };
    case "stockUnit": return { unidadeEstoque: { ds_codigo: dir } };
    case "usageUnit": return { unidadeUsoPadrao: { ds_codigo: dir } };
    default:          return { nm_item: "asc" };
  }
}

function sortMappedItems(mapped: ReturnType<typeof mapItemListRow>[], sort: ListItemsInput["sort"], order: "asc" | "desc" | undefined) {
  const dir = (order ?? "asc") === "asc" ? 1 : -1;
  const locale = "pt-BR";
  const localeOpts: Intl.CollatorOptions = { sensitivity: "base" };
  const num = (v: string) => (v === "--" ? -Infinity : Number(v));
  mapped.sort((a, b) => {
    switch (sort) {
      case "code": {
        const aN = Number(a.code), bN = Number(b.code);
        if (!isNaN(aN) && !isNaN(bN)) return dir * (aN - bN);
        return dir * a.code.localeCompare(b.code, locale, localeOpts);
      }
      case "baseUnitCost":     return dir * (num(a.baseUnitCost) - num(b.baseUnitCost));
      case "usagePrice":       return dir * (num(a.usagePrice) - num(b.usagePrice));
      case "purchaseQuantity": return dir * (num(a.purchaseQuantity) - num(b.purchaseQuantity));
      case "conversionFactor": return dir * (num(a.conversionFactor) - num(b.conversionFactor));
      case "usageQuantity":    return dir * (num(a.usageQuantity) - num(b.usageQuantity));
      case "supplierName": {
        const aV = a.supplierName === "--" ? "" : a.supplierName;
        const bV = b.supplierName === "--" ? "" : b.supplierName;
        return dir * aV.localeCompare(bV, locale, localeOpts);
      }
      default: return 0;
    }
  });
}

async function listItemsWithPrisma(input: ListItemsInput & { restaurantId: string }) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  const query = input.query.trim();
  const where: Prisma.ItemWhereInput = {
    cd_restaurante: input.restaurantId,
    fichasResultantes: { none: {} },
    AND: [
      input.type && input.type !== "all" ? { tp_item: input.type } : {},
      input.status === "ativos" ? { sn_ativo: true } : {},
      input.status === "inativos" ? { sn_ativo: false } : {},
      input.category && input.category !== "all"
        ? { nm_categoria_operacional: { equals: input.category, mode: "insensitive" as const } }
        : {},
      query
        ? {
            OR: [
              { nm_item: { contains: query, mode: "insensitive" } },
              { ds_codigo_interno: { contains: query, mode: "insensitive" } },
              { nm_categoria_operacional: { contains: query, mode: "insensitive" } },
              {
                aliases: {
                  some: {
                    nm_alias: {
                      contains: query,
                      mode: "insensitive"
                    }
                  }
                }
              }
            ]
          }
        : {}
    ]
  };

  const itemInclude: Prisma.ItemInclude = {
    unidadeEstoque: true,
    unidadeUsoPadrao: true,
    compras: {
      orderBy: [{ sn_principal: "desc" }, { ts_atualizacao_preco: "desc" }, { ts_criacao: "desc" }],
      include: {
        fornecedor: { select: { nm_fornecedor: true } },
        unidadeCompra: true,
        unidadeUso: true
      }
    },
    fichasResultantes: {
      where: { tp_status: { in: ["ativa", "rascunho", "inativa"] } },
      orderBy: [{ tp_status: "asc" }],
      take: 1
    },
    custosSnapshot: { orderBy: { ts_calculo: "desc" }, take: 1 },
    execucoesCalculo: {
      orderBy: { ts_criacao: "desc" },
      take: 1,
      select: { ts_criacao: true, js_metadados: true }
    }
  };

  const needsInMemorySort = input.sort && (COMPLEX_ITEM_SORT_FIELDS as readonly string[]).includes(input.sort);

  try {
    if (needsInMemorySort) {
      const [totalCount, allItems] = await Promise.all([
        prisma.item.count({ where }),
        prisma.item.findMany({ where, orderBy: { nm_item: "asc" }, include: itemInclude })
      ]);
      const mapped = (allItems as unknown as CatalogItemRecord[]).map(mapItemListRow);
      sortMappedItems(mapped, input.sort, input.order);
      const safePage = Math.max(input.page, 1);
      const offset = (safePage - 1) * input.pageSize;
      return {
        items: mapped.slice(offset, offset + input.pageSize),
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
        page: safePage
      };
    }

    const [totalCount, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        orderBy: buildItemsOrderBy(input.sort, input.order),
        skip: (Math.max(input.page, 1) - 1) * input.pageSize,
        take: input.pageSize,
        include: itemInclude
      })
    ]);

    return {
      items: (items as unknown as CatalogItemRecord[]).map(mapItemListRow),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
      page: Math.max(input.page, 1)
    };
  } catch {
    return null;
  }
}

async function getItemDetailWithPrisma(itemId: string, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const item = await queryItem(prisma, itemId);
    if (item && item.cd_restaurante !== restaurantId) {
      return null;
    }
    return item ? mapItemDetail(item) : null;
  } catch {
    return null;
  }
}

async function listItemOptionsWithPrisma(restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const items = await prisma.item.findMany({
      where: { sn_ativo: true, cd_restaurante: restaurantId },
      orderBy: { nm_item: "asc" },
      include: {
        unidadeEstoque: true,
        unidadeUsoPadrao: true,
        // aliases e conversoes nao sao usados em mapItemOption; omitir para reduzir payload
        compras: {
          orderBy: [{ sn_principal: "desc" }, { ts_atualizacao_preco: "desc" }, { ts_criacao: "desc" }],
          include: {
            fornecedor: {
              select: { nm_fornecedor: true }
            },
            unidadeCompra: true,
            unidadeUso: true
          }
        },
        fichasResultantes: {
          where: {
            tp_status: {
              in: ["ativa", "rascunho", "inativa"]
            }
          },
          orderBy: [{ tp_status: "asc" }],
          take: 1
        },
        custosSnapshot: {
          orderBy: { ts_calculo: "desc" },
          take: 1
        },
        execucoesCalculo: {
          orderBy: { ts_criacao: "desc" },
          take: 1,
          select: {
            ts_criacao: true,
            js_metadados: true
          }
        }
      }
    });

    return (items as unknown as CatalogItemRecord[]).map(mapItemOption);
  } catch {
    return null;
  }
}

async function saveItemWithPrisma(input: SaveItemInput & { restaurantId: string }) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      // Phase 08-04: derivar legacy columns do purchase principal (D-03 + 08-02 presenter pattern).
      const primaryPurchaseForUnits =
        input.purchases.find((purchase) => purchase.purchaseIsPrimary) ?? input.purchases[0];
      const stockUnitCode = primaryPurchaseForUnits?.purchaseUnit?.trim() || "un";
      const usageUnitCode =
        (primaryPurchaseForUnits?.usageUnit ?? "").trim() || stockUnitCode;
      // conversionFactor = quantidadeCompra / quantidadeUso (sempre computado — D-02).
      const primaryQC = Number(primaryPurchaseForUnits?.purchaseQuantity ?? "1");
      const primaryQU = Number(primaryPurchaseForUnits?.usageQuantity ?? "1");
      const derivedConversionFactor =
        Number.isFinite(primaryQC) && Number.isFinite(primaryQU) && primaryQU > 0
          ? (primaryQC / primaryQU).toFixed(4)
          : "1.0000";
      const stockUnit = await ensureUnit(tx, stockUnitCode);
      const usageUnit = await ensureUnit(tx, usageUnitCode);
      const normalizedCode = input.code.trim();
      let code = normalizedCode;
      if (!normalizedCode) {
        const existingCodes = await tx.item.findMany({
          where: { cd_restaurante: input.restaurantId, ds_codigo_interno: { not: null } },
          select: { ds_codigo_interno: true }
        });
        const maxNumeric = existingCodes.reduce((max, item) => {
          const n = Number(item.ds_codigo_interno);
          return Number.isInteger(n) && n > max ? n : max;
        }, 0);
        code = String(maxNumeric + 1);
      }
      const duplicateCode = await tx.item.findFirst({
        where: {
          ds_codigo_interno: code,
          cd_restaurante: input.restaurantId,
          ...(input.id ? { NOT: { cd_item: input.id } } : {})
        },
        select: { cd_item: true }
      });

      if (input.id) {
        const existing = await tx.item.findUnique({
          where: { cd_item: input.id },
          select: { cd_restaurante: true }
        });
        if (existing && existing.cd_restaurante !== input.restaurantId) {
          throw new CatalogRepositoryError("Acesso negado. Item pertence a outro restaurante.");
        }
      }

      // Se código já existe e não estamos editando explicitamente, reutiliza o id do existente
      const resolvedId = input.id ?? duplicateCode?.cd_item;

      const item = resolvedId
        ? await tx.item.update({
            where: { cd_item: resolvedId },
            data: {
              ds_codigo_interno: code,
              nm_item: input.name,
              nm_normalizado: toNormalizedName(input.name),
              ds_descricao: input.description,
              tp_item: input.type,
              nm_categoria_operacional: input.operationalCategory,
              cd_unidade_estoque: stockUnit.cd_unidade_medida,
              cd_unidade_uso_padrao: usageUnit.cd_unidade_medida,
              sn_ativo: input.active
            }
          })
        : await tx.item.create({
            data: {
              ds_codigo_interno: code,
              nm_item: input.name,
              nm_normalizado: toNormalizedName(input.name),
              ds_descricao: input.description,
              tp_item: input.type,
              nm_categoria_operacional: input.operationalCategory,
              cd_unidade_estoque: stockUnit.cd_unidade_medida,
              cd_unidade_uso_padrao: usageUnit.cd_unidade_medida,
              sn_ativo: input.active,
              cd_restaurante: input.restaurantId
            }
          });

      const conversionPairs = new Map<string, { originId: string; targetId: string }>();
      conversionPairs.set(`${stockUnit.cd_unidade_medida}:${usageUnit.cd_unidade_medida}`, {
        originId: stockUnit.cd_unidade_medida,
        targetId: usageUnit.cd_unidade_medida
      });

      for (const purchase of input.purchases) {
        const purchaseUnit = await ensureUnit(tx, purchase.purchaseUnit);
        conversionPairs.set(`${purchaseUnit.cd_unidade_medida}:${usageUnit.cd_unidade_medida}`, {
          originId: purchaseUnit.cd_unidade_medida,
          targetId: usageUnit.cd_unidade_medida
        });
      }

      for (const pair of conversionPairs.values()) {
        if (pair.originId === pair.targetId) {
          continue;
        }

        await tx.conversaoUnidade.upsert({
          where: {
            cd_item_cd_unidade_origem_cd_unidade_destino: {
              cd_item: item.cd_item,
              cd_unidade_origem: pair.originId,
              cd_unidade_destino: pair.targetId
            }
          },
          update: {
            vl_fator: derivedConversionFactor
          },
          create: {
            cd_item: item.cd_item,
            cd_unidade_origem: pair.originId,
            cd_unidade_destino: pair.targetId,
            vl_fator: derivedConversionFactor,
            ds_origem: "cadastro_web"
          }
        });
      }

      await tx.itemCompra.deleteMany({
        where: { cd_item: item.cd_item }
      });

      for (const purchase of input.purchases) {
        const supplier = await tx.fornecedor.upsert({
          where: { nm_fornecedor: purchase.supplierName.trim() },
          update: {
            sn_ativo: true
          },
          create: {
            nm_fornecedor: purchase.supplierName.trim(),
            sn_ativo: true
          }
        });

        const purchaseUnit = await ensureUnit(tx, purchase.purchaseUnit);

        // D-05/D-08: unidadeUsoId e quantidadeUso persistem APENAS no principal.
        // Secundarios: armazenar null (presenter deriva do principal na leitura).
        let unidadeUsoIdForRow: string | null = null;
        let quantidadeUsoForRow: string | null = null;
        if (purchase.purchaseIsPrimary) {
          const usageUnitCode = (purchase.usageUnit ?? "").trim() || purchase.purchaseUnit;
          const unidadeUsoRow = await ensureUnit(tx, usageUnitCode);
          unidadeUsoIdForRow = unidadeUsoRow.cd_unidade_medida;
          const qu = (purchase.usageQuantity ?? "").trim();
          quantidadeUsoForRow = qu.length > 0 ? qu : "1.0000";
        }

        await tx.itemCompra.create({
          data: {
            cd_item: item.cd_item,
            cd_fornecedor: supplier.cd_fornecedor,
            cd_unidade_compra: purchaseUnit.cd_unidade_medida,
            cd_unidade_uso: unidadeUsoIdForRow,
            sn_principal: purchase.purchaseIsPrimary,
            vl_qtd_embalagem: purchase.purchaseQuantity,
            vl_qtd_uso: quantidadeUsoForRow,
            vl_custo_compra: purchase.purchaseCost,
            vl_custo_unitario_base: calculateCanonicalUnitCost(
              purchase.purchaseCost,
              purchase.purchaseQuantity,
              purchase.purchaseUnit
            ).toString(),
            ts_atualizacao_preco: parsePurchaseUpdatedAt(purchase.priceUpdatedAt)
          }
        });
      }

      return item;
    });

    if (!input.skipCascadeRecalculate) {
      await recalculateCascade(prisma, [item.cd_item], "item.save.web");
      return getItemDetailWithPrisma(item.cd_item, input.restaurantId);
    }
    return null;
  } catch (error) {
    if (error instanceof CatalogRepositoryError) {
      throw error;
    }

    return null;
  }
}

async function countLinkedFichasWithPrisma(
  client: NonNullable<ReturnType<typeof getPrismaClient>>,
  itemId: string
) {
  const linkedFichas = await client.fichaTecnica.findMany({
    where: {
      OR: [{ cd_item_resultante: itemId }, { componentes: { some: { cd_item_componente: itemId } } }]
    },
    select: { cd_ficha_tecnica: true }
  });

  return new Set(linkedFichas.map((ficha) => ficha.cd_ficha_tecnica)).size;
}

async function patchItemQuickWithPrisma(
  input: { itemId: string; name?: string; purchaseCost?: string },
  restaurantId: string
) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return null;

  try {
    if (input.name !== undefined) {
      await prisma.item.update({
        where: { cd_item: input.itemId, cd_restaurante: restaurantId },
        data: { nm_item: input.name.trim() }
      });
    }

    if (input.purchaseCost !== undefined) {
      const parsed = Number(input.purchaseCost);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Preço de compra inválido.");

      const primaryPurchase = await prisma.itemCompra.findFirst({
        where: { cd_item: input.itemId, sn_principal: true },
        include: { unidadeCompra: true }
      });

      if (primaryPurchase) {
        const canonicalCost = calculateCanonicalUnitCost(
          String(parsed),
          String(primaryPurchase.vl_qtd_embalagem),
          primaryPurchase.unidadeCompra?.ds_codigo ?? "un"
        );
        await prisma.itemCompra.update({
          where: { cd_item_compra: primaryPurchase.cd_item_compra },
          data: {
            vl_custo_compra: String(parsed),
            vl_custo_unitario_base: canonicalCost.toString()
          }
        });
        await recalculateCascade(prisma, [input.itemId], "item.patch.quick");
      }
    }

    return true;
  } catch (err) {
    if (err instanceof Error) throw err;
    return null;
  }
}

async function deleteItemWithPrisma(itemId: string, restaurantId: string): Promise<CatalogDeleteResult | null> {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const item = await prisma.item.findUnique({
      where: { cd_item: itemId },
      select: { cd_restaurante: true }
    });

    if (!item || item.cd_restaurante !== restaurantId) {
      return {
        success: false,
        reason: "Acesso negado. Item não encontrado ou de outro restaurante."
      };
    }

    const linkedFichaCount = await countLinkedFichasWithPrisma(prisma, itemId);

    if (linkedFichaCount > 0) {
      return {
        success: false,
        reason: buildDeleteBlockedMessage(linkedFichaCount)
      };
    }

    await prisma.item.delete({
      where: { cd_item: itemId }
    });

    return { success: true };
  } catch {
    return {
      success: false,
      reason: "Nao foi possivel excluir o item."
    };
  }
}

export function getCatalogRepository(restaurantId = "rest_padrao") {
  return {
    async listItems({ page, pageSize, query, type = "all", status = "all", category = "all", sort, order }: ListItemsInput) {
      const prismaResult = await listItemsWithPrisma({ page, pageSize, query, type, status, category, sort, order, restaurantId });
      if (prismaResult) {
        return prismaResult;
      }

      const normalizedQuery = query.trim().toLowerCase();
      const store = getDemoStore();

      const filtered = store.items.filter((item) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [item.name, item.code, item.operationalCategory, ...item.aliases]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesType = type === "all" ? true : item.type === type;
        const matchesStatus =
          status === "all" ? true : status === "ativos" ? item.active : !item.active;
        const matchesCategory =
          category === "all" ? true : item.operationalCategory.toLowerCase() === category.toLowerCase();

        return matchesQuery && matchesType && matchesStatus && matchesCategory;
      });

      const locale = "pt-BR";
      const localeOpts: Intl.CollatorOptions = { sensitivity: "base" };
      const dir = order === "desc" ? -1 : 1;
      const sorted = [...filtered].sort((l, r) => {
        switch (sort) {
          case "code": {
            const lN = Number(l.code), rN = Number(r.code);
            if (!isNaN(lN) && !isNaN(rN)) return dir * (lN - rN);
            return dir * l.code.localeCompare(r.code, locale, localeOpts);
          }
          case "name":     return dir * l.name.localeCompare(r.name, locale, localeOpts);
          case "type":     return dir * l.type.localeCompare(r.type, locale, localeOpts);
          case "category": return dir * l.operationalCategory.localeCompare(r.operationalCategory, locale, localeOpts);
          case "purchaseQuantity": return dir * (Number(l.purchaseQuantity) - Number(r.purchaseQuantity));
          case "stockUnit": return dir * l.stockUnit.localeCompare(r.stockUnit, locale, localeOpts);
          case "baseUnitCost": return dir * (Number(l.purchaseCost) - Number(r.purchaseCost));
          case "conversionFactor": return dir * (Number(l.conversionFactor) - Number(r.conversionFactor));
          case "usageQuantity": {
            const cf = (v: string) => Math.max(Number(v), 0.0001);
            return dir * (Number(l.purchaseQuantity) / cf(l.conversionFactor) - Number(r.purchaseQuantity) / cf(r.conversionFactor));
          }
          case "usageUnit": return dir * l.usageUnit.localeCompare(r.usageUnit, locale, localeOpts);
          case "usagePrice": {
            const cf = (v: string) => Math.max(Number(v), 0.0001);
            return dir * (Number(l.purchaseCost) / cf(l.conversionFactor) - Number(r.purchaseCost) / cf(r.conversionFactor));
          }
          case "supplierName": return dir * l.supplier.localeCompare(r.supplier, locale, localeOpts);
          case "active":   return dir * ((l.active ? 1 : 0) - (r.active ? 1 : 0));
          case "updatedAt": return dir * l.lastCalculationAt.localeCompare(r.lastCalculationAt);
          default: return l.name.localeCompare(r.name);
        }
      });
      const paginated = paginate(sorted, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toItemListRow)
      };
    },

    async getItemDetail(itemId: string) {
      const prismaResult = await getItemDetailWithPrisma(itemId, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const item = getDemoStore().items.find((entry) => entry.id === itemId);
      return item ? toItemDetail(item) : null;
    },

    async listItemOptions() {
      const prismaResult = await listItemOptionsWithPrisma(restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      return getDemoStore().items
        .filter((item) => item.active)
        .map(toItemOption)
        .sort((left, right) => left.name.localeCompare(right.name));
    },

    async saveItem(input: SaveItemInput) {
      if (input.skipCascadeRecalculate) {
        // Caminho bulk: salva via prisma sem cascade — caller chama recalculateItems() depois.
        await saveItemWithPrisma({ ...input, restaurantId });
        return null;
      }

      const prismaResult = await saveItemWithPrisma({ ...input, restaurantId });
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const now = new Date("2026-03-13T15:00:00.000Z").toISOString();
      const duplicateCode = store.items.find((item) => item.code === input.code && item.id !== input.id);

      if (duplicateCode) {
        throw new CatalogRepositoryError("Codigo de item ja cadastrado.", {
          code: ["Codigo ja cadastrado."]
        });
      }

      const primaryPurchase =
        input.purchases.find((purchase) => purchase.purchaseIsPrimary) ??
        [...input.purchases].sort((left, right) => parsePurchaseUpdatedAt(right.priceUpdatedAt).getTime() - parsePurchaseUpdatedAt(left.priceUpdatedAt).getTime())[0];
      const resolvedUpdatedAt = primaryPurchase?.priceUpdatedAt
        ? parsePurchaseUpdatedAt(primaryPurchase.priceUpdatedAt).toISOString()
        : now;
      const existing = input.id ? store.items.find((item) => item.id === input.id) : undefined;

      // Phase 08-04: derivar legacy fields do primaryPurchase (D-03 + 08-02 presenter pattern).
      const derivedStockUnit = primaryPurchase?.purchaseUnit ?? "un";
      const derivedUsageUnit =
        (primaryPurchase?.usageUnit ?? "").trim() || derivedStockUnit;
      const demoQC = Number(primaryPurchase?.purchaseQuantity ?? "1");
      const demoQU = Number(primaryPurchase?.usageQuantity ?? "1");
      const derivedConversionFactor =
        Number.isFinite(demoQC) && Number.isFinite(demoQU) && demoQU > 0
          ? (demoQC / demoQU).toFixed(4)
          : "1.0000";

      if (existing) {
        existing.code = input.code;
        existing.name = input.name;
        existing.normalizedName = toNormalizedName(input.name);
        existing.description = input.description;
        existing.type = input.type;
        existing.operationalCategory = input.operationalCategory;
        existing.stockUnit = derivedStockUnit;
        existing.usageUnit = derivedUsageUnit;
        existing.purchaseUnit = primaryPurchase?.purchaseUnit ?? existing.purchaseUnit;
        existing.purchaseQuantity = primaryPurchase?.purchaseQuantity ?? existing.purchaseQuantity;
        existing.purchaseCost = primaryPurchase?.purchaseCost ?? existing.purchaseCost;
        existing.conversionFactor = derivedConversionFactor;
        existing.supplier = primaryPurchase?.supplierName ?? existing.supplier;
        existing.active = input.active;
        existing.lastCalculationAt = resolvedUpdatedAt;
        existing.costs.direct = primaryPurchase?.purchaseCost ?? existing.costs.direct;
        existing.costs.total = primaryPurchase?.purchaseCost ?? existing.costs.total;
        recalculateDemoStoreCosts(store);
        persistDemoStore(store);

        return toItemDetail(existing);
      }

      const created: DemoItemRecord = {
        id: createDemoId("item"),
        code: input.code || `CAD-${store.items.length + 1}`,
        name: input.name,
        normalizedName: toNormalizedName(input.name),
        description: input.description,
        type: input.type,
        operationalCategory: input.operationalCategory,
        stockUnit: derivedStockUnit,
        usageUnit: derivedUsageUnit,
        purchaseUnit: primaryPurchase?.purchaseUnit ?? derivedStockUnit,
        purchaseQuantity: primaryPurchase?.purchaseQuantity ?? "1.0000",
        purchaseCost: primaryPurchase?.purchaseCost ?? "0.0000",
        conversionFactor: derivedConversionFactor,
        supplier: primaryPurchase?.supplierName ?? "Cadastro manual",
        active: input.active,
        aliases: [],
        lastCalculationAt: resolvedUpdatedAt,
        fichaStatus: null,
        costs: {
          direct: primaryPurchase?.purchaseCost ?? "0.0000",
          inherited: "0.0000",
          packaging: input.type === "embalagem" ? (primaryPurchase?.purchaseCost ?? "0.0000") : "0.0000",
          total: primaryPurchase?.purchaseCost ?? "0.0000"
        }
      };

      store.items.unshift(created);
      recalculateDemoStoreCosts(store);
      persistDemoStore(store);

      return toItemDetail(created);
    },

    async deleteItem(itemId: string): Promise<CatalogDeleteResult> {
      const prismaResult = await deleteItemWithPrisma(itemId, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const linkedFichas = store.fichas.filter(
        (ficha) => ficha.itemId === itemId || ficha.components.some((component) => component.itemId === itemId)
      );
      const linkedFichaCount = new Set(linkedFichas.map((ficha) => ficha.id)).size;

      if (linkedFichaCount > 0) {
        return {
          success: false,
          reason: buildDeleteBlockedMessage(linkedFichaCount)
        };
      }

      const item = store.items.find((entry) => entry.id === itemId);
      if (!item) {
        return {
          success: false,
          reason: "Item nao encontrado."
        };
      }

      store.items = store.items.filter((entry) => entry.id !== itemId);
      store.assemblyScenarios = store.assemblyScenarios
        .map((scenario) => ({
          ...scenario,
          includedItemIds: scenario.includedItemIds.filter((entry) => entry !== itemId)
        }))
        .filter((scenario) => scenario.includedItemIds.length > 0);
      persistDemoStore(store);

      return { success: true };
    },

    async patchItemQuick(input: { itemId: string; name?: string; purchaseCost?: string }) {
      await patchItemQuickWithPrisma(input, restaurantId);
    },

    async recalculateItems(itemIds: string[]) {
      if (!itemIds.length) return;
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);
      if (!prisma) return;
      await recalculateCascade(prisma, itemIds, "import.bulk");
    }
  };
}

export function resetCatalogRepositoryForTests() {
  resetDemoStore();
}
