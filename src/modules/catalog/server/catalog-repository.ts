import "server-only";
import { FichaStatus, type Prisma } from "@/generated/prisma/client";
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
      priceUpdatedAt: item.lastCalculationAt.slice(0, 10)
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
        priceUpdatedAt: item.lastCalculationAt.slice(0, 10),
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
    where: { codigo: normalized },
    update: {
      nome: buildUnitName(normalized),
      tipo: inferUnitTypeFromCode(normalized)
    },
    create: {
      codigo: normalized,
      nome: buildUnitName(normalized),
      tipo: inferUnitTypeFromCode(normalized)
    }
  });
}

async function queryItem(
  client: Prisma.TransactionClient | NonNullable<ReturnType<typeof getPrismaClient>>,
  itemId: string
) {
  return client.item.findUnique({
    where: { id: itemId },
    include: {
      unidadeEstoque: true,
      unidadeUsoPadrao: true,
      aliases: {
        orderBy: { alias: "asc" }
      },
      conversoes: true,
      compras: {
        orderBy: [{ principal: "desc" }, { dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
        include: {
          fornecedor: {
            select: { nome: true }
          },
          unidadeCompra: true,
          unidadeUso: true
        }
      },
      fichasResultantes: {
        where: {
          status: {
            in: [FichaStatus.ativa, FichaStatus.rascunho, FichaStatus.inativa]
          }
        },
        orderBy: [{ status: "asc" }, { versao: "desc" }],
        take: 5
      },
      custosSnapshot: {
        orderBy: { calculadoEm: "desc" },
        take: 1
      },
      execucoesCalculo: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: {
          criadoEm: true,
          metadadosJson: true
        }
      }
    }
  }) as Promise<CatalogItemRecord | null>;
}

async function listItemsWithPrisma(input: ListItemsInput) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  const query = input.query.trim();
  const where: Prisma.ItemWhereInput = {
    AND: [
      input.type && input.type !== "all" ? { tipoPrincipal: input.type } : {},
      input.status === "ativos" ? { ativo: true } : {},
      input.status === "inativos" ? { ativo: false } : {},
      input.category && input.category !== "all"
        ? { categoriaOperacional: { equals: input.category, mode: "insensitive" as const } }
        : {},
      query
        ? {
            OR: [
              { nome: { contains: query, mode: "insensitive" } },
              { codigoInterno: { contains: query, mode: "insensitive" } },
              { categoriaOperacional: { contains: query, mode: "insensitive" } },
              {
                aliases: {
                  some: {
                    alias: {
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

  try {
    const [totalCount, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        orderBy: { nome: "asc" },
        skip: (Math.max(input.page, 1) - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          unidadeEstoque: true,
          unidadeUsoPadrao: true,
          aliases: true,
          conversoes: true,
          compras: {
            orderBy: [{ principal: "desc" }, { dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
            include: {
              fornecedor: {
                select: { nome: true }
              },
              unidadeCompra: true,
              unidadeUso: true
            }
          },
          fichasResultantes: {
            where: {
              status: {
                in: [FichaStatus.ativa, FichaStatus.rascunho, FichaStatus.inativa]
              }
            },
            orderBy: [{ status: "asc" }, { versao: "desc" }],
            take: 5
          },
          custosSnapshot: {
            orderBy: { calculadoEm: "desc" },
            take: 1
          },
          execucoesCalculo: {
            orderBy: { criadoEm: "desc" },
            take: 1,
            select: {
              criadoEm: true,
              metadadosJson: true
            }
          }
        }
      })
    ]);

    return {
      items: (items as CatalogItemRecord[]).map(mapItemListRow),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
      page: Math.max(input.page, 1)
    };
  } catch {
    return null;
  }
}

async function getItemDetailWithPrisma(itemId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const item = await queryItem(prisma, itemId);
    return item ? mapItemDetail(item) : null;
  } catch {
    return null;
  }
}

async function listItemOptionsWithPrisma() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const items = await prisma.item.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        unidadeEstoque: true,
        unidadeUsoPadrao: true,
        aliases: true,
        conversoes: true,
        compras: {
          orderBy: [{ principal: "desc" }, { dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
          include: {
            fornecedor: {
              select: { nome: true }
            },
            unidadeCompra: true,
            unidadeUso: true
          }
        },
        fichasResultantes: {
          where: {
            status: {
              in: [FichaStatus.ativa, FichaStatus.rascunho, FichaStatus.inativa]
            }
          },
          orderBy: [{ status: "asc" }, { versao: "desc" }],
          take: 5
        },
        custosSnapshot: {
          orderBy: { calculadoEm: "desc" },
          take: 1
        },
        execucoesCalculo: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: {
            criadoEm: true,
            metadadosJson: true
          }
        }
      }
    });

    return (items as CatalogItemRecord[]).map(mapItemOption);
  } catch {
    return null;
  }
}

async function saveItemWithPrisma(input: SaveItemInput) {
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
      const generatedCode = `CAD-${Date.now().toString().slice(-6)}`;
      const code = normalizedCode || generatedCode;
      const duplicateCode = await tx.item.findFirst({
        where: {
          codigoInterno: code,
          ...(input.id ? { NOT: { id: input.id } } : {})
        },
        select: { id: true }
      });

      if (duplicateCode) {
        throw new CatalogRepositoryError("Codigo de item ja cadastrado.", {
          code: ["Codigo ja cadastrado."]
        });
      }

      const item = input.id
        ? await tx.item.update({
            where: { id: input.id },
            data: {
              codigoInterno: code,
              nome: input.name,
              nomeNormalizado: toNormalizedName(input.name),
              descricao: input.description,
              tipoPrincipal: input.type,
              categoriaOperacional: input.operationalCategory,
              unidadeEstoqueId: stockUnit.id,
              unidadeUsoPadraoId: usageUnit.id,
              ativo: input.active
            }
          })
        : await tx.item.create({
            data: {
              codigoInterno: code,
              nome: input.name,
              nomeNormalizado: toNormalizedName(input.name),
              descricao: input.description,
              tipoPrincipal: input.type,
              categoriaOperacional: input.operationalCategory,
              unidadeEstoqueId: stockUnit.id,
              unidadeUsoPadraoId: usageUnit.id,
              ativo: input.active
            }
          });

      const conversionPairs = new Map<string, { originId: string; targetId: string }>();
      conversionPairs.set(`${stockUnit.id}:${usageUnit.id}`, {
        originId: stockUnit.id,
        targetId: usageUnit.id
      });

      for (const purchase of input.purchases) {
        const purchaseUnit = await ensureUnit(tx, purchase.purchaseUnit);
        conversionPairs.set(`${purchaseUnit.id}:${usageUnit.id}`, {
          originId: purchaseUnit.id,
          targetId: usageUnit.id
        });
      }

      for (const pair of conversionPairs.values()) {
        if (pair.originId === pair.targetId) {
          continue;
        }

        await tx.conversaoUnidade.upsert({
          where: {
            itemId_unidadeOrigemId_unidadeDestinoId: {
              itemId: item.id,
              unidadeOrigemId: pair.originId,
              unidadeDestinoId: pair.targetId
            }
          },
          update: {
            fator: derivedConversionFactor
          },
          create: {
            itemId: item.id,
            unidadeOrigemId: pair.originId,
            unidadeDestinoId: pair.targetId,
            fator: derivedConversionFactor,
            origem: "cadastro_web"
          }
        });
      }

      await tx.itemCompra.deleteMany({
        where: { itemId: item.id }
      });

      for (const purchase of input.purchases) {
        const supplier = await tx.fornecedor.upsert({
          where: { nome: purchase.supplierName.trim() },
          update: {
            ativo: true
          },
          create: {
            nome: purchase.supplierName.trim(),
            ativo: true
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
          unidadeUsoIdForRow = unidadeUsoRow.id;
          const qu = (purchase.usageQuantity ?? "").trim();
          quantidadeUsoForRow = qu.length > 0 ? qu : "1.0000";
        }

        await tx.itemCompra.create({
          data: {
            itemId: item.id,
            fornecedorId: supplier.id,
            unidadeCompraId: purchaseUnit.id,
            unidadeUsoId: unidadeUsoIdForRow,
            principal: purchase.purchaseIsPrimary,
            quantidadePorEmbalagem: purchase.purchaseQuantity,
            quantidadeUso: quantidadeUsoForRow,
            custoCompra: purchase.purchaseCost,
            custoUnitarioBase: calculateCanonicalUnitCost(
              purchase.purchaseCost,
              purchase.purchaseQuantity,
              purchase.purchaseUnit
            ).toString(),
            dataAtualizacaoPreco: parsePurchaseUpdatedAt(purchase.priceUpdatedAt)
          }
        });
      }

      return item;
    });

    await recalculateCascade(prisma, [item.id], "item.save.web");
    return getItemDetailWithPrisma(item.id);
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
      OR: [{ itemResultanteId: itemId }, { componentes: { some: { itemComponenteId: itemId } } }]
    },
    select: { id: true }
  });

  return new Set(linkedFichas.map((ficha) => ficha.id)).size;
}

