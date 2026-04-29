import { Prisma, UnidadeTipo } from "@/generated/prisma/client";

const UNIT_MAP: Record<string, { type: UnidadeTipo; factor: string }> = {
  kg: { type: UnidadeTipo.massa, factor: "1" },
  g: { type: UnidadeTipo.massa, factor: "0.001" },
  mg: { type: UnidadeTipo.massa, factor: "0.000001" },
  l: { type: UnidadeTipo.volume, factor: "1" },
  ml: { type: UnidadeTipo.volume, factor: "0.001" },
  un: { type: UnidadeTipo.contagem, factor: "1" },
  unidade: { type: UnidadeTipo.contagem, factor: "1" },
  "maco": { type: UnidadeTipo.contagem, factor: "1" },
  "maço": { type: UnidadeTipo.contagem, factor: "1" }
};

function decimal(value: Prisma.Decimal | string | number) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function normalizeUnitCode(value: string) {
  return value.trim().toLowerCase();
}

export function inferUnitTypeFromCode(value: string) {
  const code = normalizeUnitCode(value);
  return UNIT_MAP[code]?.type ?? UnidadeTipo.contagem;
}

export function getCanonicalFactor(value: string) {
  const code = normalizeUnitCode(value);
  return decimal(UNIT_MAP[code]?.factor ?? "1");
}

export function normalizeQuantityToCanonical(quantity: string, unitCode: string) {
  return decimal(quantity).mul(getCanonicalFactor(unitCode));
}

export function denormalizeQuantityFromCanonical(quantity: string, unitCode: string) {
  const factor = getCanonicalFactor(unitCode);

  if (factor.equals(0)) {
    return decimal(quantity);
  }

  return decimal(quantity).div(factor);
}

export function calculateCanonicalUnitCost(
  purchaseCost: string,
  purchaseQuantity: string,
  purchaseUnitCode: string
) {
  const canonicalQuantity = normalizeQuantityToCanonical(purchaseQuantity, purchaseUnitCode);

  if (canonicalQuantity.lte(0)) {
    return decimal(0);
  }

  return decimal(purchaseCost).div(canonicalQuantity);
}
