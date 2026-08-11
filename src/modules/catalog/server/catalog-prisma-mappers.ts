import {
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
    cd_unidade_origem: string;
    cd_unidade_destino: string;
    vl_fator: Prisma.Decimal;
  }>;
  compras: Array<
    ItemCompra & {
      fornecedor: { nm_fornecedor: string };
      unidadeCompra: UnidadeMedida;
      unidadeUso: UnidadeMedida | null;
    }
  >;
  fichasResultantes: FichaTecnica[];
  custosSnapshot: Array<{
    vl_custo_embalagem: Prisma.Decimal | null;
    vl_custo_total: Prisma.Decimal;
    ts_calculo: Date;
  }>;
  execucoesCalculo: Array<{
    ts_criacao: Date;
    js_metadados: Prisma.JsonValue | null;
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
  const active = item.fichasResultantes.find((ficha) => ficha.tp_status === "ativa");
  return active?.tp_status ?? item.fichasResultantes[0]?.tp_status ?? null;
}

function resolvePreferredFichaId(item: CatalogItemRecord) {
  const active = item.fichasResultantes.find((ficha) => ficha.tp_status === "ativa");
  return active?.cd_ficha_tecnica ?? item.fichasResultantes[0]?.cd_ficha_tecnica ?? null;
}

function resolvePreferredPurchase(item: CatalogItemRecord) {
  return (
    item.compras.find((purchase) => purchase.sn_principal) ??
    [...item.compras].sort((left, right) => {
      const leftTime = left.ts_atualizacao_preco?.getTime() ?? left.ts_atualizacao.getTime();
      const rightTime = right.ts_atualizacao_preco?.getTime() ?? right.ts_atualizacao.getTime();
      return rightTime - leftTime;
    })[0] ??
    null
  );
}

function mapPurchases(item: CatalogItemRecord) {
  // D-05: secundarios derivam unidadeUso + quantidadeUso do principal na leitura.
  // D-02: fator = quantidadeCompra / quantidadeUso (sempre computado).
  // D-07: precoUso por fornecedor usa seus proprios quantidadeCompra/custoCompra com a quantidadeUso derivada.
  const primary = item.compras.find((c) => c.sn_principal);
  const primaryUsageUnit = primary?.unidadeUso?.ds_codigo ?? primary?.unidadeCompra.ds_codigo ?? "";
  const primaryUsageQuantity = primary?.vl_qtd_uso?.toFixed(4) ?? "1.0000";

  return item.compras.map((purchase) => {
    const isPrimary = purchase.sn_principal;
    const displayUsageUnit = isPrimary
      ? (purchase.unidadeUso?.ds_codigo ?? purchase.unidadeCompra.ds_codigo ?? "")
      : primaryUsageUnit;
    const displayUsageQuantity = isPrimary
      ? (purchase.vl_qtd_uso?.toFixed(4) ?? "1.0000")
      : primaryUsageQuantity;

    const qc = Number(purchase.vl_qtd_embalagem);
    const qu = Number(displayUsageQuantity);
    const fator = Number.isFinite(qc) && Number.isFinite(qu) && qu > 0 ? qc / qu : 1;
    const precoUso = fator > 0 ? Number(purchase.vl_custo_compra) / fator : Number(purchase.vl_custo_compra);

    return {
      id: purchase.cd_item_compra,
      supplierName: purchase.fornecedor.nm_fornecedor,
      purchaseUnit: purchase.unidadeCompra.ds_codigo,
      purchaseIsPrimary: isPrimary,
      purchaseQuantity: purchase.vl_qtd_embalagem.toFixed(4),
      purchaseCost: purchase.vl_custo_compra.toFixed(4),
      usageUnit: displayUsageUnit,
      usageQuantity: displayUsageQuantity,
      conversionFactor: fator.toFixed(4),
      usagePrice: precoUso.toFixed(4),
      usageIsFixedFromPrimary: !isPrimary,
      baseUnitCost: purchase.vl_custo_unitario_base.toFixed(6),
      priceUpdatedAt: purchase.ts_atualizacao_preco?.toISOString() ?? "",
      notes: purchase.ds_observacao ?? ""
    };
  });
}

