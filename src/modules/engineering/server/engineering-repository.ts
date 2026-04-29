import "server-only";
import {
  type Prisma
} from "@/generated/prisma/client";
import type { ItemType } from "@/generated/prisma/client";
import {
  assertNoCyclesBeforeSaving,
  rebuildDependencyClosure,
  recalculateCascade
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
    .replace(/[\u0300-\u036f]/g, "")
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

async function ensureModality(tx: Prisma.TransactionClient, modalityId: string) {
  const existing = await tx.modalidade.findUnique({
    where: { id: modalityId }
  });

  if (existing) {
    return existing;
  }

  return tx.modalidade.create({
    data: {
      codigo: modalityId,
      nome: modalityId.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }
  });
}

async function resolveCanonicalFichaItem(tx: Prisma.TransactionClient, input: SaveFichaInput) {
  if (input.itemId) {
    return tx.item.findUniqueOrThrow({
      where: { id: input.itemId },
      include: {
        unidadeUsoPadrao: true
      }
    });
  }

  const normalizedName = toNormalizedName(input.displayName);
  const existing = await tx.item.findUnique({
    where: { nomeNormalizado: normalizedName },
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
      nome: input.displayName.trim(),
      nomeNormalizado: normalizedName,
      categoriaOperacional: input.groupOperational,
      tipoPrincipal: input.itemType,
      unidadeEstoqueId: yieldUnit.id,
      unidadeUsoPadraoId: yieldUnit.id,
      ativo: true
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
    return tx.tipoEtapa.findUnique({
      where: { id: input.stageTypeId }
    });
  }

  if (!input.stageTypeCode) {
    return null;
  }

  return tx.tipoEtapa.upsert({
    where: { codigo: input.stageTypeCode },
    update: {
      nome: resolveStageTypeName(input.stageTypeCode),
      ativo: true
    },
    create: {
      codigo: input.stageTypeCode,
      nome: resolveStageTypeName(input.stageTypeCode),
      ativo: true
    }
  });
}

function buildFallbackStagesFromComponents<
  T extends {
    itemComponenteId: string;
    itemComponente: { nome: string; tipoPrincipal: string };
    unidadeUso: { codigo: string };
    quantidadeBruta: { toFixed: (precision: number) => string };
    quantidadeLimpa: { toFixed: (precision: number) => string } | null;
    fatorCorrecao: { toFixed: (precision: number) => string } | null;
    indiceCoccao: { toFixed: (precision: number) => string } | null;
    observacao: string | null;
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
      correctionFactor: components[0]?.fatorCorrecao?.toFixed(6) ?? "",
      cookingIndex: components[0]?.indiceCoccao?.toFixed(6) ?? "",
      notes: "",
      items: components.map((component) => ({
        itemId: component.itemComponenteId,
        itemName: component.itemComponente.nome,
        componentType: component.itemComponente.tipoPrincipal === "embalagem"
          ? "embalagem"
          : component.itemComponente.tipoPrincipal === "apoio"
            ? "apoio"
            : "ingrediente",
        quantityUsed: component.quantidadeBruta.toFixed(4),
        quantityGross: component.quantidadeBruta.toFixed(4),
        quantityNet: component.quantidadeLimpa?.toFixed(4) ?? component.quantidadeBruta.toFixed(4),
        usageUnit: component.unidadeUso.codigo,
        levelLabel: "N1",
        correctionFactor: component.fatorCorrecao?.toFixed(6) ?? "",
        cookingIndex: component.indiceCoccao?.toFixed(6) ?? "",
        notes: component.observacao ?? ""
      }))
    }
  ];
}

