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

export interface ListFichasInput {
  page: number;
  pageSize: number;
  query: string;
  status?: DemoFichaStatus | "all";
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
  if (percent <= 30) {
    return "Saudavel" as const;
  }

  if (percent <= 40) {
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
  if (input.itemId) {
    const linkedItem = store.items.find((item) => item.id === input.itemId);

    if (!linkedItem) {
      throw new Error(`Item ${input.itemId} nao encontrado.`);
    }

    return linkedItem;
  }

  const normalizedName = toNormalizedName(input.displayName);
  const existing = store.items.find((item) => item.normalizedName === normalizedName);

  if (existing) {
    return existing;
  }

  const created: DemoItemRecord = {
    id: createDemoId("item"),
    code: `FCH-${String(store.items.length + 1).padStart(3, "0")}`,
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
  const contributionMarginValue =
    salePriceNumber !== null && variableExpenseValue !== null
      ? salePriceNumber - costRealNumber - variableExpenseValue
      : null;
  const contributionMarginPercent =
    hasUsableSalePrice && contributionMarginValue !== null
      ? contributionMarginValue / salePriceNumber
      : null;
  const cmvWithPackagingPerKgNumber = hasUsableWeight ? costRealNumber / postCookingWeightNumber : null;
  const finalAppliedCmvNumber = assemblyEnabled
    ? cmvWithPackagingPerKgNumber
    : costWithoutPackagingPerKgNumber;
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
  const existing = await tx.modalidade.findUnique({
    where: { cd_modalidade: modalityId }
  });

  if (existing) {
    return existing;
  }

  return tx.modalidade.create({
    data: {
      ds_codigo: modalityId,
      nm_modalidade: modalityId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }
  });
}

async function resolveCanonicalFichaItem(
  tx: Prisma.TransactionClient,
  input: SaveFichaInput,
  restaurantId: string
) {
  if (input.itemId) {
    const existing = await tx.item.findUniqueOrThrow({
      where: { cd_item: input.itemId },
      include: {
        unidadeUsoPadrao: true
      }
    });

    if (input.code && existing.ds_codigo_interno !== input.code.trim()) {
      return tx.item.update({
        where: { cd_item: input.itemId },
        data: { ds_codigo_interno: input.code.trim() },
        include: { unidadeUsoPadrao: true }
      });
    }

    return existing;
  }

  const normalizedName = toNormalizedName(input.displayName);
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
    return existing;
  }

  const yieldUnit = await ensureUnit(tx, input.yieldUnitCode);

  return tx.item.create({
    data: {
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
      items: components.map((component) => ({
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
        notes: component.ds_observacao ?? ""
      }))
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

      const matchedComponent = record.componentes.find((component) => path.startsWith(component.itemComponente.nm_item));
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
    items: stage.componentes.map((component, index) => ({
      itemId: component.cd_item_componente,
      itemName: component.itemComponente.nm_item,
      componentType: component.tp_componente,
      quantityUsed: component.vl_qtd_bruta.toFixed(4),
      quantityGross: component.vl_qtd_bruta.toFixed(4),
      quantityNet: component.vl_qtd_limpa?.toFixed(4) ?? component.vl_qtd_bruta.toFixed(4),
      usageUnit: component.unidadeUso.ds_codigo,
      levelLabel: `N${index + 1}`,
      correctionFactor: component.vl_fator_correcao?.toFixed(6) ?? "",
      cookingIndex: component.vl_indice_coccao?.toFixed(6) ?? "",
      notes: component.ds_observacao ?? ""
    }))
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
  const totalInputCostNumber = Number(costs.total) || 0;
  const packagingCostNumber = Number(costs.packaging) || 0;
  const costRealNumber = totalInputCostNumber + packagingCostNumber;
  const variableExpensePercentNumber = normalizePercentInput(
    record.vl_pct_despesa_variavel ? Number(record.vl_pct_despesa_variavel) : null
  );
  const contributionMarginPercent =
    salePriceNumber > 0 && variableExpensePercentNumber !== null
      ? (salePriceNumber - costRealNumber - salePriceNumber * variableExpensePercentNumber) / salePriceNumber
      : null;

  return {
    id: record.cd_ficha_tecnica,
    itemId: record.cd_item_resultante,
    code: record.itemResultante.ds_codigo_interno ?? "--",
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
    code: record.itemResultante.ds_codigo_interno ?? "",
    itemId: record.cd_item_resultante,
    itemName: displayName,
    canonicalItemName: record.itemResultante.nm_item,
    itemType: record.itemResultante.tp_item,
    groupOperational: record.itemResultante.nm_categoria_operacional ?? "Sem grupo",
    modality: {
      id: record.modalidade?.cd_modalidade ?? "",
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
      totalInputCost: costs.total,
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

  try {
    const [totalCount, fichas] = await Promise.all([
      prisma.fichaTecnica.count({ where }),
      prisma.fichaTecnica.findMany({
        where,
        orderBy: [{ ts_atualizacao: "desc" }, { nr_versao: "desc" }],
        skip: (Math.max(input.page, 1) - 1) * input.pageSize,
        take: input.pageSize,
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
          componentes: {
            select: {
              vl_qtd_bruta: true,
              vl_qtd_limpa: true
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
      })
    ]);

    return {
      items: fichas.map((ficha) => mapFichaListRow(ficha as unknown as NonNullable<FichaRecord>)),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
      page: Math.max(input.page, 1)
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
  } catch {
    return null;
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
          await tx.fichaComponente.create({
            data: {
              cd_ficha_tecnica: ficha.cd_ficha_tecnica,
              cd_ficha_etapa: createdStage.cd_ficha_etapa,
              cd_item_componente: itemRow.itemId,
              tp_componente: itemRow.componentType,
              nr_ordem: componentOrder,
              vl_qtd_bruta: itemRow.quantityUsed,
              vl_qtd_limpa: itemRow.quantityUsed,
              cd_unidade_uso: usageUnit.cd_unidade_medida,
              vl_fator_correcao: stage.correctionFactor || null,
              vl_indice_coccao: stage.cookingIndex || null,
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
    });

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
    });

    return getFichaDetailWithPrisma(duplicated, restaurantId);
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
    });

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
  const totalInputCostNumber = Number(ficha.costs.total) || 0;
  const packagingCostNumber = Number(ficha.costs.packaging) || 0;
  const costRealNumber = totalInputCostNumber + packagingCostNumber;
  const variableExpensePercentNumber = normalizePercentInput(
    ficha.variableExpensePercent ? Number(ficha.variableExpensePercent) : null
  );
  const contributionMarginPercent =
    salePriceNumber > 0 && variableExpensePercentNumber !== null
      ? (salePriceNumber - costRealNumber - salePriceNumber * variableExpensePercentNumber) / salePriceNumber
      : null;

  return {
    id: ficha.id,
    itemId: ficha.itemId,
    code: getDemoStore().items.find((item) => item.id === ficha.itemId)?.code ?? "--",
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
    code: getDemoStore().items.find((item) => item.id === ficha.itemId)?.code ?? "",
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
    createdAt: ficha.updatedAt,
    updatedAt: ficha.updatedAt,
    createdAtLabel: formatDateTimeLabel(ficha.updatedAt),
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
        .map((component, index) => ({
          ...component,
          quantityUsed: component.quantityUsed || component.quantityGross,
          levelLabel: `N${index + 1}`,
          correctionFactor: component.correctionFactor ?? "",
          cookingIndex: component.cookingIndex ?? "",
          notes: component.notes ?? ""
        }))
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
      totalInputCost: ficha.costs.total,
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
              id: row.cd_modalidade,
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
        }));
    },

    async listFichas({ page, pageSize, query, status = "all" }: ListFichasInput) {
      const prismaResult = await listFichasWithPrisma({ page, pageSize, query, status }, restaurantId);
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

        return matchesQuery && matchesStatus;
      });

      const sorted = [...filtered].sort((left, right) => right.version - left.version);
      const paginated = paginate(sorted, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toFichaListRow)
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
      const prismaResult = await saveFichaWithPrisma(input, restaurantId);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const existing = input.id ? store.fichas.find((entry) => entry.id === input.id) : undefined;
      const linkedItem = resolveDemoFichaItem(store, input);
      const selectedModality =
        store.modalities.find((entry) => entry.id === input.modalityId) ??
        {
          id: input.modalityId,
          code: input.modalityId,
          label: input.modalityId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          active: true
        };
      if (!store.modalities.some((entry) => entry.id === selectedModality.id)) {
        store.modalities.unshift(selectedModality);
      }
      const highestVersion = store.fichas
        .filter((entry) => entry.itemId === linkedItem.id)
        .reduce((maxVersion, entry) => Math.max(maxVersion, entry.version), 0);
      const version = existing ? existing.version : highestVersion + 1;
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
        return stage.items.map((component) => ({
          id: createDemoId("cmp"),
          stageId,
          itemId: component.itemId,
          itemName:
            store.items.find((item) => item.id === component.itemId)?.name ?? component.itemId,
          componentType: component.componentType,
          quantityUsed: component.quantityUsed,
          quantityGross: component.quantityUsed,
          quantityNet: component.quantityUsed,
          usageUnit: component.usageUnit,
          correctionFactor: stage.correctionFactor ?? "",
          cookingIndex: stage.cookingIndex ?? "",
          notes: component.notes ?? "",
          directCost: "0.0000",
          inheritedCost: "0.0000",
          totalCost: "0.0000",
          impactPercent: "0.0000"
        }));
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
        updatedAt: "2026-03-13T15:10:00.000Z",
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
        updatedAt: "2026-03-13T15:05:00.000Z",
        components: duplicateComponents(source.components),
        expandedRows: cloneDemoStore(source.expandedRows)
      };

      store.fichas.unshift(duplicated);
      recalculateDemoStoreCosts(store);
      persistDemoStore(store);

      return toFichaDetail(store.fichas.find((entry) => entry.id === duplicated.id) ?? duplicated);
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