function mapCosts(item: CatalogItemRecord) {
  const latestSnapshot = item.custosSnapshot[0];
  const latestExecution = asObject(item.execucoesCalculo[0]?.js_metadados ?? null);

  // For items that have never been through a cost recalculation (no snapshot,
  // no execution record), fall back to the purchase base unit cost so the ficha
  // form shows the correct value when the user selects this item as a component.
  const preferredPurchase = resolvePreferredPurchase(item);
  const purchaseBaseCost = preferredPurchase?.vl_custo_unitario_base?.toFixed(4) ?? null;

  const total =
    latestSnapshot?.vl_custo_total.toFixed(4) ??
    readString(latestExecution, "totalCost") ??
    purchaseBaseCost ??
    "0.0000";

  return {
    direct: readString(latestExecution, "directCost") ?? total,
    inherited: readString(latestExecution, "inheritedCost") ?? "0.0000",
    packaging: latestSnapshot?.vl_custo_embalagem?.toFixed(4) ?? "0.0000",
    total,
    perKg: readString(latestExecution, "costPerKg") ?? purchaseBaseCost ?? total,
    perPortion: readString(latestExecution, "costPerPortion"),
    finalOutput: readString(latestExecution, "finalUsefulOutputQuantity") ?? "1.0000"
  };
}

export function mapItemListRow(item: CatalogItemRecord) {
  const purchases = mapPurchases(item);
  const preferredPurchase = resolvePreferredPurchase(item);
  const selectedPurchase = preferredPurchase ? purchases.find((purchase) => purchase.id === preferredPurchase.cd_item_compra) : null;
  const costs = mapCosts(item);

  const supplierCount = new Set(
    item.compras.map((c) => c.fornecedor?.nm_fornecedor).filter(Boolean)
  ).size;

  // D-10: item sem principal exibe "--" em todas as colunas derivadas.
  const hasPurchase = selectedPurchase != null;

  return {
    id: item.cd_item,
    code: item.ds_codigo_interno ?? item.cd_item.slice(-6).toUpperCase(),
    name: item.nm_item,
    type: item.tp_item,
    category: item.nm_categoria_operacional ?? "sem categoria",
    stockUnit: item.unidadeEstoque?.ds_codigo ?? "-",
    purchaseQuantity: hasPurchase ? selectedPurchase!.purchaseQuantity : "--",
    usageUnit: hasPurchase ? selectedPurchase!.usageUnit : "--",
    conversionFactor: hasPurchase ? selectedPurchase!.conversionFactor : "--",
    supplierName: hasPurchase ? selectedPurchase!.supplierName : "--",
    supplierCount,
    baseUnitCost: hasPurchase ? selectedPurchase!.baseUnitCost : "--",
    usageQuantity: hasPurchase ? selectedPurchase!.usageQuantity : "--",
    usagePrice: hasPurchase ? selectedPurchase!.usagePrice : "--",
    description: item.ds_descricao ?? "",
    totalCost: costs.total,
    fichaStatus: resolveFichaStatus(item),
    fichaId: resolvePreferredFichaId(item),
    active: item.sn_ativo,
    updatedAt: item.custosSnapshot[0]?.ts_calculo.toISOString() ?? item.ts_atualizacao.toISOString()
  };
}

export function mapItemDetail(item: CatalogItemRecord) {
  const purchases = mapPurchases(item);
  const preferredPurchase = resolvePreferredPurchase(item);
  const selectedPurchase = preferredPurchase ? purchases.find((purchase) => purchase.id === preferredPurchase.cd_item_compra) : null;
  const costs = mapCosts(item);

  return {
    id: item.cd_item,
    code: item.ds_codigo_interno ?? item.cd_item.slice(-6).toUpperCase(),
    name: item.nm_item,
    description: item.ds_descricao ?? "",
    type: item.tp_item,
    operationalCategory: item.nm_categoria_operacional ?? "",
    active: item.sn_ativo,
    aliases: item.aliases.map((alias) => alias.nm_alias),
    stock: {
      unit: item.unidadeEstoque?.ds_codigo ?? ""
    },
    usage: {
      unit: item.unidadeUsoPadrao?.ds_codigo ?? "",
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
    lastCalculationAt: item.custosSnapshot[0]?.ts_calculo.toISOString() ?? item.ts_atualizacao.toISOString()
  };
}

export function mapItemOption(item: CatalogItemRecord) {
  const costs = mapCosts(item);
  const linkedFicha =
    item.fichasResultantes.find((ficha) => ficha.tp_status === "ativa") ?? item.fichasResultantes[0] ?? null;

  return {
    id: item.cd_item,
    name: item.nm_item,
    type: item.tp_item,
    code: item.ds_codigo_interno ?? "",
    operationalCategory: item.nm_categoria_operacional ?? "Sem grupo",
    usageUnit: item.unidadeUsoPadrao?.ds_codigo ?? "un",
    currentCost: costs.perKg,
    finalOutput: costs.finalOutput,
    linkedFichaId: linkedFicha?.cd_ficha_tecnica,
    linkedFichaName: linkedFicha?.nm_exibicao ?? item.nm_item
  };
}