async function deleteItemWithPrisma(itemId: string): Promise<CatalogDeleteResult | null> {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const linkedFichaCount = await countLinkedFichasWithPrisma(prisma, itemId);

    if (linkedFichaCount > 0) {
      return {
        success: false,
        reason: buildDeleteBlockedMessage(linkedFichaCount)
      };
    }

    await prisma.item.delete({
      where: { id: itemId }
    });

    return { success: true };
  } catch {
    return {
      success: false,
      reason: "Nao foi possivel excluir o item."
    };
  }
}

export function getCatalogRepository() {
  return {
    async listItems({ page, pageSize, query, type = "all", status = "all", category = "all" }: ListItemsInput) {
      const prismaResult = await listItemsWithPrisma({ page, pageSize, query, type, status, category });
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

      const sorted = [...filtered].sort((left, right) => left.name.localeCompare(right.name));
      const paginated = paginate(sorted, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toItemListRow)
      };
    },

    async getItemDetail(itemId: string) {
      const prismaResult = await getItemDetailWithPrisma(itemId);
      if (prismaResult) {
        return prismaResult;
      }

      const item = getDemoStore().items.find((entry) => entry.id === itemId);
      return item ? toItemDetail(item) : null;
    },

    async listItemOptions() {
      const prismaResult = await listItemOptionsWithPrisma();
      if (prismaResult) {
        return prismaResult;
      }

      return getDemoStore().items
        .filter((item) => item.active)
        .map(toItemOption)
        .sort((left, right) => left.name.localeCompare(right.name));
    },

    async saveItem(input: SaveItemInput) {
      const prismaResult = await saveItemWithPrisma(input);
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
      const prismaResult = await deleteItemWithPrisma(itemId);
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
    }
  };
}

export function resetCatalogRepositoryForTests() {
  resetDemoStore();
}
