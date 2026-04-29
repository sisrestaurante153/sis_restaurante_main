import {
  FichaStatus,
  type Prisma,
  type FichaTecnica,
  type Item,
  type ItemAlias,
  type ItemCompra,
  type UnidadeMedida
} from "@/generated/prisma/client";

export type CatalogItemRecord = Item & {
  unidadeEstoque: UnidadeMedida | null;
  unidadeUsoPadrao: UnidadeMedida | null;
  aliases: ItemAlias[];
  conversoes: Array<{
    unidadeOrigemId: string;
    unidadeDestinoId: string;
    fator: Prisma.Decimal;
  }>;
  compras: Array<
    ItemCompra & {
      fornecedor: { nome: string };
      unidadeCompra: UnidadeMedida;
      unidadeUso: UnidadeMedida | null;
    }
  >;
  fichasResultantes: FichaTecnica[];
  custosSnapshot: Array<{
    custoEmbalagemAtual: Prisma.Decimal | null;
    custoTotalAtual: Prisma.Decimal;
    calculadoEm: Date;
  }>;
  execucoesCalculo: Array<{
    criadoEm: Date;
    metadadosJson: Prisma.JsonValue | null;
  }>;
};

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

function resolveFichaStatus(item: CatalogItemRecord) {
  const active = item.fichasResultantes.find((ficha) => ficha.status === FichaStatus.ativa);
  return active?.status ?? item.fichasResultantes[0]?.status ?? null;
}

function resolvePreferredPurchase(item: CatalogItemRecord) {
  return (
    item.compras.find((purchase) => purchase.principal) ??
    [...item.compras].sort((left, right) => {
      const leftTime = left.dataAtualizacaoPreco?.getTime() ?? left.atualizadoEm.getTime();
      const rightTime = right.dataAtualizacaoPreco?.getTime() ?? right.atualizadoEm.getTime();
      return rightTime - leftTime;
    })[0] ??
    null
  );
}

function mapPurchases(item: CatalogItemRecord) {
  // D-05: secundarios derivam unidadeUso + quantidadeUso do principal na leitura.
  // D-02: fator = quantidadeCompra / quantidadeUso (sempre computado).
  // D-07: precoUso por fornecedor usa seus proprios quantidadeCompra/custoCompra com a quantidadeUso derivada.
  const primary = item.compras.find((c) => c.principal);
  const primaryUsageUnit = primary?.unidadeUso?.codigo ?? primary?.unidadeCompra.codigo ?? "";
  const primaryUsageQuantity = primary?.quantidadeUso?.toFixed(4) ?? "1.0000";

  return item.compras.map((purchase) => {
    const isPrimary = purchase.principal;
    const displayUsageUnit = isPrimary
      ? (purchase.unidadeUso?.codigo ?? purchase.unidadeCompra.codigo ?? "")
      : primaryUsageUnit;
    const displayUsageQuantity = isPrimary
      ? (purchase.quantidadeUso?.toFixed(4) ?? "1.0000")
      : primaryUsageQuantity;

    const qc = Number(purchase.quantidadePorEmbalagem);
    const qu = Number(displayUsageQuantity);
    const fator = Number.isFinite(qc) && Number.isFinite(qu) && qu > 0 ? qc / qu : 1;
    const precoUso = fator > 0 ? Number(purchase.custoCompra) / fator : Number(purchase.custoCompra);

    return {
      id: purchase.id,
      supplierName: purchase.fornecedor.nome,
      purchaseUnit: purchase.unidadeCompra.codigo,
      purchaseIsPrimary: isPrimary,
      purchaseQuantity: purchase.quantidadePorEmbalagem.toFixed(4),
      purchaseCost: purchase.custoCompra.toFixed(4),
      usageUnit: displayUsageUnit,
      usageQuantity: displayUsageQuantity,
      conversionFactor: fator.toFixed(4),
      usagePrice: precoUso.toFixed(4),
      usageIsFixedFromPrimary: !isPrimary,
      baseUnitCost: purchase.custoUnitarioBase.toFixed(6),
      priceUpdatedAt: purchase.dataAtualizacaoPreco?.toISOString().slice(0, 10) ?? "",
      notes: purchase.observacao ?? ""
    };
  });
}

function mapCosts(item: CatalogItemRecord) {
  const latestSnapshot = item.custosSnapshot[0];
  const latestExecution = asObject(item.execucoesCalculo[0]?.metadadosJson ?? null);
  const total =
    latestSnapshot?.custoTotalAtual.toFixed(4) ?? readString(latestExecution, "totalCost") ?? "0.0000";

  return {
    direct: readString(latestExecution, "directCost") ?? total,
    inherited: readString(latestExecution, "inheritedCost") ?? "0.0000",
    packaging: latestSnapshot?.custoEmbalagemAtual?.toFixed(4) ?? "0.0000",
    total,
    perKg: readString(latestExecution, "costPerKg") ?? total,
    perPortion: readString(latestExecution, "costPerPortion"),
    finalOutput: readString(latestExecution, "finalUsefulOutputQuantity") ?? "1.0000"
  };
}