async function queryFicha(
  client: Prisma.TransactionClient | NonNullable<ReturnType<typeof getPrismaClient>>,
  fichaId: string
) {
  return client.fichaTecnica.findUnique({
    where: { id: fichaId },
    include: {
      itemResultante: {
        include: {
          unidadeUsoPadrao: true,
          custosSnapshot: {
            orderBy: { calculadoEm: "desc" },
            take: 1
          }
        }
      },
      modalidade: true,
      unidadeRendimento: true,
      etapas: {
        orderBy: { ordem: "asc" },
        include: {
          tipoEtapa: true,
          componentes: {
            orderBy: { ordem: "asc" },
            include: {
              itemComponente: {
                select: {
                  nome: true,
                  tipoPrincipal: true,
                  unidadeUsoPadrao: true
                }
              },
              unidadeUso: true
            }
          }
        }
      },
      componentes: {
        orderBy: { ordem: "asc" },
        include: {
          itemComponente: {
            select: {
              nome: true,
              tipoPrincipal: true,
              unidadeUsoPadrao: true
            }
          },
          unidadeUso: true
        }
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
}

function mapFichaCosts(record: NonNullable<FichaRecord>) {
  const metadata = asObject(record.execucoesCalculo[0]?.metadadosJson ?? null);
  const usageUnit = record.itemResultante.unidadeUsoPadrao?.codigo ?? "kg";
  const total =
    readString(metadata, "totalCost") ??
    record.itemResultante.custosSnapshot[0]?.custoTotalAtual.toFixed(4) ??
    "0.0000";
  const rawFinalOutput = readString(metadata, "finalUsefulOutputQuantity") ?? "1.0000";

  return {
    direct: readString(metadata, "directCost") ?? total,
    inherited: readString(metadata, "inheritedCost") ?? "0.0000",
    packaging: record.itemResultante.custosSnapshot[0]?.custoEmbalagemAtual?.toFixed(4) ?? "0.0000",
    total,
    perKg: readString(metadata, "costPerKg") ?? total,
    perPortion: readString(metadata, "costPerPortion"),
    finalOutput: denormalizeQuantityFromCanonical(rawFinalOutput, usageUnit).toFixed(4)
  };
}

function mapExpandedRows(record: NonNullable<FichaRecord>) {
  const metadata = asObject(record.execucoesCalculo[0]?.metadadosJson ?? null);
  const rows = readArray(metadata, "expandedBreakdown");
  const fichaName = resolveFichaDisplayName({
    displayName: record.nomeExibicao,
    canonicalName: record.itemResultante.nome
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

      const matchedComponent = record.componentes.find((component) => path.startsWith(component.itemComponente.nome));
      const componentType = matchedComponent?.tipoComponente ?? "ingrediente";
      const usageUnit = matchedComponent?.unidadeUso.codigo ?? matchedComponent?.itemComponente.unidadeUsoPadrao?.codigo ?? "un";

      return {
        id: `${record.id}-${index}`,
        fichaId: record.id,
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
    id: stage.id,
    name: stage.nome,
    stageTypeId: stage.tipoEtapaId ?? undefined,
    stageTypeCode: stage.tipoEtapa?.codigo ?? undefined,
    stageTypeLabel: stage.tipoEtapa?.nome ?? undefined,
    outputQuantity: stage.pesoSaida?.toFixed(4) ?? "",
    correctionFactor: stage.fatorCorrecao?.toFixed(6) ?? "",
    cookingIndex: stage.indiceCoccao?.toFixed(6) ?? "",
    notes: stage.observacao ?? "",
    items: stage.componentes.map((component, index) => ({
      itemId: component.itemComponenteId,
      itemName: component.itemComponente.nome,
      componentType: component.tipoComponente,
      quantityUsed: component.quantidadeBruta.toFixed(4),
      quantityGross: component.quantidadeBruta.toFixed(4),
      quantityNet: component.quantidadeLimpa?.toFixed(4) ?? component.quantidadeBruta.toFixed(4),
      usageUnit: component.unidadeUso.codigo,
      levelLabel: `N${index + 1}`,
      correctionFactor: component.fatorCorrecao?.toFixed(6) ?? "",
      cookingIndex: component.indiceCoccao?.toFixed(6) ?? "",
      notes: component.observacao ?? ""
    }))
  }));

  return explicitStages.length > 0 ? explicitStages : buildFallbackStagesFromComponents(record.componentes);
}

function mapFichaListRow(record: NonNullable<FichaRecord>) {
  const costs = mapFichaCosts(record);
  const totalGross = record.componentes.reduce((sum, component) => sum + Number(component.quantidadeBruta.toFixed(4)), 0);
  const totalNet = record.componentes.reduce(
    (sum, component) => sum + Number((component.quantidadeLimpa ?? component.quantidadeBruta).toFixed(4)),
    0
  );
  const indicators = buildFichaIndicators({
    totalGross: totalGross.toFixed(4),
    totalNet: totalNet.toFixed(4),
    finalOutput: costs.finalOutput
  });
  const displayName = resolveFichaDisplayName({
    displayName: record.nomeExibicao,
    canonicalName: record.itemResultante.nome
  });

  const salePriceNumber = record.precoVenda ? Number(record.precoVenda) : 0;
  const totalInputCostNumber = Number(costs.total) || 0;
  const packagingCostNumber = Number(costs.packaging) || 0;
  const costRealNumber = totalInputCostNumber + packagingCostNumber;
  const variableExpensePercentNumber = normalizePercentInput(
    record.despesaVariavelPercentual ? Number(record.despesaVariavelPercentual) : null
  );
  const contributionMarginPercent =
    salePriceNumber > 0 && variableExpensePercentNumber !== null
      ? (salePriceNumber - costRealNumber - salePriceNumber * variableExpensePercentNumber) / salePriceNumber
      : null;

  return {
    id: record.id,
    itemId: record.itemResultanteId,
    code: record.itemResultante.codigoInterno ?? "--",
    itemName: displayName,
    itemType: record.itemResultante.tipoPrincipal,
    version: record.versao,
    modalityLabel: record.modalidade?.nome ?? "Sem modalidade",
    groupOperational: record.itemResultante.categoriaOperacional ?? "Sem grupo",
    status: record.status,
    correctionFactor: indicators.correctionFactor,
    cookingIndex: indicators.cookingIndex,
    totalCost: costs.total,
    sellingPrice: record.precoVenda?.toFixed(4) ?? null,
    contributionMarginPercent: contributionMarginPercent !== null ? contributionMarginPercent.toFixed(4) : null,
    updatedAt: record.atualizadaEm.toISOString(),
    componentCount: record.componentes.length,
    notes: record.observacoes ?? ""
  };
}

function mapFichaDetail(record: NonNullable<FichaRecord>) {
  const usageUnit = record.itemResultante.unidadeUsoPadrao?.codigo ?? "kg";
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
      summary.totalGross += Number(component.quantidadeBruta.toFixed(4));
      summary.totalNet += Number((component.quantidadeLimpa ?? component.quantidadeBruta).toFixed(4));
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
    displayName: record.nomeExibicao,
    canonicalName: record.itemResultante.nome
  });
  const indicators = buildFichaIndicators({
    totalGross: componentMetrics.totalGross.toFixed(4),
    totalNet: componentMetrics.totalNet.toFixed(4),
    finalOutput: costs.finalOutput
  });

  return {
    id: record.id,
    itemId: record.itemResultanteId,
    itemName: displayName,
    canonicalItemName: record.itemResultante.nome,
    itemType: record.itemResultante.tipoPrincipal,
    groupOperational: record.itemResultante.categoriaOperacional ?? "Sem grupo",
    modality: {
      id: record.modalidade?.id ?? "",
      label: record.modalidade?.nome ?? "Sem modalidade"
    },
    version: record.versao,
    status: record.status,
    yieldMode: record.modoRendimento,
    percentLoss: record.percentualPerda?.toFixed(4) ?? null,
    finalWeight: record.pesoFinalInformado
      ? denormalizeQuantityFromCanonical(record.pesoFinalInformado.toString(), usageUnit).toFixed(4)
      : null,
    portions: record.rendimentoPorcoes?.toFixed(4) ?? null,
    preparationMode: record.modoPreparo ?? "",
    notes: record.observacoes ?? "",
    createdAt: record.criadaEm.toISOString(),
    updatedAt: record.atualizadaEm.toISOString(),
    createdAtLabel: formatDateTimeLabel(record.criadaEm),
    updatedAtLabel: formatDateTimeLabel(record.atualizadaEm),
    usageUnit,
    yieldUnitCode: record.unidadeRendimento?.codigo ?? usageUnit,
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
      lastCalculatedAt: record.execucoesCalculo[0]?.criadoEm.toISOString() ?? record.atualizadaEm.toISOString()
    },
    sheetSummary: buildCommercialSummary({
      itemType: record.itemResultante.tipoPrincipal,
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
      salePrice: record.precoVenda?.toFixed(4) ?? null,
      variableExpensePercent: record.despesaVariavelPercentual?.toFixed(4) ?? null,
      preparationModePreview: record.modoPreparo ?? ""
    })
  };
}

async function listFichasWithPrisma(input: ListFichasInput) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  const query = input.query.trim();
  const typedQuery =
    query && ["insumo", "pre_preparo", "intermediario", "produto_pronto", "prato", "porcao", "marmita", "combo", "embalagem", "apoio"].includes(query)
      ? (query as ItemType)
      : null;
  const where: Prisma.FichaTecnicaWhereInput = {
    AND: [
      input.status && input.status !== "all" ? { status: input.status } : {},
      query
        ? {
            OR: [
              {
                itemResultante: {
                  nome: { contains: query, mode: "insensitive" }
                }
              },
              {
                nomeExibicao: { contains: query, mode: "insensitive" }
              },
              ...(typedQuery
                ? [{
                itemResultante: {
                  tipoPrincipal: {
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
        orderBy: [{ atualizadaEm: "desc" }, { versao: "desc" }],
        skip: (Math.max(input.page, 1) - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          itemResultante: {
            include: {
              custosSnapshot: {
                orderBy: { calculadoEm: "desc" },
                take: 1
              }
            }
          },
          modalidade: true,
          etapas: {
            orderBy: { ordem: "asc" },
            include: {
              componentes: {
                orderBy: { ordem: "asc" },
                include: {
                  itemComponente: {
                    select: {
                      nome: true,
                      tipoPrincipal: true,
                      unidadeUsoPadrao: true
                    }
                  },
                  unidadeUso: true
                }
              }
            }
          },
          componentes: {
            orderBy: { ordem: "asc" },
            include: {
              itemComponente: {
                select: {
                  nome: true,
                  tipoPrincipal: true,
                  unidadeUsoPadrao: true
                }
              },
              unidadeUso: true
            }
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
      items: fichas.map((ficha) => mapFichaListRow(ficha as NonNullable<FichaRecord>)),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
      page: Math.max(input.page, 1)
    };
  } catch {
    return null;
  }
}

async function getFichaDetailWithPrisma(fichaId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await queryFicha(prisma, fichaId);
    return ficha ? mapFichaDetail(ficha) : null;
  } catch {
    return null;
  }
}

async function saveFichaWithPrisma(input: SaveFichaInput) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await prisma.$transaction(async (tx) => {
      const modality = await ensureModality(tx, input.modalityId);
      const item = await resolveCanonicalFichaItem(tx, input);
      const yieldUnit = await ensureUnit(tx, input.yieldUnitCode);
      const resultUsageUnit = item.unidadeUsoPadrao?.codigo ?? "kg";
      const normalizedFinalWeight =
        input.yieldMode === "peso_final" && input.finalWeight
          ? normalizeQuantityToCanonical(input.finalWeight, resultUsageUnit).toString()
          : null;

      await assertNoCyclesBeforeSaving(
        tx,
        item.id,
        input.components.map((component) => component.itemId)
      );

      const existing = input.id
        ? await tx.fichaTecnica.findUnique({
            where: { id: input.id }
          })
        : null;

      const highestVersion = await tx.fichaTecnica.aggregate({
        where: { itemResultanteId: item.id },
        _max: { versao: true }
      });

      if (input.status === "ativa") {
        await tx.fichaTecnica.updateMany({
          where: {
            itemResultanteId: item.id,
            status: "ativa",
            id: existing?.id ? { not: existing.id } : undefined
          },
          data: {
            status: "inativa"
          }
        });
      }

      const ficha = existing
        ? await tx.fichaTecnica.update({
            where: { id: existing.id },
            data: {
              modalidadeId: modality.id,
              nomeExibicao: input.displayName.trim(),
              unidadeRendimentoId: yieldUnit.id,
              status: input.status,
              modoRendimento: input.yieldMode,
              percentualPerda: input.yieldMode === "percentual_perda" ? input.percentLoss : null,
              pesoFinalInformado: normalizedFinalWeight,
              rendimentoPorcoes: input.portions,
              precoVenda: input.salePrice || null,
              despesaVariavelPercentual: input.variableExpensePercent || null,
              modoPreparo: input.preparationMode,
              observacoes: input.notes
            }
          })
        : await tx.fichaTecnica.create({
            data: {
              itemResultanteId: item.id,
              modalidadeId: modality.id,
              nomeExibicao: input.displayName.trim(),
              unidadeRendimentoId: yieldUnit.id,
              versao: (highestVersion._max.versao ?? 0) + 1,
              status: input.status,
              modoRendimento: input.yieldMode,
              percentualPerda: input.yieldMode === "percentual_perda" ? input.percentLoss : null,
              pesoFinalInformado: normalizedFinalWeight,
              rendimentoPorcoes: input.portions,
              precoVenda: input.salePrice || null,
              despesaVariavelPercentual: input.variableExpensePercent || null,
              modoPreparo: input.preparationMode,
              observacoes: input.notes
            }
          });

      await tx.fichaEtapa.deleteMany({
        where: { fichaTecnicaId: ficha.id }
      });

      await tx.fichaComponente.deleteMany({
        where: { fichaTecnicaId: ficha.id }
      });

      let componentOrder = 0;

      for (const [stageIndex, stage] of input.stages.entries()) {
        const stageType = await ensureStageType(tx, stage);
        const createdStage = await tx.fichaEtapa.create({
          data: {
            fichaTecnicaId: ficha.id,
            tipoEtapaId: stageType?.id ?? null,
            ordem: stageIndex + 1,
            nome: normalizeStageName(stage.name, stageIndex + 1),
            pesoEntrada: stage.items.reduce((sum, itemRow) => sum + Number(itemRow.quantityUsed || "0"), 0).toString(),
            pesoSaida: stage.outputQuantity || null,
            fatorCorrecao: stage.correctionFactor || null,
            indiceCoccao: stage.cookingIndex || null,
            valorTotalSnapshot: null,
            observacao: stage.notes || null
          }
        });

        for (const itemRow of stage.items) {
          const usageUnit = await ensureUnit(tx, itemRow.usageUnit);
          componentOrder += 1;
          await tx.fichaComponente.create({
            data: {
              fichaTecnicaId: ficha.id,
              fichaEtapaId: createdStage.id,
              itemComponenteId: itemRow.itemId,
              tipoComponente: itemRow.componentType,
              ordem: componentOrder,
              quantidadeBruta: itemRow.quantityUsed,
              quantidadeLimpa: itemRow.quantityUsed,
              unidadeUsoId: usageUnit.id,
              fatorCorrecao: stage.correctionFactor || null,
              indiceCoccao: stage.cookingIndex || null,
              observacao: itemRow.notes || null
            }
          });
        }
      }

      await rebuildDependencyClosure(tx);
      return ficha;
    });

    if (input.status === "ativa") {
      await recalculateCascade(prisma, [ficha.itemResultanteId], "ficha.save.web");
    }

    return getFichaDetailWithPrisma(ficha.id);
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

async function duplicateFichaWithPrisma(fichaId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const duplicated = await prisma.$transaction(async (tx) => {
      const source = await queryFicha(tx, fichaId);

      if (!source) {
        throw new Error(`Ficha ${fichaId} nao encontrada.`);
      }

      const highestVersion = await tx.fichaTecnica.aggregate({
        where: { itemResultanteId: source.itemResultanteId },
        _max: { versao: true }
      });

      const created = await tx.fichaTecnica.create({
        data: {
          itemResultanteId: source.itemResultanteId,
          nomeExibicao: source.nomeExibicao,
          modalidadeId: source.modalidadeId,
          unidadeRendimentoId: source.unidadeRendimentoId,
          versao: (highestVersion._max.versao ?? 0) + 1,
          status: "rascunho",
          modoRendimento: source.modoRendimento,
          percentualPerda: source.percentualPerda,
          pesoFinalInformado: source.pesoFinalInformado,
          rendimentoPorcoes: source.rendimentoPorcoes,
          precoVenda: source.precoVenda,
          despesaVariavelPercentual: source.despesaVariavelPercentual,
          modoPreparo: source.modoPreparo,
          observacoes: source.observacoes
        }
      });

      const stageIdMap = new Map<string, string>();

      for (const stage of source.etapas) {
        const createdStage = await tx.fichaEtapa.create({
          data: {
            fichaTecnicaId: created.id,
            tipoEtapaId: stage.tipoEtapaId,
            ordem: stage.ordem,
            nome: stage.nome,
            pesoEntrada: stage.pesoEntrada,
            pesoSaida: stage.pesoSaida,
            fatorCorrecao: stage.fatorCorrecao,
            indiceCoccao: stage.indiceCoccao,
            valorTotalSnapshot: stage.valorTotalSnapshot,
            observacao: stage.observacao
          }
        });

        stageIdMap.set(stage.id, createdStage.id);
      }

      for (const component of source.componentes) {
        await tx.fichaComponente.create({
          data: {
            fichaTecnicaId: created.id,
            fichaEtapaId: component.fichaEtapaId ? stageIdMap.get(component.fichaEtapaId) ?? null : null,
            itemComponenteId: component.itemComponenteId,
            tipoComponente: component.tipoComponente,
            ordem: component.ordem,
            quantidadeBruta: component.quantidadeBruta,
            quantidadeLimpa: component.quantidadeLimpa,
            unidadeUsoId: component.unidadeUsoId,
            fatorCorrecao: component.fatorCorrecao,
            indiceCoccao: component.indiceCoccao,
            observacao: component.observacao
          }
        });
      }

      return created.id;
    });

    return getFichaDetailWithPrisma(duplicated);
  } catch {
    return null;
  }
}

async function inactivateFichaWithPrisma(fichaId: string) {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const ficha = await prisma.$transaction(async (tx) => {
      const updated = await tx.fichaTecnica.update({
        where: { id: fichaId },
        data: {
          status: "inativa"
        }
      });

      await rebuildDependencyClosure(tx);
      return updated;
    });

    await recalculateCascade(prisma, [ficha.itemResultanteId], "ficha.inactivate.web");
    return getFichaDetailWithPrisma(ficha.id);
  } catch {
    return null;
  }
}

async function listCompositionRowsWithPrisma() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      orderBy: { atualizadaEm: "desc" },
        include: {
          itemResultante: {
            include: {
              custosSnapshot: {
                orderBy: { calculadoEm: "desc" },
                take: 1
              }
            }
          },
          modalidade: true,
          etapas: {
            orderBy: { ordem: "asc" },
            include: {
              componentes: {
                orderBy: { ordem: "asc" },
                include: {
                  itemComponente: {
                    select: {
                      nome: true,
                      tipoPrincipal: true,
                      unidadeUsoPadrao: true
                    }
                  },
                  unidadeUso: true
                }
              }
            }
          },
          componentes: {
            orderBy: { ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nome: true,
                tipoPrincipal: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

    return fichas.flatMap((ficha) => mapExpandedRows(ficha as NonNullable<FichaRecord>));
  } catch {
    return null;
  }
}

async function listCostSummariesWithPrisma() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      orderBy: { atualizadaEm: "desc" },
      include: {
        itemResultante: {
          include: {
            custosSnapshot: {
              orderBy: { calculadoEm: "desc" },
              take: 1
            }
          }
        },
        componentes: {
          orderBy: { ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nome: true,
                tipoPrincipal: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

async function listAssemblyScenariosWithPrisma() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return null;
  }

  try {
    const fichas = await prisma.fichaTecnica.findMany({
      where: {
        itemResultante: {
          tipoPrincipal: {
            in: ["prato", "porcao", "marmita", "combo"]
          }
        }
      },
      orderBy: { atualizadaEm: "desc" },
      include: {
        itemResultante: {
          include: {
            custosSnapshot: {
              orderBy: { calculadoEm: "desc" },
              take: 1
            }
          }
        },
        componentes: {
          orderBy: { ordem: "asc" },
          include: {
            itemComponente: {
              select: {
                nome: true,
                tipoPrincipal: true,
                unidadeUsoPadrao: true
              }
            },
            unidadeUso: true
          }
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

export function getEngineeringRepository() {
  return {
    async listModalities() {
      const prisma = getPrismaClient(getServerEnv().DATABASE_URL);

      if (prisma) {
        try {
          const rows = await prisma.modalidade.findMany({
            where: { ativo: true },
            orderBy: { nome: "asc" }
          });

          if (rows.length > 0) {
            return rows.map((row) => ({
              id: row.id,
              label: row.nome
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
      const prismaResult = await listFichasWithPrisma({ page, pageSize, query, status });
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
      const prismaResult = await getFichaDetailWithPrisma(fichaId);
      if (prismaResult) {
        return prismaResult;
      }

      const ficha = getDemoStore().fichas.find((entry) => entry.id === fichaId);
      return ficha ? toFichaDetail(ficha) : null;
    },

    async saveFicha(input: SaveFichaInput) {
      const prismaResult = await saveFichaWithPrisma(input);
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
      const prismaResult = await duplicateFichaWithPrisma(fichaId);
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
      const prismaResult = await inactivateFichaWithPrisma(fichaId);
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
      const prismaResult = await listCompositionRowsWithPrisma();
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
      const prismaResult = await listCostSummariesWithPrisma();
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
      const prismaResult = await listAssemblyScenariosWithPrisma();
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
