"use server";

import { requireSession } from "@/modules/access/server/session-cookie";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { resolveSalesImportMatches, type CatalogEntry, type SalesImportMatch } from "@/modules/sales/domain/sales-import";
import type { item_type } from "@/generated/prisma/client";

const SELLABLE_TYPES: item_type[] = ["prato", "porcao", "marmita", "combo", "produto_pronto"];

export async function listSalesImportCatalogAction(): Promise<CatalogEntry[]> {
  const session = await requireSession();
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return [];

  const items = await prisma.item.findMany({
    where: { cd_restaurante: session.restaurantId, sn_ativo: true, tp_item: { in: SELLABLE_TYPES } },
    select: { cd_item: true, nm_item: true }
  });

  return items.map((item) => ({ id: item.cd_item, name: item.nm_item }));
}

export interface SalesImportRowInput {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesImportPreviewResult {
  matches: Array<{ description: string; match: SalesImportMatch | null }>;
  resolvedCount: number;
  unresolvedCount: number;
}

export async function previewSalesImportAction(rows: SalesImportRowInput[]): Promise<SalesImportPreviewResult> {
  const catalog = await listSalesImportCatalogAction();
  const descriptions = rows.map((row) => row.description);
  const resolved = resolveSalesImportMatches(descriptions, catalog);

  const matches = [...resolved.entries()].map(([description, match]) => ({ description, match }));
  const resolvedCount = matches.filter((entry) => entry.match !== null).length;

  return {
    matches,
    resolvedCount,
    unresolvedCount: matches.length - resolvedCount
  };
}

export interface CommitSalesImportInput {
  rows: SalesImportRowInput[];
  date: string;
  origin: string;
}

export interface CommitSalesImportResult {
  inserted: number;
  skipped: Array<{ description: string; quantity: number; total: number }>;
}

export async function commitSalesImportAction(input: CommitSalesImportInput): Promise<CommitSalesImportResult> {
  const session = await requireSession();
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return { inserted: 0, skipped: [] };

  const catalog = await listSalesImportCatalogAction();
  const descriptions = input.rows.map((row) => row.description);
  const resolved = resolveSalesImportMatches(descriptions, catalog);

  const toInsert: Array<{
    cd_restaurante: string;
    cd_item: string;
    dt_venda: Date;
    nr_quantidade: number;
    vl_preco_unitario: number;
    vl_total: number;
    ds_origem: string;
  }> = [];

  const skippedByDescription = new Map<string, { description: string; quantity: number; total: number }>();

  for (const row of input.rows) {
    const match = resolved.get(row.description);
    if (!match) {
      const acc = skippedByDescription.get(row.description) ?? { description: row.description, quantity: 0, total: 0 };
      acc.quantity += row.quantity;
      acc.total += row.total;
      skippedByDescription.set(row.description, acc);
      continue;
    }

    toInsert.push({
      cd_restaurante: session.restaurantId,
      cd_item: match.itemId,
      dt_venda: new Date(input.date),
      nr_quantidade: row.quantity,
      vl_preco_unitario: row.unitPrice,
      vl_total: row.total,
      ds_origem: input.origin || "importado_planilha"
    });
  }

  if (toInsert.length > 0) {
    await prisma.venda.createMany({ data: toInsert });
  }

  return { inserted: toInsert.length, skipped: [...skippedByDescription.values()] };
}
