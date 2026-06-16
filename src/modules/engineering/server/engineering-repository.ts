import "server-only";
import {
  type Prisma
} from "@/generated/prisma/client";
import type { item_type } from "@/generated/prisma/client";
import {
  assertNoCyclesBeforeSaving,
  rebuildDependencyClosureForItem,
  recalculateCascadeInTransaction
} from "@/modules/engineering/server/cost-engine-service";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import {
  denormalizeQuantityFromCanonical,
  inferUnitTypeFromCode,
  normalizeQuantityToCanonical,
  normalizeUnitCode
} from "@/modules/platform/domain/units";
import { getServerEnv } from "@/modules/platform/server/env";
import {
  cloneDemoStore,
  createDemoId,
  getDemoStore,
  persistDemoStore,
  resetDemoStore,
  type DemoComponentRecord,
  type DemoFichaRecord,
  type DemoFichaStatus,
  type DemoItemRecord,
  type DemoStageRecord
} from "@/modules/platform/server/demo-data";
import { recalculateDemoStoreCosts } from "@/modules/platform/server/demo-costing";

export type FichaSortBy = "code" | "produto" | "modalidade" | "grupo" | "fc" | "ic" | "totalCost" | "sellingPrice" | "margem" | "updatedAt" | "status" | "componentes" | "obs";

export interface ListFichasInput {
  page: number;
  pageSize: number;
  query: string;
  status?: DemoFichaStatus | "all";
  modalidade?: string;
  grupo?: string;
  sortBy?: FichaSortBy;
  sortDir?: "asc" | "desc";
}

export interface SaveFichaInput {
  id?: string;
  code?: string;
  itemId?: string;
  displayName: string;
  itemType: DemoFichaRecord["itemType"];
  groupOperational: string;
  modalityId: string;
  yieldUnitCode: string;
  status: DemoFichaStatus;
  yieldMode: DemoFichaRecord["yieldMode"];
  percentLoss?: string | null;
  finalWeight?: string | null;
  portions: string;
  salePrice?: string;
  variableExpensePercent?: string;
  preparationMode: string;
  notes: string;
  stages: Array<{
    id?: string;
    name: string;
    stageTypeId?: string;
    stageTypeCode?: string;
    outputQuantity: string;
    correctionFactor?: string;
    cookingIndex?: string;
    notes?: string;
    items: Array<{
      itemId: string;
      componentType: DemoComponentRecord["componentType"];
      quantityUsed: string;
      usageUnit: string;
      levelLabel?: string;
      notes?: string;
      outputWeight?: string;
      correctionFactor?: string;
      cookingIndex?: string;
    }>;
  }>;
  components: Array<{
    itemId: string;
    componentType: DemoComponentRecord["componentType"];
    quantityGross: string;
    quantityNet: string;
    usageUnit: string;
    correctionFactor?: string;
    cookingIndex?: string;
    notes?: string;
  }>;
}

type FichaRecord = Awaited<ReturnType<typeof queryFicha>>;

