import { ItemType, TipoComponente } from "@/generated/prisma/client";

const ITEM_TYPE_MAP: Record<string, ItemType> = {
  insumo: ItemType.insumo,
  pre_preparo: ItemType.pre_preparo,
  intermediario: ItemType.intermediario,
  produto_pronto: ItemType.produto_pronto,
  prato: ItemType.prato,
  porcao: ItemType.porcao,
  marmita: ItemType.marmita,
  combo: ItemType.combo,
  embalagem: ItemType.embalagem,
  apoio: ItemType.apoio
};

const COMPONENT_TYPE_MAP: Record<string, TipoComponente> = {
  ingredient: TipoComponente.ingrediente,
  packaging: TipoComponente.embalagem,
  support: TipoComponente.apoio
};

export function mapImportedItemType(value: string | null | undefined): ItemType {
  return ITEM_TYPE_MAP[value ?? "intermediario"] ?? ItemType.intermediario;
}

export function mapImportedComponentType(value: string): TipoComponente {
  return COMPONENT_TYPE_MAP[value] ?? TipoComponente.ingrediente;
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