export function mapItemListRow(item: CatalogItemRecord) {
  const purchases = mapPurchases(item);
  const preferredPurchase = resolvePreferredPurchase(item);
  const selectedPurchase = preferredPurchase ? purchases.find((purchase) => purchase.id === preferredPurchase.id) : null;
  const costs = mapCosts(item);

  const supplierCount = new Set(
    item.compras.map((c) => c.fornecedor?.nome).filter(Boolean)
  ).size;

  // D-10: item sem principal exibe "--" em todas as colunas derivadas.
  const hasPurchase = selectedPurchase != null;

  return {
    id: item.id,
    code: item.codigoInterno ?? item.id.slice(-6).toUpperCase(),
    name: item.nome,
    type: item.tipoPrincipal,
    category: item.categoriaOperacional ?? "sem categoria",
    stockUnit: item.unidadeEstoque?.codigo ?? "-",
    purchaseQuantity: hasPurchase ? selectedPurchase!.purchaseQuantity : "--",
    usageUnit: hasPurchase ? selectedPurchase!.usageUnit : "--",
    conversionFactor: hasPurchase ? selectedPurchase!.conversionFactor : "--",
    supplierName: hasPurchase ? selectedPurchase!.supplierName : "--",
    supplierCount,
    baseUnitCost: hasPurchase ? selectedPurchase!.baseUnitCost : "--",
    usageQuantity: hasPurchase ? selectedPurchase!.usageQuantity : "--",
    usagePrice: hasPurchase ? selectedPurchase!.usagePrice : "--",
    description: item.descricao ?? "",
    totalCost: costs.total,
    fichaStatus: resolveFichaStatus(item),
    active: item.ativo,
    updatedAt: item.custosSnapshot[0]?.calculadoEm.toISOString() ?? item.atualizadoEm.toISOString()
  };
}

export function mapItemDetail(item: CatalogItemRecord) {
  const purchases = mapPurchases(item);
  const preferredPurchase = resolvePreferredPurchase(item);
  const selectedPurchase = preferredPurchase ? purchases.find((purchase) => purchase.id === preferredPurchase.id) : null;
  const costs = mapCosts(item);

  return {
    id: item.id,
    code: item.codigoInterno ?? item.id.slice(-6).toUpperCase(),
    name: item.nome,
    description: item.descricao ?? "",
    type: item.tipoPrincipal,
    operationalCategory: item.categoriaOperacional ?? "",
    active: item.ativo,
    aliases: item.aliases.map((alias) => alias.alias),
    stock: {
      unit: item.unidadeEstoque?.codigo ?? ""
    },
    usage: {
      unit: item.unidadeUsoPadrao?.codigo ?? "",
      conversionFactor: selectedPurchase?.conversionFactor ?? "1.0000",
      usageQuantity: selectedPurchase?.usageQuantity ?? "0.0000",
      usagePrice: selectedPurchase?.usagePrice ?? "0.0000"
    },
    purchase: selectedPurchase
      ? {
          supplier: selectedPurchase.supplierName,
          unit: selectedPurchase.purchaseUnit,
          quantity: selectedPurchase.purchaseQuantity,
          cost: selectedPurchase.purchaseCost,
          baseUnitCost: selectedPurchase.baseUnitCost,
          purchaseIsPrimary: selectedPurchase.purchaseIsPrimary,
          usageQuantity: selectedPurchase.usageQuantity,
          usagePrice: selectedPurchase.usagePrice,
          priceUpdatedAt: selectedPurchase.priceUpdatedAt
        }
      : {
          supplier: "",
          unit: "",
          quantity: "0.0000",
          cost: "0.0000",
          baseUnitCost: "0.000000",
          purchaseIsPrimary: false,
          usageQuantity: "0.0000",
          usagePrice: "0.0000",
          priceUpdatedAt: ""
        },
    purchases,
    costs,
    fichaStatus: resolveFichaStatus(item),
    lastCalculationAt: item.custosSnapshot[0]?.calculadoEm.toISOString() ?? item.atualizadoEm.toISOString()
  };
}

export function mapItemOption(item: CatalogItemRecord) {
  const costs = mapCosts(item);
  const linkedFicha =
    item.fichasResultantes.find((ficha) => ficha.status === FichaStatus.ativa) ?? item.fichasResultantes[0] ?? null;

  return {
    id: item.id,
    name: item.nome,
    type: item.tipoPrincipal,
    code: item.codigoInterno ?? "",
    operationalCategory: item.categoriaOperacional ?? "Sem grupo",
    usageUnit: item.unidadeUsoPadrao?.codigo ?? "un",
    currentCost: costs.perKg,
    finalOutput: costs.finalOutput,
    linkedFichaId: linkedFicha?.id,
    linkedFichaName: linkedFicha?.nomeExibicao ?? item.nome
  };
}
