import { item_type, tipo_componente } from "@/generated/prisma/client";

const ITEM_TYPE_MAP: Record<string, item_type> = {
  insumo: item_type.insumo,
  pre_preparo: item_type.pre_preparo,
  intermediario: item_type.intermediario,
  produto_pronto: item_type.produto_pronto,
  prato: item_type.prato,
  porcao: item_type.porcao,
  marmita: item_type.marmita,
  combo: item_type.combo,
  embalagem: item_type.embalagem,
  apoio: item_type.apoio
};

const COMPONENT_TYPE_MAP: Record<string, tipo_componente> = {
  ingredient: tipo_componente.ingrediente,
  packaging: tipo_componente.embalagem,
  support: tipo_componente.apoio
};

export function mapImportedItemType(value: string | null | undefined): item_type {
  return ITEM_TYPE_MAP[value ?? "intermediario"] ?? item_type.intermediario;
}

export function mapImportedComponentType(value: string): tipo_componente {
  return COMPONENT_TYPE_MAP[value] ?? tipo_componente.ingrediente;
}

export function buildExternalKey(
  entity: string,
  sheetName: string | null | undefined,
  rowNumber: number | null | undefined,
  naturalKey: string
) {
  return `${entity}:${sheetName ?? "unknown"}:${rowNumber ?? 0}:${naturalKey}`;
}

export function numericString(value: unknown, fallback: string | null = null): string | null {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber)) {
    return fallback;
  }

  return asNumber.toFixed(4);
}