function parseOptionalDecimal(value?: string | null) {
  if (!value || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatOptionalMetric(value: number | null, fallback = "--") {
  return value !== null && Number.isFinite(value) ? value.toFixed(4) : fallback;
}

function normalizePercentInput(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return value > 1 ? value / 100 : value;
}

function resolveCmvHealthStatus(cmvRatio: number | null) {
  if (cmvRatio === null || !Number.isFinite(cmvRatio)) {
    return "Indefinido" as const;
  }

  const percent = cmvRatio * 100;
  if (percent < 30) {
    return "Excelente" as const;
  }

  if (percent < 35) {
    return "Saudavel" as const;
  }

  if (percent < 40) {
    return "Atencao" as const;
  }

  return "Critico" as const;
}

function resolveAutomaticDiagnosis(input: {
  hasSalePrice: boolean;
  contributionMarginValue: number | null;
  cmvRatio: number | null;
}) {
  if (!input.hasSalePrice) {
    return "Informe o preco de venda para calcular margem e CMV.";
  }

  if (input.contributionMarginValue === null || input.cmvRatio === null) {
    return "Diagnostico automatico indisponivel: faltam dados validos para simular a ficha.";
  }

  if (input.contributionMarginValue <= 0 || input.cmvRatio > 0.4) {
    return "Diagnostico automatico: Critico. O custo final e as despesas consomem a venda projetada.";
  }

  if (input.cmvRatio > 0.3) {
    return "Diagnostico automatico: Atencao. A margem existe, mas esta apertada para a operacao.";
  }

  return "Diagnostico automatico: Saudavel. A ficha sustenta margem positiva dentro da faixa alvo.";
}

function toNormalizedName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveFichaDisplayName(input: { displayName?: string | null; canonicalName: string }) {
  const trimmed = input.displayName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : input.canonicalName;
}

function buildFichaIndicators(input: { totalGross: string; totalNet: string; finalOutput: string }) {
  const totalGross = parseOptionalDecimal(input.totalGross);
  const totalNet = parseOptionalDecimal(input.totalNet);
  const finalOutput = parseOptionalDecimal(input.finalOutput);

  return {
    correctionFactor:
      totalGross !== null && totalGross > 0 && totalNet !== null ? (totalNet / totalGross).toFixed(4) : null,
    cookingIndex:
      totalNet !== null && totalNet > 0 && finalOutput !== null ? (finalOutput / totalNet).toFixed(4) : null
  };
}

function resolveDemoFichaItem(store: ReturnType<typeof getDemoStore>, input: SaveFichaInput) {
  const normalizedName = toNormalizedName(input.displayName);

  if (input.itemId) {
    const linkedItem = store.items.find((item) => item.id === input.itemId);

    if (!linkedItem) {
      throw new Error(`Item ${input.itemId} nao encontrado.`);
    }

    if (linkedItem.normalizedName !== normalizedName) {
      const targetItem = store.items.find((item) => item.normalizedName === normalizedName);
      if (targetItem) {
        if (input.code) {
          targetItem.code = input.code.trim();
        }
        return targetItem;
      }

      const created: DemoItemRecord = {
        id: createDemoId("item"),
        code: input.code?.trim() || `FCH-${String(store.items.length + 1).padStart(3, "0")}`,
        name: input.displayName.trim(),
        normalizedName,
        description: "Item canonico criado automaticamente a partir da ficha tecnica.",
        type: input.itemType,
        operationalCategory: input.groupOperational,
        stockUnit: input.yieldUnitCode,
        usageUnit: input.yieldUnitCode,
        purchaseUnit: input.yieldUnitCode,
        purchaseQuantity: "1.0000",
        purchaseCost: "0.0000",
        conversionFactor: "1.0000",
        supplier: "Cadastro automatico da ficha",
        active: true,
        aliases: [],
        lastCalculationAt: "2026-03-13T15:10:00.000Z",
        fichaStatus: null,
        costs: {
          direct: "0.0000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "0.0000"
        }
      };
      store.items.unshift(created);
      return created;
    }

    return linkedItem;
  }

  const existing = store.items.find((item) => item.normalizedName === normalizedName);

  if (existing) {
    if (input.code) {
      existing.code = input.code.trim();
    }
    existing.type = input.itemType;
    return existing;
  }

  const created: DemoItemRecord = {
    id: createDemoId("item"),
    code: input.code?.trim() || `FCH-${String(store.items.length + 1).padStart(3, "0")}`,
    name: input.displayName.trim(),
    normalizedName,
    description: "Item canonico criado automaticamente a partir da ficha tecnica.",
    type: input.itemType,
    operationalCategory: input.groupOperational,
    stockUnit: input.yieldUnitCode,
    usageUnit: input.yieldUnitCode,
    purchaseUnit: input.yieldUnitCode,
    purchaseQuantity: "1.0000",
    purchaseCost: "0.0000",
    conversionFactor: "1.0000",
    supplier: "Cadastro automatico da ficha",
    active: true,
    aliases: [],
    lastCalculationAt: "2026-03-13T15:10:00.000Z",
    fichaStatus: null,
    costs: {
      direct: "0.0000",
      inherited: "0.0000",
      packaging: "0.0000",
      total: "0.0000"
    }
  };

  store.items.unshift(created);
  return created;
}

function isCommercialSummaryApplicable(itemType: DemoFichaRecord["itemType"]) {
  return ["prato", "porcao", "marmita", "combo"].includes(itemType);
}

function buildCommercialSummary(input: {
  itemType: DemoFichaRecord["itemType"];
  totalGross: string;
  totalNet: string;
  postCookingWeight: string;
  cookingFactorGross: string | null;
  cookingFactorNet: string | null;
  totalInputCost: string;
  costWithoutPackagingPerKg: string | null;
  cmvPerKg: string;
  packagingCost: string;
  salePrice?: string | null;
  variableExpensePercent?: string | null;
  preparationModePreview?: string;
}) {
  const salePriceNumber = parseOptionalDecimal(input.salePrice);
  const variableExpensePercentNumber = normalizePercentInput(parseOptionalDecimal(input.variableExpensePercent));
  const postCookingWeightNumber = parseOptionalDecimal(input.postCookingWeight);
  const totalInputCostNumber = parseOptionalDecimal(input.totalInputCost) ?? 0;
  const packagingCostNumber = parseOptionalDecimal(input.packagingCost) ?? 0;
  const costWithoutPackagingPerKgNumber = parseOptionalDecimal(input.costWithoutPackagingPerKg);
  const costRealNumber = totalInputCostNumber + packagingCostNumber;
  const assemblyEnabled = packagingCostNumber > 0;
  const hasUsableWeight = postCookingWeightNumber !== null && postCookingWeightNumber > 0;
  const hasUsableSalePrice = salePriceNumber !== null && salePriceNumber > 0;
  const variableExpenseValue =
    salePriceNumber !== null && variableExpensePercentNumber !== null
      ? salePriceNumber * variableExpensePercentNumber
      : null;

  const cmvWithPackagingPerKgNumber = hasUsableWeight ? costRealNumber / postCookingWeightNumber : null;
  const finalAppliedCmvNumber = assemblyEnabled
    ? cmvWithPackagingPerKgNumber
    : costWithoutPackagingPerKgNumber;
  
  const costForMarginCalc = hasUsableWeight && finalAppliedCmvNumber !== null ? finalAppliedCmvNumber : costRealNumber;

  const contributionMarginValue =
    salePriceNumber !== null && variableExpenseValue !== null
      ? salePriceNumber - costForMarginCalc - variableExpenseValue
      : null;
  const contributionMarginPercent =
    hasUsableSalePrice && contributionMarginValue !== null
      ? contributionMarginValue / salePriceNumber
      : null;
  const finalAppliedCost = assemblyEnabled ? costRealNumber : totalInputCostNumber;
  const cmvPercentOfSale = hasUsableSalePrice ? finalAppliedCost / salePriceNumber : null;
  const mealCmv =
    isCommercialSummaryApplicable(input.itemType) && hasUsableSalePrice
      ? costRealNumber / salePriceNumber
      : null;
  const packagingShareOnCmv = costRealNumber > 0 ? packagingCostNumber / costRealNumber : null;
  const cmvHealthStatus = resolveCmvHealthStatus(cmvPercentOfSale);
  const automaticDiagnosis = resolveAutomaticDiagnosis({
    hasSalePrice: hasUsableSalePrice,
    contributionMarginValue,
    cmvRatio: cmvPercentOfSale
  });
  const salePriceFallback = hasUsableSalePrice ? "--" : "Informe o valor";
  const weightFallback = hasUsableWeight ? "--" : "Calcular peso";

  return {
    totalGross: input.totalGross,
    totalNet: input.totalNet,
    postCookingWeight: input.postCookingWeight,
    cookingFactorGross: input.cookingFactorGross,
    cookingFactorNet: input.cookingFactorNet,
    totalInputCost: input.totalInputCost,
    costWithoutPackagingPerKg: formatOptionalMetric(costWithoutPackagingPerKgNumber, weightFallback),
    costWithPackagingPerKg: formatOptionalMetric(cmvWithPackagingPerKgNumber, weightFallback),
    cmvPerKg: formatOptionalMetric(cmvWithPackagingPerKgNumber, weightFallback),
    packagingCost: input.packagingCost,
    finalAppliedCmv: formatOptionalMetric(finalAppliedCmvNumber, weightFallback),
    finalAppliedCmvLabel: assemblyEnabled ? "CMV final aplicado (c/ emb.)" : "CMV final aplicado",
    cmvHealthStatus,
    cmvHealthPercent: formatOptionalMetric(cmvPercentOfSale, salePriceFallback),
    cmvPercentOfSale: formatOptionalMetric(cmvPercentOfSale, salePriceFallback),
    salePrice: formatOptionalMetric(salePriceNumber),
    referencePriceLabel: "Preco de Referencia",
    referencePrice: formatOptionalMetric(salePriceNumber),
    variableExpensePercent: formatOptionalMetric(variableExpensePercentNumber),
    variableExpensePercentLabel: "Despesa variavel de venda (%PV)",
    variableExpenseApplied: formatOptionalMetric(variableExpenseValue, salePriceFallback),
    variableExpenseAppliedLabel: "Despesa variavel aplicada",
    contributionMarginValue: formatOptionalMetric(contributionMarginValue, salePriceFallback),
    contributionMarginPercent: formatOptionalMetric(contributionMarginPercent, salePriceFallback),
    operationalMarginContribution: formatOptionalMetric(contributionMarginValue, salePriceFallback),
    operationalMarginContributionLabel: "Margem de Contribuicao",
    mealCmv: formatOptionalMetric(mealCmv, salePriceFallback),
    packagingShareOnCmv: formatOptionalMetric(packagingShareOnCmv),
    costReal: costRealNumber.toFixed(4),
    preparationModePreview: input.preparationModePreview ?? ""
    ,
    automaticDiagnosis,
    automaticDiagnosisLabel: "Diagnostico automatico",
    assemblyEnabled
  };
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

function asObject(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Prisma.JsonValue>;
}

function readString(metadata: Record<string, Prisma.JsonValue> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function readArray(metadata: Record<string, Prisma.JsonValue> | null, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value : [];
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

async function ensureModality(tx: Prisma.TransactionClient, modalityId: string) {
  const label = modalityId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return tx.modalidade.upsert({
    where: { ds_codigo: modalityId },
    update: {},
    create: { ds_codigo: modalityId, nm_modalidade: label }
  });
}

async function resolveCanonicalFichaItem(
  tx: Prisma.TransactionClient,
  input: SaveFichaInput,
  restaurantId: string
) {
  const normalizedName = toNormalizedName(input.displayName);

  if (input.itemId) {
    const existing = await tx.item.findUniqueOrThrow({
      where: { cd_item: input.itemId },
      include: {
        unidadeUsoPadrao: true
      }
    });

    if (existing.cd_restaurante && existing.cd_restaurante !== restaurantId) {
      throw new Error("Acesso negado. Item pertence a outro restaurante.");
    }

    if (existing.nm_normalizado !== normalizedName) {
      const targetItem = await tx.item.findUnique({
        where: {
          nm_normalizado_cd_restaurante: {
            nm_normalizado: normalizedName,
            cd_restaurante: restaurantId
          }
        },
        include: {
          unidadeUsoPadrao: true
        }
      });

      if (targetItem) {
        return tx.item.update({
          where: { cd_item: targetItem.cd_item },
          data: {
            nm_categoria_operacional: input.groupOperational,
            tp_item: input.itemType,
            ds_codigo_interno: targetItem.ds_codigo_interno ? undefined : (input.code?.trim() || null)
          },
          include: { unidadeUsoPadrao: true }
        });
      }

      // Nenhum item com o novo nome existe — renomeia o item atual in-place para
      // evitar violar a unique constraint (ds_codigo_interno, cd_restaurante).
      return tx.item.update({
        where: { cd_item: input.itemId },
        data: {
          nm_item: input.displayName.trim(),
          nm_normalizado: normalizedName,
          nm_categoria_operacional: input.groupOperational,
          tp_item: input.itemType,
          ds_codigo_interno: existing.ds_codigo_interno ? undefined : (input.code?.trim() || null)
        },
        include: {
          unidadeUsoPadrao: true
        }
      });
    }

    // Se o nome não mudou, apenas atualiza grupo operacional, tipo de item e o ds_codigo_interno se for nulo
    return tx.item.update({
      where: { cd_item: input.itemId },
      data: {
        nm_categoria_operacional: input.groupOperational,
        tp_item: input.itemType,
        ds_codigo_interno: existing.ds_codigo_interno ? undefined : (input.code?.trim() || null)
      },
      include: {
        unidadeUsoPadrao: true
      }
    });
  }

  const existing = await tx.item.findUnique({
    where: {
      nm_normalizado_cd_restaurante: {
        nm_normalizado: normalizedName,
        cd_restaurante: restaurantId
      }
    },
    include: {
      unidadeUsoPadrao: true
    }
  });

  if (existing) {
    if (existing.tp_item !== input.itemType) {
      return tx.item.update({
        where: { cd_item: existing.cd_item },
        data: { tp_item: input.itemType },
        include: { unidadeUsoPadrao: true }
      });
    }
    return existing;
  }

  const yieldUnit = await ensureUnit(tx, input.yieldUnitCode);

  return tx.item.upsert({
    where: {
      nm_normalizado_cd_restaurante: {
        nm_normalizado: normalizedName,
        cd_restaurante: restaurantId
      }
    },
    update: {},
    create: {
      nm_item: input.displayName.trim(),
      ds_codigo_interno: input.code?.trim() || null,
      nm_normalizado: normalizedName,
      nm_categoria_operacional: input.groupOperational,
      tp_item: input.itemType,
      cd_unidade_estoque: yieldUnit.cd_unidade_medida,
      cd_unidade_uso_padrao: yieldUnit.cd_unidade_medida,
      cd_restaurante: restaurantId,
      sn_ativo: true
    },
    include: {
      unidadeUsoPadrao: true
    }
  });
}

function formatDateTimeLabel(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function normalizeStageName(stageName: string, order: number) {
  const trimmed = stageName.trim();
  return trimmed.length > 0 ? trimmed : `Etapa ${order}`;
}

function resolveStageTypeName(stageTypeCode?: string | null) {
  if (stageTypeCode === "limpeza_pre_preparo") {
    return "Limpeza / Pre-Preparo";
  }

  if (stageTypeCode === "coccao_preparo") {
    return "Coccao / Preparo";
  }

  if (stageTypeCode === "montagem") {
    return "Montagem";
  }

  return "Etapa";
}

export function buildFichaReuseWarning(itemName: string, fichaName: string) {
  return `O item ${itemName} ja aparece na ficha ${fichaName}. Deseja consultar aquela estrutura?`;
}

async function ensureStageType(
  tx: Prisma.TransactionClient,
  input: { stageTypeId?: string; stageTypeCode?: string }
) {
  if (input.stageTypeId) {
    const existing = await tx.tipoEtapa.findUnique({
      where: { cd_tipo_etapa: input.stageTypeId }
    });
    if (existing) {
      return existing;
    }
  }

  if (!input.stageTypeCode) {
    return null;
  }

  return tx.tipoEtapa.upsert({
    where: { ds_codigo: input.stageTypeCode },
    update: {
      nm_tipo_etapa: resolveStageTypeName(input.stageTypeCode),
      sn_ativo: true
    },
    create: {
      ds_codigo: input.stageTypeCode,
      nm_tipo_etapa: resolveStageTypeName(input.stageTypeCode),
      sn_ativo: true
    }
  });
}

function buildFallbackStagesFromComponents<
  T extends {
    cd_item_componente: string;
    itemComponente: { nm_item: string; tp_item: string };
    unidadeUso: { ds_codigo: string };
    vl_qtd_bruta: { toFixed: (precision: number) => string };
    vl_qtd_limpa: { toFixed: (precision: number) => string } | null;
    vl_fator_correcao: { toFixed: (precision: number) => string } | null;
    vl_indice_coccao: { toFixed: (precision: number) => string } | null;
    ds_observacao: string | null;
  }
>(components: T[]) {
  return [
    {
      id: "legacy-stage",
      name: "Etapa 1",
      stageTypeId: undefined,
      stageTypeCode: undefined,
      stageTypeLabel: undefined,
      outputQuantity: "",
      correctionFactor: components[0]?.vl_fator_correcao?.toFixed(6) ?? "",
      cookingIndex: components[0]?.vl_indice_coccao?.toFixed(6) ?? "",
      notes: "",
      items: components.map((component) => {
        const hasCustomWeight = component.vl_fator_correcao !== null || component.vl_indice_coccao !== null;
        return {
          itemId: component.cd_item_componente,
          itemName: component.itemComponente.nm_item,
          componentType: component.itemComponente.tp_item === "embalagem"
            ? "embalagem"
            : component.itemComponente.tp_item === "apoio"
              ? "apoio"
              : "ingrediente",
          quantityUsed: component.vl_qtd_bruta.toFixed(4),
          quantityGross: component.vl_qtd_bruta.toFixed(4),
          quantityNet: component.vl_qtd_limpa?.toFixed(4) ?? component.vl_qtd_bruta.toFixed(4),
          usageUnit: component.unidadeUso.ds_codigo,
          levelLabel: "N1",
          correctionFactor: component.vl_fator_correcao?.toFixed(6) ?? "",
          cookingIndex: component.vl_indice_coccao?.toFixed(6) ?? "",
          outputWeight: hasCustomWeight && component.vl_qtd_limpa ? component.vl_qtd_limpa.toFixed(4) : "",
          notes: component.ds_observacao ?? ""
        };
      })
    }
  ];
}

async function queryFicha(
  client: Prisma.TransactionClient | NonNullable<ReturnType<typeof getPrismaClient>>,
  fichaId: string,
  restaurantId: string
) {
  return client.fichaTecnica.findUnique({
    where: {
      cd_ficha_tecnica: fichaId,
      cd_restaurante: restaurantId
    },
    include: {
      itemResultante: {
        include: {
          unidadeUsoPadrao: true,
          custosSnapshot: {
            orderBy: { ts_calculo: "desc" },
            take: 1
          }
        }
      },
      modalidade: true,
      unidadeRendimento: true,
      etapas: {
        orderBy: { nr_ordem: "asc" },
        include: {
          tipoEtapa: true,
          componentes: {
            orderBy: { nr_ordem: "asc" },
            include: {
              itemComponente: {
                select: {
                  nm_item: true,
                  tp_item: true,
                  unidadeUsoPadrao: true
                }
              },
              unidadeUso: true
            }
          }
        }
      },
      componentes: {
        orderBy: { nr_ordem: "asc" },
        include: {
          itemComponente: {
            select: {
              nm_item: true,
              tp_item: true,
              unidadeUsoPadrao: true
            }
          },
          unidadeUso: true
        }
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
}

function mapFichaCosts(record: NonNullable<FichaRecord>) {
  const metadata = asObject(record.execucoesCalculo[0]?.js_metadados ?? null);
  const usageUnit = record.itemResultante.unidadeUsoPadrao?.ds_codigo ?? "kg";
  const total =
    readString(metadata, "totalCost") ??
    record.itemResultante.custosSnapshot[0]?.vl_custo_total.toFixed(4) ??
    "0.0000";
  const rawFinalOutput = readString(metadata, "finalUsefulOutputQuantity") ?? "1.0000";

  return {
    direct: readString(metadata, "directCost") ?? total,
    inherited: readString(metadata, "inheritedCost") ?? "0.0000",
    packaging: record.itemResultante.custosSnapshot[0]?.vl_custo_embalagem?.toFixed(4) ?? "0.0000",
    total,
    perKg: readString(metadata, "costPerKg") ?? total,
    perPortion: readString(metadata, "costPerPortion"),
    finalOutput: denormalizeQuantityFromCanonical(rawFinalOutput, usageUnit).toFixed(4)
  };
}

function mapExpandedRows(record: NonNullable<FichaRecord>) {
  const metadata = asObject(record.execucoesCalculo[0]?.js_metadados ?? null);
  const rows = readArray(metadata, "expandedBreakdown");
  const fichaName = resolveFichaDisplayName({
    displayName: record.nm_exibicao,
    canonicalName: record.itemResultante.nm_item
  });

  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return null;
      }

      const typedRow = row as Record<string, Prisma.JsonValue>;
      const path = typeof typedRow.path === "string" ? typedRow.path : "";
      const itemName = typeof typedRow.itemName === "string" ? typedRow.itemName : "";
      const totalCost = typeof typedRow.totalCost === "string" ? typedRow.totalCost : "0.0000";

      const matchedComponent = record.componentes.find((component) => component.itemComponente && path.startsWith(component.itemComponente.nm_item));
      const componentType = matchedComponent?.tp_componente ?? "ingrediente";
      const usageUnit = matchedComponent?.unidadeUso.ds_codigo ?? matchedComponent?.itemComponente.unidadeUsoPadrao?.ds_codigo ?? "un";

      return {
        id: `${record.cd_ficha_tecnica}-${index}`,
        fichaId: record.cd_ficha_tecnica,
        fichaName,
        path,
        depth: Math.max(1, path.split(" > ").length),
        itemName,
        componentType,
        usageUnit,
        quantity: "calculado",
        totalCost
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

function mapStageRows(record: NonNullable<FichaRecord>) {
  const explicitStages = record.etapas.map((stage) => ({
    id: stage.cd_ficha_etapa,
    name: stage.nm_etapa,
    stageTypeId: stage.cd_tipo_etapa ?? undefined,
    stageTypeCode: stage.tipoEtapa?.ds_codigo ?? undefined,
    stageTypeLabel: stage.tipoEtapa?.nm_tipo_etapa ?? undefined,
    outputQuantity: stage.vl_peso_saida?.toFixed(4) ?? "",
    correctionFactor: stage.vl_fator_correcao?.toFixed(6) ?? "",
    cookingIndex: stage.vl_indice_coccao?.toFixed(6) ?? "",
    notes: stage.ds_observacao ?? "",
    items: stage.componentes.map((component, index) => {
      const hasCustomWeight = component.vl_fator_correcao !== null || component.vl_indice_coccao !== null;
      return {
        itemId: component.cd_item_componente,
        itemName: component.itemComponente?.nm_item ?? "",
        componentType: component.tp_componente,
        quantityUsed: component.vl_qtd_bruta.toFixed(4),
        quantityGross: component.vl_qtd_bruta.toFixed(4),
        quantityNet: component.vl_qtd_limpa?.toFixed(4) ?? component.vl_qtd_bruta.toFixed(4),
        usageUnit: component.unidadeUso?.ds_codigo ?? "kg",
        levelLabel: `N${index + 1}`,
        correctionFactor: component.vl_fator_correcao?.toFixed(6) ?? "",
        cookingIndex: component.vl_indice_coccao?.toFixed(6) ?? "",
        outputWeight: hasCustomWeight && component.vl_qtd_limpa ? component.vl_qtd_limpa.toFixed(4) : "",
        notes: component.ds_observacao ?? ""
      };
    })
  }));

  return explicitStages.length > 0 ? explicitStages : buildFallbackStagesFromComponents(record.componentes);
}

function mapFichaListRow(record: NonNullable<FichaRecord>) {
  const costs = mapFichaCosts(record);
  const totalGross = record.componentes.reduce((sum, component) => sum + Number(component.vl_qtd_bruta.toFixed(4)), 0);
  const totalNet = record.componentes.reduce(
    (sum, component) => sum + Number((component.vl_qtd_limpa ?? component.vl_qtd_bruta).toFixed(4)),
    0
  );
  const indicators = buildFichaIndicators({
    totalGross: totalGross.toFixed(4),
    totalNet: totalNet.toFixed(4),
    finalOutput: costs.finalOutput
  });
  const displayName = resolveFichaDisplayName({
    displayName: record.nm_exibicao,
    canonicalName: record.itemResultante.nm_item
  });

  const salePriceNumber = record.vl_preco_venda ? Number(record.vl_preco_venda) : 0;
  const totalCostNumber = Number(costs.total) || 0;
  const packagingCostNumber = Number(costs.packaging) || 0;
  const costWithoutPackagingNumber = Math.max(totalCostNumber - packagingCostNumber, 0);
  const variableExpensePercentNumber = normalizePercentInput(
    record.vl_pct_despesa_variavel ? Number(record.vl_pct_despesa_variavel) : null
  );

  const finalOutputNumber = Number(costs.finalOutput) || 0;
  const hasUsableWeight = finalOutputNumber > 0;
  const costWithoutPackagingPerKg = hasUsableWeight ? (costWithoutPackagingNumber / finalOutputNumber) : 0;
  const cmvWithPackagingPerKg = hasUsableWeight ? (totalCostNumber / finalOutputNumber) : 0;
  const assemblyEnabled = packagingCostNumber > 0;
  const finalAppliedCmv = assemblyEnabled ? cmvWithPackagingPerKg : costWithoutPackagingPerKg;
  const costForMarginCalc = hasUsableWeight ? finalAppliedCmv : totalCostNumber;

  const contributionMarginPercent =
    salePriceNumber > 0 && variableExpensePercentNumber !== null
      ? (salePriceNumber - costForMarginCalc - salePriceNumber * variableExpensePercentNumber) / salePriceNumber
      : null;

  return {
    id: record.cd_ficha_tecnica,
    itemId: record.cd_item_resultante,
    code: record.itemResultante.ds_codigo_interno ? `${record.itemResultante.ds_codigo_interno}-V${record.nr_versao}` : "--",
    itemName: displayName,
    itemType: record.itemResultante.tp_item,
    version: record.nr_versao,
    modalityLabel: record.modalidade?.nm_modalidade ?? "Sem modalidade",
    groupOperational: record.itemResultante.nm_categoria_operacional ?? "Sem grupo",
    status: record.tp_status,
    correctionFactor: indicators.correctionFactor,
    cookingIndex: indicators.cookingIndex,
    totalCost: costs.total,
    sellingPrice: record.vl_preco_venda?.toFixed(4) ?? null,
    contributionMarginPercent: contributionMarginPercent !== null ? contributionMarginPercent.toFixed(4) : null,
    updatedAt: record.ts_atualizacao.toISOString(),
    componentCount: record.componentes.length,
    notes: record.ds_observacoes ?? ""
  };
}

function mapFichaDetail(record: NonNullable<FichaRecord>) {
  const usageUnit = record.itemResultante.unidadeUsoPadrao?.ds_codigo ?? "kg";
  const stages = mapStageRows(record);
  const flattenedComponents = stages.flatMap((stage) =>
    stage.items.map((item) => ({
      ...item,
      stageId: stage.id,
      stageName: stage.name
    }))
  );
  const componentMetrics = record.componentes.reduce(
    (summary, component) => {
      summary.totalGross += Number(component.vl_qtd_bruta.toFixed(4));
      summary.totalNet += Number((component.vl_qtd_limpa ?? component.vl_qtd_bruta).toFixed(4));
      return summary;
    },
    { totalGross: 0, totalNet: 0 }
  );
  const costs = mapFichaCosts(record);
  const finalOutput = Number(costs.finalOutput ?? "0");
  const totalCost = Number(costs.total ?? "0");
  const packagingCost = Number(costs.packaging ?? "0");
  const costWithoutPackaging = Math.max(totalCost - packagingCost, 0);
  const displayName = resolveFichaDisplayName({
    displayName: record.nm_exibicao,
    canonicalName: record.itemResultante.nm_item
  });
  const indicators = buildFichaIndicators({
    totalGross: componentMetrics.totalGross.toFixed(4),
    totalNet: componentMetrics.totalNet.toFixed(4),
    finalOutput: costs.finalOutput
  });

  return {
    id: record.cd_ficha_tecnica,
    code: record.itemResultante.ds_codigo_interno ? `${record.itemResultante.ds_codigo_interno}-V${record.nr_versao}` : "",
    itemId: record.cd_item_resultante,
    itemName: displayName,
    canonicalItemName: record.itemResultante.nm_item,
    itemType: record.itemResultante.tp_item,
    groupOperational: record.itemResultante.nm_categoria_operacional ?? "Sem grupo",
    modality: {
      id: record.modalidade?.ds_codigo ?? "",
      label: record.modalidade?.nm_modalidade ?? "Sem modalidade"
    },
    version: record.nr_versao,
    status: record.tp_status,
    yieldMode: record.tp_modo_rendimento,
    percentLoss: record.vl_pct_perda?.toFixed(4) ?? null,
    finalWeight: record.vl_peso_final
      ? denormalizeQuantityFromCanonical(record.vl_peso_final.toString(), usageUnit).toFixed(4)
      : null,
    portions: record.vl_rendimento_porcoes?.toFixed(4) ?? null,
    preparationMode: record.ds_modo_preparo ?? "",
    notes: record.ds_observacoes ?? "",
    createdAt: record.ts_criacao.toISOString(),
    updatedAt: record.ts_atualizacao.toISOString(),
    createdAtLabel: formatDateTimeLabel(record.ts_criacao),
    updatedAtLabel: formatDateTimeLabel(record.ts_atualizacao),
    usageUnit,
    yieldUnitCode: record.unidadeRendimento?.ds_codigo ?? usageUnit,
    stages,
    components: flattenedComponents,
    expandedRows: mapExpandedRows(record),
    costs,
    excelSummary: {
      totalGross: componentMetrics.totalGross.toFixed(4),
      totalNet: componentMetrics.totalNet.toFixed(4),
      postCookingWeight: costs.finalOutput,
      cookingFactorGross: indicators.correctionFactor,
      cookingFactorNet: indicators.cookingIndex,
      totalInputCost: costs.total,
      costWithoutPackagingPerKg:
        finalOutput > 0 ? (costWithoutPackaging / finalOutput).toFixed(4) : null,
      cmvPerKg: costs.perKg,
      costReal: (totalCost + packagingCost).toFixed(4),
      lastCalculatedAt: record.execucoesCalculo[0]?.ts_criacao.toISOString() ?? record.ts_atualizacao.toISOString()
    },
    sheetSummary: buildCommercialSummary({
      itemType: record.itemResultante.tp_item,
      totalGross: componentMetrics.totalGross.toFixed(4),
      totalNet: componentMetrics.totalNet.toFixed(4),
      postCookingWeight: costs.finalOutput,
      cookingFactorGross: indicators.correctionFactor,
      cookingFactorNet: indicators.cookingIndex,
      totalInputCost: costWithoutPackaging.toFixed(4),
      costWithoutPackagingPerKg:
        finalOutput > 0 ? (costWithoutPackaging / finalOutput).toFixed(4) : null,
      cmvPerKg: costs.perKg,
      packagingCost: costs.packaging,
      salePrice: record.vl_preco_venda?.toFixed(4) ?? null,
      variableExpensePercent: record.vl_pct_despesa_variavel?.toFixed(4) ?? null,
      preparationModePreview: record.ds_modo_preparo ?? ""
    })
  };
}

const COMPLEX_FICHA_SORT_FIELDS = ["fc", "ic", "totalCost", "margem", "componentes", "obs"] as const;

function buildFichasOrderBy(
  sortBy: FichaSortBy | undefined,
  sortDir: "asc" | "desc" | undefined
): Prisma.FichaTecnicaOrderByWithRelationInput[] {
  const dir = sortDir ?? "asc";
  switch (sortBy) {
    case "code":
      return [{ itemResultante: { ds_codigo_interno: dir } }, { ts_atualizacao: "desc" }];
    case "produto":
      return [{ itemResultante: { nm_item: dir } }, { nr_versao: "desc" }];
    case "modalidade":
      return [{ modalidade: { nm_modalidade: dir } }, { ts_atualizacao: "desc" }];
    case "grupo":
      return [{ itemResultante: { nm_categoria_operacional: dir } }, { ts_atualizacao: "desc" }];
    case "sellingPrice":
      return [{ vl_preco_venda: dir }, { ts_atualizacao: "desc" }];
    case "status":
      return [{ tp_status: dir }, { ts_atualizacao: "desc" }];
    // fc, ic, totalCost, margem são derivados — handled via in-memory sort
    case "updatedAt":
      return [{ ts_atualizacao: dir }, { nr_versao: "desc" }];
    default:
      return [{ itemResultante: { nm_item: "asc" } }, { nr_versao: "desc" }];
  }
}

async function listFichasWithPrisma(input: ListFichasInput, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  const query = input.query.trim();
  const typedQuery =
    query && ["insumo", "pre_preparo", "intermediario", "produto_pronto", "prato", "porcao", "marmita", "combo", "embalagem", "apoio"].includes(query)
      ? (query as item_type)
      : null;
  const where: Prisma.FichaTecnicaWhereInput = {
    AND: [
      { cd_restaurante: restaurantId },
      input.status && input.status !== "all" ? { tp_status: input.status } : {},
      // Filtro modalidade
      input.modalidade && input.modalidade !== "all"
        ? input.modalidade === "__none__"
          ? { cd_modalidade: null }
          : { modalidade: { nm_modalidade: { contains: input.modalidade, mode: "insensitive" } } }
        : {},
      // Filtro grupo operacional
      input.grupo && input.grupo !== "all"
        ? input.grupo === "__none__"
          ? { itemResultante: { nm_categoria_operacional: null } }
          : { itemResultante: { nm_categoria_operacional: { contains: input.grupo, mode: "insensitive" } } }
        : {},
      query
        ? {
            OR: [
              {
                itemResultante: {
                  nm_item: { contains: query, mode: "insensitive" }
                }
              },
              {
                nm_exibicao: { contains: query, mode: "insensitive" }
              },
              ...(typedQuery
                ? [{
                itemResultante: {
                  tp_item: {
                    equals: typedQuery
                  }
                }
                }]
                : [])
            ]
          }
        : {}
    ]
  };

  const fichaInclude = {
    itemResultante: {
      include: {
        custosSnapshot: { orderBy: { ts_calculo: "desc" as const }, take: 1 }
      }
    },
    modalidade: true,
    componentes: { select: { vl_qtd_bruta: true, vl_qtd_limpa: true } },
    execucoesCalculo: {
      orderBy: { ts_criacao: "desc" as const },
      take: 1,
      select: { ts_criacao: true, js_metadados: true }
    }
  } as const;

  const needsInMemorySort = input.sortBy && (COMPLEX_FICHA_SORT_FIELDS as readonly string[]).includes(input.sortBy);

  try {
    const totalCount = await prisma.fichaTecnica.count({ where });

    let didYouMean: string | null = null;
    if (totalCount === 0 && query) {
      const allFichasForSimilarity = await prisma.fichaTecnica.findMany({
        where: { cd_restaurante: restaurantId },
        select: {
          nm_exibicao: true,
          itemResultante: {
            select: { nm_item: true }
          }
        }
      });
      const terms = allFichasForSimilarity.flatMap(f => [f.nm_exibicao, f.itemResultante.nm_item].filter((v): v is string => Boolean(v)));
      const { findClosestTerm } = await import("@/modules/platform/similarity");
      didYouMean = findClosestTerm(query, terms);
    }

    if (needsInMemorySort) {
      const allFichas = await prisma.fichaTecnica.findMany({ where, orderBy: { ts_atualizacao: "desc" }, include: fichaInclude });
      const allMapped = allFichas.map((f) => mapFichaListRow(f as unknown as NonNullable<FichaRecord>));
      const dir = input.sortDir === "desc" ? -1 : 1;
      const safeNum = (v: string | null | undefined, fallback = -Infinity) => {
        const n = Number(v ?? "");
        return Number.isFinite(n) ? n : fallback;
      };
      allMapped.sort((a, b) => {
        switch (input.sortBy) {
          case "fc":        return dir * (safeNum(a.correctionFactor) - safeNum(b.correctionFactor));
          case "ic":        return dir * (safeNum(a.cookingIndex) - safeNum(b.cookingIndex));
          case "totalCost": return dir * (Number(a.totalCost) - Number(b.totalCost));
          case "margem":    return dir * (safeNum(a.contributionMarginPercent, -999) - safeNum(b.contributionMarginPercent, -999));
          case "componentes": return dir * (a.componentCount - b.componentCount);
          case "obs":       return dir * a.notes.localeCompare(b.notes, "pt-BR", { sensitivity: "base" });
          default: return 0;
        }
      });
      const safePage = Math.max(input.page, 1);
      const offset = (safePage - 1) * input.pageSize;
      return {
        items: allMapped.slice(offset, offset + input.pageSize),
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
        page: safePage,
        didYouMean
      };
    }

    const fichas = await prisma.fichaTecnica.findMany({
      where,
      orderBy: buildFichasOrderBy(input.sortBy, input.sortDir),
      skip: (Math.max(input.page, 1) - 1) * input.pageSize,
      take: input.pageSize,
      include: fichaInclude
    });

    return {
      items: fichas.map((ficha) => mapFichaListRow(ficha as unknown as NonNullable<FichaRecord>)),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
      page: Math.max(input.page, 1),
      didYouMean
    };
  } catch {
    return null;
  }
}

async function getFichaDetailWithPrisma(fichaId: string, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await queryFicha(prisma, fichaId, restaurantId);
    return ficha ? mapFichaDetail(ficha) : null;
  } catch (error) {
    console.error("[getFichaDetailWithPrisma] Erro ao carregar ficha", fichaId, error);
    return null;
  }
}

async function deleteFichaWithPrisma(fichaId: string, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update references in CalculoExecucao
      await tx.calculoExecucao.updateMany({
        where: { cd_ficha_tecnica: fichaId },
        data: { cd_ficha_tecnica: null }
      });

      // 2. Update references in ImportacaoStaging
      await tx.importacaoStaging.updateMany({
        where: { cd_ficha_tecnica: fichaId },
        data: { cd_ficha_tecnica: null }
      });

      // 3. Delete FichaTecnica
      await tx.fichaTecnica.delete({
        where: {
          cd_ficha_tecnica: fichaId,
          cd_restaurante: restaurantId
        }
      });
    });
    return true;
  } catch (error) {
    console.error("[deleteFichaWithPrisma] Erro ao deletar ficha", fichaId, error);
    throw error;
  }
}

async function saveFichaWithPrisma(input: SaveFichaInput, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await prisma.$transaction(async (tx) => {
      const modality = await ensureModality(tx, input.modalityId);
      const isBuffet =
        modality.ds_codigo?.toLowerCase().includes("buffet") ||
        modality.nm_modalidade?.toLowerCase().includes("buffet");
      if (isBuffet) {
        input.itemType = "prato";
      }
      const item = await resolveCanonicalFichaItem(tx, input, restaurantId);
      const yieldUnit = await ensureUnit(tx, input.yieldUnitCode);

      // Explicitly cast to include the relation if TS is lost
      const itemWithUnits = item as Prisma.ItemGetPayload<{ include: { unidadeUsoPadrao: true } }>;
      const resultUsageUnit = itemWithUnits.unidadeUsoPadrao?.ds_codigo ?? "kg";
      const normalizedFinalWeight =
        input.yieldMode === "peso_final" && input.finalWeight
          ? normalizeQuantityToCanonical(input.finalWeight, resultUsageUnit).toString()
          : null;

      await assertNoCyclesBeforeSaving(
        tx,
        item.cd_item,
        input.components.map((component) => component.itemId)
      );

      const existing = input.id
        ? await tx.fichaTecnica.findUnique({
            where: { cd_ficha_tecnica: input.id }
          })
        : null;

      if (existing && existing.cd_restaurante !== restaurantId) {
        throw new Error("Acesso negado. Ficha de outro restaurante.");
      }

      const highestVersion = await tx.fichaTecnica.aggregate({
        where: { cd_item_resultante: item.cd_item },
        _max: { nr_versao: true }
      });

      if (input.status === "ativa") {
        await tx.fichaTecnica.updateMany({
          where: {
            cd_item_resultante: item.cd_item,
            tp_status: "ativa",
            cd_ficha_tecnica: existing?.cd_ficha_tecnica ? { not: existing.cd_ficha_tecnica } : undefined
          },
          data: {
            tp_status: "inativa"
          }
        });
      }

      const ficha = existing
        ? await tx.fichaTecnica.update({
            where: { cd_ficha_tecnica: existing.cd_ficha_tecnica },
            data: {
              cd_item_resultante: item.cd_item,
              nr_versao: existing.cd_item_resultante === item.cd_item ? existing.nr_versao : (highestVersion._max.nr_versao ?? 0) + 1,
              cd_restaurante: restaurantId,
              cd_modalidade: modality.cd_modalidade,
              nm_exibicao: input.displayName.trim(),
              cd_unidade_rendimento: yieldUnit.cd_unidade_medida,
              tp_status: input.status,
              tp_modo_rendimento: input.yieldMode,
              vl_pct_perda: input.yieldMode === "percentual_perda" ? input.percentLoss : null,
              vl_peso_final: normalizedFinalWeight,
              vl_rendimento_porcoes: input.portions,
              vl_preco_venda: input.salePrice || null,
              vl_pct_despesa_variavel: input.variableExpensePercent || null,
              ds_modo_preparo: input.preparationMode,
              ds_observacoes: input.notes
            }
          })
        : await tx.fichaTecnica.create({
            data: {
              cd_restaurante: restaurantId,
              cd_item_resultante: item.cd_item,
              cd_modalidade: modality.cd_modalidade,
              nm_exibicao: input.displayName.trim(),
              cd_unidade_rendimento: yieldUnit.cd_unidade_medida,
              nr_versao: (highestVersion._max.nr_versao ?? 0) + 1,
              tp_status: input.status,
              tp_modo_rendimento: input.yieldMode,
              vl_pct_perda: input.yieldMode === "percentual_perda" ? input.percentLoss : null,
              vl_peso_final: normalizedFinalWeight,
              vl_rendimento_porcoes: input.portions,
              vl_preco_venda: input.salePrice || null,
              vl_pct_despesa_variavel: input.variableExpensePercent || null,
              ds_modo_preparo: input.preparationMode,
              ds_observacoes: input.notes
            }
          });

      await tx.fichaEtapa.deleteMany({
        where: { cd_ficha_tecnica: ficha.cd_ficha_tecnica }
      });

      await tx.fichaComponente.deleteMany({
        where: { cd_ficha_tecnica: ficha.cd_ficha_tecnica }
      });

      let componentOrder = 0;

      for (const [stageIndex, stage] of input.stages.entries()) {
        const stageType = await ensureStageType(tx, stage);
        const createdStage = await tx.fichaEtapa.create({
          data: {
            cd_ficha_tecnica: ficha.cd_ficha_tecnica,
            cd_tipo_etapa: stageType?.cd_tipo_etapa ?? null,
            nr_ordem: stageIndex + 1,
            nm_etapa: normalizeStageName(stage.name, stageIndex + 1),
            vl_peso_entrada: stage.items.reduce((sum, itemRow) => sum + Number(itemRow.quantityUsed || "0"), 0).toString(),
            vl_peso_saida: stage.outputQuantity || null,
            vl_fator_correcao: stage.correctionFactor || null,
            vl_indice_coccao: stage.cookingIndex || null,
            vl_total_snapshot: null,
            ds_observacao: stage.notes || null
          }
        });

        for (const itemRow of stage.items) {
          const usageUnit = await ensureUnit(tx, itemRow.usageUnit);
          componentOrder += 1;

          let itemCorrectionFactor = null;
          let itemCookingIndex = null;
          const qtyGross = Number(itemRow.quantityUsed) || 0;
          const qtyNet = itemRow.outputWeight ? (Number(itemRow.outputWeight) || qtyGross) : qtyGross;

          if (itemRow.outputWeight) {
            const outVal = Number(itemRow.outputWeight) || 0;
            if (qtyGross > 0 && outVal > 0) {
              const ratio = outVal / qtyGross;
              if (stage.stageTypeCode === "coccao_preparo") {
                itemCookingIndex = ratio.toString();
              } else {
                itemCorrectionFactor = ratio.toString();
              }
            }
          }

          await tx.fichaComponente.create({
            data: {
              cd_ficha_tecnica: ficha.cd_ficha_tecnica,
              cd_ficha_etapa: createdStage.cd_ficha_etapa,
              cd_item_componente: itemRow.itemId,
              tp_componente: itemRow.componentType,
              nr_ordem: componentOrder,
              vl_qtd_bruta: itemRow.quantityUsed,
              vl_qtd_limpa: qtyNet.toString(),
              cd_unidade_uso: usageUnit.cd_unidade_medida,
              vl_fator_correcao: itemCorrectionFactor ?? stage.correctionFactor ?? null,
              vl_indice_coccao: itemCookingIndex ?? stage.cookingIndex ?? null,
              ds_observacao: itemRow.notes || null
            }
          });
        }
      }

      await rebuildDependencyClosureForItem(tx, item.cd_item);

      if (input.status === "ativa") {
        await recalculateCascadeInTransaction(tx, [item.cd_item], "ficha.save.web");
      }

      return ficha;
    }, { timeout: 30000 });

    return getFichaDetailWithPrisma(ficha.cd_ficha_tecnica, restaurantId);
  } catch (error) {
    // Bug-fix 2026-04-21 (fichas-nova-server-error): previously a silent
    // `catch { return null }` here masked real Prisma errors (FK violations,
    // unique-constraint conflicts, transaction deadlocks). saveFicha() would
    // then fall through to the demo-store path, which threw the misleading
    // `Item <cuid> nao encontrado.` because the in-memory demo store did not
    // contain the real DB cuid. Log the real error and re-throw so the user
    // sees what actually broke.
    console.error("[saveFichaWithPrisma] Prisma save failed:", error);
    throw error;
  }
}

async function duplicateFichaWithPrisma(fichaId: string, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const duplicated = await prisma.$transaction(async (tx) => {
      const source = await queryFicha(tx, fichaId, restaurantId);

      if (!source) {
        throw new Error(`Ficha ${fichaId} nao encontrada.`);
      }

      const highestVersion = await tx.fichaTecnica.aggregate({
        where: { cd_item_resultante: source.cd_item_resultante },
        _max: { nr_versao: true }
      });

      const created = await tx.fichaTecnica.create({
        data: {
          cd_item_resultante: source.cd_item_resultante,
          nm_exibicao: source.nm_exibicao,
          cd_modalidade: source.cd_modalidade,
          cd_unidade_rendimento: source.cd_unidade_rendimento,
          nr_versao: (highestVersion._max.nr_versao ?? 0) + 1,
          tp_status: "rascunho",
          tp_modo_rendimento: source.tp_modo_rendimento,
          vl_pct_perda: source.vl_pct_perda,
          vl_peso_final: source.vl_peso_final,
          vl_rendimento_porcoes: source.vl_rendimento_porcoes,
          vl_preco_venda: source.vl_preco_venda,
          vl_pct_despesa_variavel: source.vl_pct_despesa_variavel,
          ds_modo_preparo: source.ds_modo_preparo,
          ds_observacoes: source.ds_observacoes,
          cd_restaurante: restaurantId
        }
      });

      const stageIdMap = new Map<string, string>();

      for (const stage of source.etapas) {
        const createdStage = await tx.fichaEtapa.create({
          data: {
            cd_ficha_tecnica: created.cd_ficha_tecnica,
            cd_tipo_etapa: stage.cd_tipo_etapa,
            nr_ordem: stage.nr_ordem,
            nm_etapa: stage.nm_etapa,
            vl_peso_entrada: stage.vl_peso_entrada,
            vl_peso_saida: stage.vl_peso_saida,
            vl_fator_correcao: stage.vl_fator_correcao,
            vl_indice_coccao: stage.vl_indice_coccao,
            vl_total_snapshot: stage.vl_total_snapshot,
            ds_observacao: stage.ds_observacao
          }
        });

        stageIdMap.set(stage.cd_ficha_etapa, createdStage.cd_ficha_etapa);
      }

      for (const component of source.componentes) {
        await tx.fichaComponente.create({
          data: {
            cd_ficha_tecnica: created.cd_ficha_tecnica,
            cd_ficha_etapa: component.cd_ficha_etapa ? stageIdMap.get(component.cd_ficha_etapa) ?? null : null,
            cd_item_componente: component.cd_item_componente,
            tp_componente: component.tp_componente,
            nr_ordem: component.nr_ordem,
            vl_qtd_bruta: component.vl_qtd_bruta,
            vl_qtd_limpa: component.vl_qtd_limpa,
            cd_unidade_uso: component.cd_unidade_uso,
            vl_fator_correcao: component.vl_fator_correcao,
            vl_indice_coccao: component.vl_indice_coccao,
            ds_observacao: component.ds_observacao
          }
        });
      }

      return created.cd_ficha_tecnica;
    }, { timeout: 30000 });

    return getFichaDetailWithPrisma(duplicated, restaurantId);
  } catch {
    return null;
  }
}

async function patchFichaQuickWithPrisma(
  input: { fichaId: string; name?: string; sellingPrice?: string },
  restaurantId: string
) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return null;

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.nm_exibicao = input.name.trim();
  }
  if (input.sellingPrice !== undefined) {
    const parsed = input.sellingPrice === "" ? null : Number(input.sellingPrice);
    if (input.sellingPrice !== "" && (parsed === null || !Number.isFinite(parsed))) {
      throw new Error("Preço de venda inválido.");
    }
    data.vl_preco_venda = parsed;
  }

  if (Object.keys(data).length === 0) return null;

  try {
    await prisma.fichaTecnica.update({
      where: { cd_ficha_tecnica: input.fichaId, cd_restaurante: restaurantId },
      data
    });
    return true;
  } catch {
    return null;
  }
}

async function inactivateFichaWithPrisma(fichaId: string, restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await prisma.$transaction(async (tx) => {
      const updated = await tx.fichaTecnica.update({
        where: {
          cd_ficha_tecnica: fichaId,
          cd_restaurante: restaurantId
        },
        data: {
          tp_status: "inativa"
        }
      });

      await rebuildDependencyClosureForItem(tx, updated.cd_item_resultante);
      await recalculateCascadeInTransaction(tx, [updated.cd_item_resultante], "ficha.inactivate.web");
      return updated;
    }, { timeout: 30000 });

    return getFichaDetailWithPrisma(ficha.cd_ficha_tecnica, restaurantId);
  } catch {
    return null;
  }
}

async function listCompositionRowsWithPrisma(restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      where: { cd_restaurante: restaurantId },
      orderBy: { ts_atualizacao: "desc" },
      include: {
          itemResultante: {
            include: {
              custosSnapshot: {
                orderBy: { ts_calculo: "desc" },
                take: 1
              }
            }
          },
          modalidade: true,
          etapas: {
            orderBy: { nr_ordem: "asc" },
            include: {
              componentes: {
                orderBy: { nr_ordem: "asc" },
                include: {
                  itemComponente: {
                    select: {
                      nm_item: true,
                      tp_item: true,
                      unidadeUsoPadrao: true
                    }
                  },
                  unidadeUso: true
                }
              }
            }
          },
          componentes: {
            orderBy: { nr_ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nm_item: true,
                tp_item: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

    return fichas.flatMap((ficha) => mapExpandedRows(ficha as NonNullable<FichaRecord>));
  } catch {
    return null;
  }
}

async function listCostSummariesWithPrisma(restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      where: { cd_restaurante: restaurantId },
      orderBy: { ts_atualizacao: "desc" },
      include: {
        itemResultante: {
          include: {
            custosSnapshot: {
              orderBy: { ts_calculo: "desc" },
              take: 1
            }
          }
        },
        componentes: {
          orderBy: { nr_ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nm_item: true,
                tp_item: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

    return fichas.map((ficha) => {
      const mapped = mapFichaDetail(ficha as NonNullable<FichaRecord>);

      return {
        fichaId: mapped.id,
        itemName: mapped.itemName,
        status: mapped.status,
        direct: mapped.costs.direct,
        inherited: mapped.costs.inherited,
        packaging: mapped.costs.packaging,
        total: mapped.costs.total,
        perKg: mapped.costs.perKg,
        perPortion: mapped.costs.perPortion,
        finalOutput: mapped.costs.finalOutput
      };
    });
  } catch {
    return null;
  }
}

async function listAssemblyScenariosWithPrisma(restaurantId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      where: {
        cd_restaurante: restaurantId,
        itemResultante: {
          tp_item: {
            in: ["prato", "porcao", "marmita", "combo"]
          }
        }
      },
      orderBy: { ts_atualizacao: "desc" },
      include: {
        itemResultante: {
          include: {
            custosSnapshot: {
              orderBy: { ts_calculo: "desc" },
              take: 1
            }
          }
        },
        componentes: {
          orderBy: { nr_ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nm_item: true,
                tp_item: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

    return fichas.map((ficha) => {
      const detail = mapFichaDetail(ficha as NonNullable<FichaRecord>);
      const includedItems = detail.components.map((component) => component.itemName);

      return {
        id: detail.id,
        label: detail.itemName,
        category: detail.itemType,
        includedItems,
        totalCost: detail.costs.total,
        packagingCost: detail.costs.packaging,
        finalOutput: detail.costs.finalOutput
      };
    });
  } catch {
    return null;
  }
}

function duplicateComponents(components: DemoComponentRecord[]) {
  return components.map((component) => ({
    ...cloneDemoStore(component),
    id: createDemoId("cmp")
  }));
}

function toFichaListRow(ficha: DemoFichaRecord) {
  const totalGross = ficha.components.reduce((sum, component) => sum + Number(component.quantityGross || "0"), 0);
  const totalNet = ficha.components.reduce(
    (sum, component) => sum + Number(component.quantityNet || component.quantityGross || "0"),
    0
  );
  const indicators = buildFichaIndicators({
    totalGross: totalGross.toFixed(4),
    totalNet: totalNet.toFixed(4),
    finalOutput: ficha.costs.finalOutput
  });

  const salePriceNumber = ficha.salePrice ? Number(ficha.salePrice) : 0;
  const totalCostNumber = Number(ficha.costs.total) || 0;
  const packagingCostNumber = Number(ficha.costs.packaging) || 0;
  const costWithoutPackagingNumber = Math.max(totalCostNumber - packagingCostNumber, 0);
  const variableExpensePercentNumber = normalizePercentInput(
    ficha.variableExpensePercent ? Number(ficha.variableExpensePercent) : null
  );

  const finalOutputNumber = Number(ficha.costs.finalOutput) || 0;
  const hasUsableWeight = finalOutputNumber > 0;
  const costWithoutPackagingPerKg = hasUsableWeight ? (costWithoutPackagingNumber / finalOutputNumber) : 0;
  const cmvWithPackagingPerKg = hasUsableWeight ? (totalCostNumber / finalOutputNumber) : 0;
  const assemblyEnabled = packagingCostNumber > 0;
  const finalAppliedCmv = assemblyEnabled ? cmvWithPackagingPerKg : costWithoutPackagingPerKg;
  const costForMarginCalc = hasUsableWeight ? finalAppliedCmv : totalCostNumber;

  const contributionMarginPercent =
    salePriceNumber > 0 && variableExpensePercentNumber !== null
      ? (salePriceNumber - costForMarginCalc - salePriceNumber * variableExpensePercentNumber) / salePriceNumber
      : null;

  return {
    id: ficha.id,
    itemId: ficha.itemId,
    code: (() => {
      const itemCode = getDemoStore().items.find((item) => item.id === ficha.itemId)?.code;
      return itemCode ? `${itemCode}-V${ficha.version}` : "--";
    })(),
    itemName: ficha.displayName,
    itemType: ficha.itemType,
    version: ficha.version,
    modalityLabel: ficha.modalityLabel,
    groupOperational: getDemoStore().items.find((item) => item.id === ficha.itemId)?.operationalCategory ?? "Sem grupo",
    status: ficha.status,
    correctionFactor: indicators.correctionFactor,
    cookingIndex: indicators.cookingIndex,
    totalCost: ficha.costs.total,
    sellingPrice: ficha.salePrice ?? null,
    contributionMarginPercent: contributionMarginPercent !== null ? contributionMarginPercent.toFixed(4) : null,
    updatedAt: ficha.updatedAt,
    componentCount: ficha.components.length,
    notes: ficha.notes
  };
}

function toFichaDetail(ficha: DemoFichaRecord) {
  const totalGross = ficha.components.reduce(
    (sum, component) => sum + Number(component.quantityGross || "0"),
    0
  );
  const totalNet = ficha.components.reduce(
    (sum, component) => sum + Number(component.quantityNet || component.quantityGross || "0"),
    0
  );
  const finalOutput = Number(ficha.costs.finalOutput || "0");
  const totalCost = Number(ficha.costs.total || "0");
  const packagingCost = Number(ficha.costs.packaging || "0");
  const costWithoutPackaging = Math.max(totalCost - packagingCost, 0);
  const indicators = buildFichaIndicators({
    totalGross: totalGross.toFixed(4),
    totalNet: totalNet.toFixed(4),
    finalOutput: ficha.costs.finalOutput
  });

  return cloneDemoStore({
    id: ficha.id,
    code: (() => {
      const itemCode = getDemoStore().items.find((item) => item.id === ficha.itemId)?.code;
      return itemCode ? `${itemCode}-V${ficha.version}` : "";
    })(),
    itemId: ficha.itemId,
    itemName: ficha.displayName,
    canonicalItemName: ficha.itemName,
    itemType: ficha.itemType,
    groupOperational: getDemoStore().items.find((item) => item.id === ficha.itemId)?.operationalCategory ?? "Sem grupo",
    modality: {
      id: ficha.modalityId,
      label: ficha.modalityLabel
    },
    version: ficha.version,
    status: ficha.status,
    yieldMode: ficha.yieldMode,
    percentLoss: ficha.percentLoss,
    finalWeight: ficha.finalWeight,
    portions: ficha.portions,
    salePrice: ficha.salePrice,
    variableExpensePercent: ficha.variableExpensePercent,
    preparationMode: ficha.preparationMode,
    notes: ficha.notes,
    createdAt: ficha.createdAt,
    updatedAt: ficha.updatedAt,
    createdAtLabel: formatDateTimeLabel(ficha.createdAt),
    updatedAtLabel: formatDateTimeLabel(ficha.updatedAt),
    usageUnit: getDemoStore().items.find((item) => item.id === ficha.itemId)?.usageUnit ?? "kg",
    yieldUnitCode: ficha.yieldUnitCode,
    stages: ficha.stages.map((stage) => ({
      ...stage,
      correctionFactor: stage.correctionFactor ?? "",
      cookingIndex: stage.cookingIndex ?? "",
      notes: stage.notes ?? "",
      items: ficha.components
        .filter((component) => component.stageId === stage.id)
        .map((component, index) => {
          const hasCustomWeight = component.correctionFactor || component.cookingIndex;
          return {
            ...component,
            quantityUsed: component.quantityUsed || component.quantityGross,
            levelLabel: `N${index + 1}`,
            correctionFactor: component.correctionFactor ?? "",
            cookingIndex: component.cookingIndex ?? "",
            outputWeight: hasCustomWeight && component.quantityNet ? component.quantityNet : "",
            notes: component.notes ?? ""
          };
        })
    })),
    components: ficha.components.map((component) => ({
      ...component,
      quantityUsed: component.quantityUsed || component.quantityGross,
      correctionFactor: component.correctionFactor ?? "",
      cookingIndex: component.cookingIndex ?? "",
      notes: component.notes ?? ""
    })),
    expandedRows: ficha.expandedRows,
    costs: ficha.costs,
    excelSummary: {
      totalGross: totalGross.toFixed(4),
      totalNet: totalNet.toFixed(4),
      postCookingWeight: ficha.costs.finalOutput,
      cookingFactorGross: indicators.correctionFactor,
      cookingFactorNet: indicators.cookingIndex,
      totalInputCost: ficha.costs.total,
      costWithoutPackagingPerKg:
        finalOutput > 0 ? (costWithoutPackaging / finalOutput).toFixed(4) : null,
      cmvPerKg: ficha.costs.perKg,
      costReal: (totalCost + packagingCost).toFixed(4),
      lastCalculatedAt: ficha.updatedAt
    },
    sheetSummary: buildCommercialSummary({
      itemType: ficha.itemType,
      totalGross: totalGross.toFixed(4),
      totalNet: totalNet.toFixed(4),
      postCookingWeight: ficha.costs.finalOutput,
      cookingFactorGross: indicators.correctionFactor,
      cookingFactorNet: indicators.cookingIndex,
      totalInputCost: costWithoutPackaging.toFixed(4),
      costWithoutPackagingPerKg:
        finalOutput > 0 ? (costWithoutPackaging / finalOutput).toFixed(4) : null,
      cmvPerKg: ficha.costs.perKg,
      packagingCost: ficha.costs.packaging,
      salePrice: ficha.salePrice,
      variableExpensePercent: ficha.variableExpensePercent,
      preparationModePreview: ficha.preparationMode
    })
  });
}

export function getEngineeringRepository(restaurantId: string = "rest_padrao") {
  return {
    async checkDuplicateName(name: string, excludeFichaId?: string) {
      const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
      if (prisma) {
        try {
          const count = await prisma.fichaTecnica.count({
            where: {
              cd_restaurante: restaurantId,
              nm_exibicao: { equals: name.trim(), mode: "insensitive" },
              cd_ficha_tecnica: excludeFichaId ? { not: excludeFichaId } : undefined
            }
          });
          return count > 0;
        } catch {
          // fallback
        }
      }

      const store = getDemoStore();
      return store.fichas.some(
        (ficha) =>
          ficha.displayName.trim().toLowerCase() === name.trim().toLowerCase() &&
          ficha.id !== excludeFichaId
      );
    },

    async listModalities() {
      const prisma = getPrismaClient(getServerEnv().DATABASE_URL);

      if (prisma) {
        try {
          const rows = await prisma.modalidade.findMany({
            where: { sn_ativo: true },
            orderBy: { nm_modalidade: "asc" }
          });

          if (rows.length > 0) {
            return rows.map((row) => ({
              id: row.ds_codigo,
              label: row.nm_modalidade
            }));
          }
        } catch {
          // fall back to demo defaults
        }
      }

      return getDemoStore().modalities
        .filter((entry) => entry.active)
        .map((entry) => ({
          id: entry.id,
          label: entry.label
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },

    async listOperationalGroups() {
      const prisma = getPrismaClient(getServerEnv().DATABASE_URL);

      if (prisma) {
        try {
          const rows = await prisma.item.findMany({
            where: {
              cd_restaurante: restaurantId,
              sn_ativo: true,
              nm_categoria_operacional: { not: "" }
            },
            select: { nm_categoria_operacional: true },
            distinct: ["nm_categoria_operacional"],
            orderBy: { nm_categoria_operacional: "asc" }
          });

          if (rows.length > 0) {
            return rows
              .map((row) => row.nm_categoria_operacional!)
              .filter(Boolean)
              .map((val) => ({
                id: val,
                label: val
              }));
          }
        } catch {
          // fall back to demo defaults
        }
      }

      const store = getDemoStore();
      const groups = Array.from(
        new Set(
          store.items
            .map((item) => item.operationalCategory)
            .filter(Boolean)
        )
      ).sort();

      return groups.map((g) => ({
        id: g,
        label: g
      }));
    },

    async listFichas({ page, pageSize, query, status = "all", modalidade, grupo, sortBy, sortDir }: ListFichasInput) {
      const prismaResult = await listFichasWithPrisma({ page, pageSize, query, status, modalidade, grupo, sortBy, sortDir }, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const normalizedQuery = query.trim().toLowerCase();
      const filtered = getDemoStore().fichas.filter((ficha) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          `${ficha.displayName} ${ficha.itemName} ${ficha.itemType} v${ficha.version}`
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesStatus = status === "all" ? true : ficha.status === status;
        const matchesModalidade =
          !modalidade || modalidade === "all"
            ? true
            : modalidade === "__none__"
              ? !ficha.modalityLabel || /sem /i.test(ficha.modalityLabel)
              : ficha.modalityLabel.toLowerCase() === modalidade.toLowerCase();
        const fichaGrupo = getDemoStore().items.find((i) => i.id === ficha.itemId)?.operationalCategory ?? "";
        const matchesGrupo =
          !grupo || grupo === "all"
            ? true
            : grupo === "__none__"
              ? !fichaGrupo || /sem /i.test(fichaGrupo)
              : fichaGrupo.toLowerCase() === grupo.toLowerCase();

        return matchesQuery && matchesStatus && matchesModalidade && matchesGrupo;
      });

      const dir = sortDir === "desc" ? -1 : 1;
      const sorted = filtered.slice().sort((a, b) => {
        switch (sortBy) {
          case "code": {
            const store = getDemoStore();
            const aCode = store.items.find((i) => i.id === a.itemId)?.code ?? "";
            const bCode = store.items.find((i) => i.id === b.itemId)?.code ?? "";
            const aNum = Number(aCode), bNum = Number(bCode);
            if (!isNaN(aNum) && !isNaN(bNum)) return dir * (aNum - bNum);
            return dir * aCode.localeCompare(bCode, "pt-BR", { sensitivity: "base" });
          }
          case "produto":
            return dir * a.displayName.localeCompare(b.displayName, "pt-BR", { sensitivity: "base" });
          case "modalidade":
            return dir * a.modalityLabel.localeCompare(b.modalityLabel, "pt-BR", { sensitivity: "base" });
          case "grupo": {
            const store = getDemoStore();
            const aGrp = store.items.find((i) => i.id === a.itemId)?.operationalCategory ?? "";
            const bGrp = store.items.find((i) => i.id === b.itemId)?.operationalCategory ?? "";
            return dir * aGrp.localeCompare(bGrp, "pt-BR", { sensitivity: "base" });
          }
          case "fc": {
            const getFC = (f: DemoFichaRecord) => {
              const gross = f.components.reduce((s, c) => s + Number(c.quantityGross || "0"), 0);
              const net = f.components.reduce((s, c) => s + Number(c.quantityNet || c.quantityGross || "0"), 0);
              return gross > 0 ? net / gross : 0;
            };
            return dir * (getFC(a) - getFC(b));
          }
          case "ic": {
            const getIC = (f: DemoFichaRecord) => {
              const net = f.components.reduce((s, c) => s + Number(c.quantityNet || c.quantityGross || "0"), 0);
              const out = Number(f.costs.finalOutput) || 0;
              return net > 0 ? out / net : 0;
            };
            return dir * (getIC(a) - getIC(b));
          }
          case "totalCost":
            return dir * (Number(a.costs.total) - Number(b.costs.total));
          case "margem": {
            const getMargem = (f: DemoFichaRecord) => {
              const sp = f.salePrice ? Number(f.salePrice) : 0;
              if (!sp) return -999;
              const tc = Number(f.costs.total) || 0;
              const vep = f.variableExpensePercent ? Number(f.variableExpensePercent) : 0;
              const vepN = vep > 1 ? vep / 100 : vep;
              const out = Number(f.costs.finalOutput) || 0;
              const costCalc = out > 0 ? tc / out : tc;
              return (sp - costCalc - sp * vepN) / sp;
            };
            return dir * (getMargem(a) - getMargem(b));
          }
          case "sellingPrice":
            return dir * (Number(a.salePrice ?? "0") - Number(b.salePrice ?? "0"));
          case "status":
            return dir * a.status.localeCompare(b.status, "pt-BR", { sensitivity: "base" });
          case "componentes":
            return dir * (a.components.length - b.components.length);
          case "obs":
            return dir * a.notes.localeCompare(b.notes, "pt-BR", { sensitivity: "base" });
          case "updatedAt":
            return dir * a.updatedAt.localeCompare(b.updatedAt) || dir * (a.version - b.version);
          default:
            return b.updatedAt.localeCompare(a.updatedAt) || b.version - a.version;
        }
      });

      const paginated = paginate(sorted, page, pageSize);

      let didYouMean: string | null = null;
      if (filtered.length === 0 && query) {
        const terms = getDemoStore().fichas.flatMap(f => [f.displayName, f.itemName].filter(Boolean));
        const { findClosestTerm } = await import("@/modules/platform/similarity");
        didYouMean = findClosestTerm(query, terms);
      }

      return {
        ...paginated,
        items: paginated.items.map(toFichaListRow),
        didYouMean
      };
    },

    async getFichaDetail(fichaId: string) {
      const prismaResult = await getFichaDetailWithPrisma(fichaId, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const ficha = getDemoStore().fichas.find((entry) => entry.id === fichaId);
      return ficha ? toFichaDetail(ficha) : null;
    },

    async saveFicha(input: SaveFichaInput) {
      const store = getDemoStore();
      const selectedModality =
        store.modalities.find((entry) => entry.id === input.modalityId) ??
        {
          id: input.modalityId,
          code: input.modalityId,
          label: input.modalityId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          active: true
        };
      const isBuffet =
        selectedModality.id.toLowerCase().includes("buffet") ||
        selectedModality.code?.toLowerCase().includes("buffet") ||
        selectedModality.label?.toLowerCase().includes("buffet");
      if (isBuffet) {
        input.itemType = "prato";
      }

      const prismaResult = await saveFichaWithPrisma(input, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const existing = input.id ? store.fichas.find((entry) => entry.id === input.id) : undefined;
      const linkedItem = resolveDemoFichaItem(store, input);
      if (!store.modalities.some((entry) => entry.id === selectedModality.id)) {
        store.modalities.unshift(selectedModality);
      }
      const highestVersion = store.fichas
        .filter((entry) => entry.itemId === linkedItem.id)
        .reduce((maxVersion, entry) => Math.max(maxVersion, entry.version), 0);
      const version = existing
        ? (existing.itemId === linkedItem.id ? existing.version : highestVersion + 1)
        : highestVersion + 1;
      const stages: DemoStageRecord[] = input.stages.map((stage, index) => ({
        id: stage.id ?? createDemoId("stage"),
        name: normalizeStageName(stage.name, index + 1),
        stageTypeId: stage.stageTypeId,
        stageTypeCode: stage.stageTypeCode,
        stageTypeLabel: resolveStageTypeName(stage.stageTypeCode),
        outputQuantity: stage.outputQuantity,
        correctionFactor: stage.correctionFactor ?? "",
        cookingIndex: stage.cookingIndex ?? "",
        notes: stage.notes ?? ""
      }));
      const components: DemoComponentRecord[] = input.stages.flatMap((stage, index) => {
        const stageId = stages[index]?.id ?? stage.id ?? createDemoId("stage");
        return stage.items.map((component) => {
          const qtyGross = Number(component.quantityUsed) || 0;
          const qtyNet = component.outputWeight ? (Number(component.outputWeight) || qtyGross) : qtyGross;

          let itemCorrectionFactor = null;
          let itemCookingIndex = null;

          if (component.outputWeight) {
            const outVal = Number(component.outputWeight) || 0;
            if (qtyGross > 0 && outVal > 0) {
              const ratio = outVal / qtyGross;
              if (stage.stageTypeCode === "coccao_preparo") {
                itemCookingIndex = ratio.toString();
              } else {
                itemCorrectionFactor = ratio.toString();
              }
            }
          }

          return {
            id: createDemoId("cmp"),
            stageId,
            itemId: component.itemId,
            itemName:
              store.items.find((item) => item.id === component.itemId)?.name ?? component.itemId,
            componentType: component.componentType,
            quantityUsed: component.quantityUsed,
            quantityGross: component.quantityUsed,
            quantityNet: qtyNet.toString(),
            usageUnit: component.usageUnit,
            correctionFactor: itemCorrectionFactor ?? stage.correctionFactor ?? "",
            cookingIndex: itemCookingIndex ?? stage.cookingIndex ?? "",
            notes: component.notes ?? "",
            directCost: "0.0000",
            inheritedCost: "0.0000",
            totalCost: "0.0000",
            impactPercent: "0.0000"
          };
        });
      });

      const ficha: DemoFichaRecord = {
        id: existing?.id ?? createDemoId("ficha"),
        itemId: linkedItem.id,
        itemName: linkedItem.name,
        displayName: input.displayName.trim(),
        itemType: input.itemType,
        modalityId: selectedModality.id,
        modalityLabel: selectedModality.label,
        version,
        status: input.status,
        yieldMode: input.yieldMode,
        yieldUnitCode: input.yieldUnitCode,
        percentLoss: input.percentLoss ?? null,
        finalWeight: input.finalWeight ?? null,
        portions: input.portions,
        salePrice: input.salePrice ?? null,
        variableExpensePercent: input.variableExpensePercent ?? null,
        preparationMode: input.preparationMode,
        notes: input.notes,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stages,
        components,
        expandedRows: [],
        costs: {
          direct: "0.0000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "0.0000",
          perKg: "0.0000",
          perPortion: null,
          finalOutput: input.yieldMode === "peso_final" ? (input.finalWeight ?? "1.0000") : "1.0000"
        }
      };

      if (existing) {
        const index = store.fichas.findIndex((entry) => entry.id === existing.id);
        store.fichas[index] = ficha;
      } else {
        store.fichas.unshift(ficha);
      }

      linkedItem.fichaStatus = input.status;
      linkedItem.lastCalculationAt = ficha.updatedAt;

      recalculateDemoStoreCosts(store);
      persistDemoStore(store);

      return toFichaDetail(store.fichas.find((entry) => entry.id === ficha.id) ?? ficha);
    },

    async duplicateFicha(fichaId: string) {
      const prismaResult = await duplicateFichaWithPrisma(fichaId, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const source = store.fichas.find((entry) => entry.id === fichaId);

      if (!source) {
        throw new Error(`Ficha ${fichaId} nao encontrada.`);
      }

      const highestVersion = store.fichas
        .filter((entry) => entry.itemId === source.itemId)
        .reduce((maxVersion, entry) => Math.max(maxVersion, entry.version), 0);

      const duplicated: DemoFichaRecord = {
        ...cloneDemoStore(source),
        id: createDemoId("ficha"),
        version: highestVersion + 1,
        status: "rascunho",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        components: duplicateComponents(source.components),
        expandedRows: cloneDemoStore(source.expandedRows)
      };

      store.fichas.unshift(duplicated);
      recalculateDemoStoreCosts(store);
      persistDemoStore(store);

      return toFichaDetail(store.fichas.find((entry) => entry.id === duplicated.id) ?? duplicated);
    },

    async patchFichaQuick(input: { fichaId: string; name?: string; sellingPrice?: string }) {
      const prismaResult = await patchFichaQuickWithPrisma(input, restaurantId);
      if (prismaResult !== null) return;

      const store = getDemoStore();
      const ficha = store.fichas.find((f) => f.id === input.fichaId);
      if (!ficha) throw new Error(`Ficha ${input.fichaId} não encontrada.`);
      if (input.name !== undefined) ficha.displayName = input.name.trim();
      if (input.sellingPrice !== undefined) {
        ficha.salePrice = input.sellingPrice === "" ? null : input.sellingPrice;
      }
      persistDemoStore(store);
    },

    async checkFichaDeletionAllowed(fichaId: string) {
      const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
      if (prisma) {
        try {
          const targetFicha = await prisma.fichaTecnica.findUnique({
            where: { cd_ficha_tecnica: fichaId, cd_restaurante: restaurantId },
            select: { cd_item_resultante: true }
          });
          if (!targetFicha) return [];

          const parentComponents = await prisma.fichaComponente.findMany({
            where: {
              cd_item_componente: targetFicha.cd_item_resultante,
              fichaTecnica: {
                cd_restaurante: restaurantId
              }
            },
            include: {
              fichaTecnica: {
                include: {
                  itemResultante: true
                }
              }
            }
          });

          const uniqueParents = Array.from(
            new Map(
              parentComponents.map(pc => [pc.cd_ficha_tecnica, {
                id: pc.cd_ficha_tecnica,
                name: pc.fichaTecnica.nm_exibicao || pc.fichaTecnica.itemResultante.nm_item
              }])
            ).values()
          );
          return uniqueParents;
        } catch {
          // fallback
        }
      }

      const store = getDemoStore();
      const targetFicha = store.fichas.find(f => f.id === fichaId);
      if (!targetFicha) return [];
      const parentFichas = store.fichas.filter(f => 
        f.id !== fichaId && 
        f.components.some(c => c.itemId === targetFicha.itemId)
      );
      return parentFichas.map(f => ({ id: f.id, name: f.displayName || f.itemName }));
    },

    async deleteFicha(fichaId: string) {
      const prismaResult = await deleteFichaWithPrisma(fichaId, restaurantId);
      if (prismaResult) {
        return;
      }

      const store = getDemoStore();
      const index = store.fichas.findIndex((entry) => entry.id === fichaId);
      if (index !== -1) {
        store.fichas.splice(index, 1);
        recalculateDemoStoreCosts(store);
        persistDemoStore(store);
      }
    },

    async inactivateFicha(fichaId: string) {
      const prismaResult = await inactivateFichaWithPrisma(fichaId, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const ficha = store.fichas.find((entry) => entry.id === fichaId);

      if (!ficha) {
        throw new Error(`Ficha ${fichaId} nao encontrada.`);
      }

      ficha.status = "inativa";
      ficha.updatedAt = "2026-03-13T15:06:00.000Z";
      recalculateDemoStoreCosts(store);
      persistDemoStore(store);

      return toFichaDetail(ficha);
    },

    async listCompositionRows() {
      const prismaResult = await listCompositionRowsWithPrisma(restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      return getDemoStore().fichas.flatMap((ficha) =>
        ficha.expandedRows.map((row) => ({
          ...cloneDemoStore(row),
          fichaId: ficha.id,
          fichaName: ficha.displayName
        }))
      );
    },

    async listCostSummaries() {
      const prismaResult = await listCostSummariesWithPrisma(restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      return getDemoStore().fichas.map((ficha) => ({
        fichaId: ficha.id,
        itemName: ficha.displayName,
        status: ficha.status,
        direct: ficha.costs.direct,
        inherited: ficha.costs.inherited,
        packaging: ficha.costs.packaging,
        total: ficha.costs.total,
        perKg: ficha.costs.perKg,
        perPortion: ficha.costs.perPortion,
        finalOutput: ficha.costs.finalOutput
      }));
    },

    async listAssemblyScenarios() {
      const prismaResult = await listAssemblyScenariosWithPrisma(restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();

      return store.assemblyScenarios.map((scenario) => ({
        ...cloneDemoStore(scenario),
        includedItems: scenario.includedItemIds
          .map((itemId) => store.items.find((item) => item.id === itemId)?.name)
          .filter((itemName): itemName is string => Boolean(itemName))
      }));
    }
  };
}

export function resetEngineeringRepositoryForTests() {
  resetDemoStore();
}
