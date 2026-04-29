import "server-only";
import type { ItemType, UnidadeTipo, Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import {
  createDemoId,
  type DemoStageTypeRegistryEntry,
  type DemoUnit,
  getDemoStore,
  persistDemoStore,
  resetDemoStore,
  toNormalizedName
} from "@/modules/platform/server/demo-data";
import { getServerEnv } from "@/modules/platform/server/env";

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  insumo: "Insumo",
  pre_preparo: "Pre-preparo",
  intermediario: "Intermediario",
  produto_pronto: "Produto pronto",
  prato: "Prato",
  porcao: "Porcao",
  marmita: "Marmita",
  combo: "Combo",
  embalagem: "Embalagem",
  apoio: "Apoio"
};

const UNIT_TYPE_LABELS: Record<UnidadeTipo, string> = {
  massa: "massa",
  volume: "volume",
  contagem: "contagem"
};

const DEFAULT_SUPPLIERS = [
  "VMarket",
  "Cozinha interna",
  "Embalagens Sul",
  "Montagem interna",
  "Distribuidora ABC",
  "Fornecedor Centro"
] as const;

const DEFAULT_UNITS: Array<{ code: string; name: string; measureType: UnidadeTipo }> = [
  { code: "kg", name: "Quilograma", measureType: "massa" },
  { code: "g", name: "Grama", measureType: "massa" },
  { code: "l", name: "Litro", measureType: "volume" },
  { code: "ml", name: "Mililitro", measureType: "volume" },
  { code: "un", name: "Unidade", measureType: "contagem" },
  { code: "maco", name: "Maco", measureType: "contagem" }
];

const DEFAULT_OPERATIONAL_CATEGORIES = [
  "Graos",
  "Proteinas",
  "Hortifruti",
  "Cozinha quente",
  "Guarnicoes",
  "Laticinios",
  "Mercearia",
  "Embalagens",
  "Descartaveis",
  "Montagem",
  "Operacional"
] as const;

const DEFAULT_MODALITIES = [
  { code: "producao", name: "Producao" },
  { code: "delivery", name: "Delivery" },
  { code: "salao", name: "Salao" },
  { code: "combo", name: "Combo" }
] as const;

const DEFAULT_STAGE_TYPES = [
  { code: "limpeza_pre_preparo", name: "Limpeza / Pre-Preparo" },
  { code: "coccao_preparo", name: "Coccao / Preparo" },
  { code: "montagem", name: "Montagem" }
] as const;

function toDemoMeasureType(value: UnidadeTipo): DemoUnit["measureType"] {
  return UNIT_TYPE_LABELS[value] as DemoUnit["measureType"];
}

function resolvePrisma() {
  return getPrismaClient(getServerEnv().DATABASE_URL);
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

async function ensureItemTypeRegistry(tx: Prisma.TransactionClient) {
  for (const [code, name] of Object.entries(ITEM_TYPE_LABELS)) {
    await tx.tipoItemCadastro.upsert({
      where: { codigo: code as ItemType },
      update: {
        nome: name
      },
      create: {
        codigo: code as ItemType,
        nome: name
      }
    });
  }
}

async function ensureMasterDataRegistry(tx: Prisma.TransactionClient) {
  await ensureItemTypeRegistry(tx);

  const [supplierCount, unitCount, categoryCount, modalityCount] = await Promise.all([
    tx.fornecedor.count(),
    tx.unidadeMedida.count(),
    tx.categoriaOperacional.count(),
    tx.modalidade.count()
  ]);

  if (supplierCount === 0) {
    await tx.fornecedor.createMany({
      data: DEFAULT_SUPPLIERS.map((name) => ({
        nome: name,
        ativo: true
      })),
      skipDuplicates: true
    });
  }

  if (unitCount === 0) {
    await tx.unidadeMedida.createMany({
      data: DEFAULT_UNITS.map((unit) => ({
        codigo: unit.code,
        nome: unit.name,
        tipo: unit.measureType,
        ativo: true
      })),
      skipDuplicates: true
    });
  }

  if (categoryCount === 0) {
    await tx.categoriaOperacional.createMany({
      data: DEFAULT_OPERATIONAL_CATEGORIES.map((name) => ({
        codigo: toNormalizedName(name),
        nome: name,
        ativo: true
      })),
      skipDuplicates: true
    });
  }

  if (modalityCount === 0) {
    await tx.modalidade.createMany({
      data: DEFAULT_MODALITIES.map((modality) => ({
        codigo: modality.code,
        nome: modality.name,
        ativo: true
      })),
      skipDuplicates: true
    });
  }

  await tx.$executeRawUnsafe(`
    create table if not exists "tipo_etapa" (
      "id" text primary key,
      "codigo" text not null unique,
      "nome" text not null,
      "ativo" boolean not null default true,
      "criado_em" timestamptz not null default now(),
      "atualizado_em" timestamptz not null default now()
    )
  `);

  for (const stageType of DEFAULT_STAGE_TYPES) {
    await tx.$executeRawUnsafe(
      `
      insert into "tipo_etapa" ("id", "codigo", "nome", "ativo", "criado_em", "atualizado_em")
      values ($1, $2, $3, true, now(), now())
      on conflict ("codigo") do update set "nome" = excluded."nome", "atualizado_em" = now()
      `,
      `stage-type-${stageType.code}`,
      stageType.code,
      stageType.name
    );
  }
}

async function listItemTypesWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.tipoItemCadastro.findMany({
      orderBy: { nome: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.codigo,
      name: row.nome,
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

async function listOperationalCategoriesWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.categoriaOperacional.findMany({
      orderBy: { nome: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.codigo,
      name: row.nome,
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

async function listSuppliersWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.fornecedor.findMany({
      orderBy: { nome: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.nome,
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

async function listUnitsWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.unidadeMedida.findMany({
      orderBy: { codigo: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.codigo,
      name: row.nome,
      measureType: UNIT_TYPE_LABELS[row.tipo],
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

async function listModalitiesWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.modalidade.findMany({
      orderBy: { nome: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.codigo,
      name: row.nome,
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

async function listStageTypesWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.$queryRaw<Array<{ id: string; codigo: string; nome: string; ativo: boolean }>>`
      select id, codigo, nome, ativo from "tipo_etapa" order by nome asc
    `;

    return rows.map((row) => ({
      id: row.id,
      code: row.codigo as DemoStageTypeRegistryEntry["code"],
      name: row.nome,
      active: row.ativo
    }));
  } catch {
    return null;
  }
}

function listItemTypesFromDemo() {
  return sortByName(
    getDemoStore().itemTypes.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      active: row.active
    }))
  );
}

function listOperationalCategoriesFromDemo() {
  return sortByName(
    getDemoStore().operationalCategories.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      active: row.active
    }))
  );
}

function listSuppliersFromDemo() {
  return sortByName(
    getDemoStore().suppliers.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active
    }))
  );
}

function listUnitsFromDemo() {
  return getDemoStore().units
    .map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      measureType: row.measureType,
      active: row.active
    }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function listModalitiesFromDemo() {
  return sortByName(
    getDemoStore().modalities.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.label,
      active: row.active
    }))
  );
}

function listStageTypesFromDemo() {
  return sortByName(
    getDemoStore().stageTypes.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      active: row.active
    }))
  );
}

export function getMasterDataRepository() {
  return {
    async listItemTypes() {
      return (await listItemTypesWithPrisma()) ?? listItemTypesFromDemo();
    },

    async listOperationalCategories() {
      return (await listOperationalCategoriesWithPrisma()) ?? listOperationalCategoriesFromDemo();
    },

    async listSuppliers() {
      return (await listSuppliersWithPrisma()) ?? listSuppliersFromDemo();
    },

    async listUnits() {
      return (await listUnitsWithPrisma()) ?? listUnitsFromDemo();
    },

    async listModalities() {
      return (await listModalitiesWithPrisma()) ?? listModalitiesFromDemo();
    },

    async listStageTypes() {
      return (await listStageTypesWithPrisma()) ?? listStageTypesFromDemo();
    },

    async getItemFormOptions() {
      const [typeRows, categoryRows, unitRows, supplierRows] = await Promise.all([
        this.listItemTypes(),
        this.listOperationalCategories(),
        this.listUnits(),
        this.listSuppliers()
      ]);

      return {
        typeOptions: typeRows
          .filter((row) => row.active)
          .map((row) => ({ value: row.code, label: row.name })),
        operationalCategoryOptions: categoryRows.filter((row) => row.active).map((row) => row.name),
        unitOptions: unitRows.filter((row) => row.active).map((row) => row.code),
        supplierOptions: supplierRows.filter((row) => row.active).map((row) => row.name)
      };
    },

    async saveOperationalCategory(input: { id?: string; name: string; active?: boolean }) {
      const prisma = resolvePrisma();
      const name = input.name.trim();
      const code = toNormalizedName(name);

      if (prisma) {
        try {
          const record = input.id
            ? await prisma.categoriaOperacional.update({
                where: { id: input.id },
                data: { nome: name, codigo: code, ativo: input.active ?? true }
              })
            : await prisma.categoriaOperacional.create({
                data: { nome: name, codigo: code, ativo: input.active ?? true }
              });

          return {
            id: record.id,
            code: record.codigo,
            name: record.nome,
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.operationalCategories.find((row) => row.id === input.id)
        : store.operationalCategories.find((row) => row.code === code);

      if (existing) {
        existing.name = name;
        existing.code = code;
        existing.active = input.active ?? existing.active;
        persistDemoStore(store);
        return { id: existing.id, code: existing.code, name: existing.name, active: existing.active };
      }

      const created = {
        id: createDemoId("cat-op"),
        code,
        name,
        active: input.active ?? true
      };
      store.operationalCategories.push(created);
      persistDemoStore(store);
      return created;
    },

    async deleteSupplier(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          const linked = await prisma.itemCompra.count({
            where: { fornecedorId: id }
          });

          if (linked > 0) {
            return {
              success: false as const,
              reason: "Nao foi possivel excluir: existe vinculo com compras de itens."
            };
          }

          await prisma.fornecedor.delete({ where: { id } });
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const supplier = store.suppliers.find((row) => row.id === id);
      if (!supplier) {
        return { success: false as const, reason: "Fornecedor nao encontrado." };
      }

      const linked = store.items.some((item) => item.supplier === supplier.name);
      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com itens."
        };
      }

      store.suppliers = store.suppliers.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    },

    async deleteOperationalCategory(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          const category = await prisma.categoriaOperacional.findUnique({ where: { id } });
          if (!category) {
            return { success: false as const, reason: "Categoria nao encontrada." };
          }

          const linked = await prisma.item.count({
            where: { categoriaOperacional: category.nome }
          });

          if (linked > 0) {
            return {
              success: false as const,
              reason: "Nao foi possivel excluir: existe vinculo com itens."
            };
          }

          await prisma.categoriaOperacional.delete({ where: { id } });
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const category = store.operationalCategories.find((row) => row.id === id);
      if (!category) {
        return { success: false as const, reason: "Categoria nao encontrada." };
      }

      const linked = store.items.some((item) => item.operationalCategory === category.name);
      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com itens."
        };
      }

      store.operationalCategories = store.operationalCategories.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    },

    async saveItemType(input: { id?: string; code: ItemType; name: string; active: boolean }) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          await prisma.$transaction(async (tx) => {
            await ensureMasterDataRegistry(tx);
          });

          const record = input.id
            ? await prisma.tipoItemCadastro.update({
                where: { id: input.id },
                data: {
                  codigo: input.code,
                  nome: input.name.trim(),
                  ativo: input.active
                }
              })
            : await prisma.tipoItemCadastro.create({
                data: {
                  codigo: input.code,
                  nome: input.name.trim(),
                  ativo: input.active
                }
              });

          return {
            id: record.id,
            code: record.codigo,
            name: record.nome,
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.itemTypes.find((row) => row.id === input.id)
        : store.itemTypes.find((row) => row.code === input.code);

      if (existing) {
        existing.code = input.code;
        existing.name = input.name.trim();
        existing.active = input.active;
        persistDemoStore(store);
        return {
          id: existing.id,
          code: existing.code,
          name: existing.name,
          active: existing.active
        };
      }

      const created = {
        id: createDemoId("tipo-item"),
        code: input.code,
        name: input.name.trim(),
        active: input.active
      };
      store.itemTypes.push(created);
      persistDemoStore(store);
      return created;
    },

    async saveStageType(input: {
      id?: string;
      code: DemoStageTypeRegistryEntry["code"];
      name: string;
      active: boolean;
    }) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          await prisma.$transaction(async (tx) => {
            await ensureMasterDataRegistry(tx);
          });

          const [record] = await prisma.$queryRaw<
            Array<{ id: string; codigo: string; nome: string; ativo: boolean }>
          >`
            insert into "tipo_etapa" ("id", "codigo", "nome", "ativo", "criado_em", "atualizado_em")
            values (
              ${input.id ?? createDemoId("tipo-etapa")},
              ${input.code},
              ${input.name.trim()},
              ${input.active},
              now(),
              now()
            )
            on conflict ("id")
            do update set
              "codigo" = excluded."codigo",
              "nome" = excluded."nome",
              "ativo" = excluded."ativo",
              "atualizado_em" = now()
            returning id, codigo, nome, ativo
          `;

          return {
            id: record.id,
            code: record.codigo as DemoStageTypeRegistryEntry["code"],
            name: record.nome,
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.stageTypes.find((row) => row.id === input.id)
        : store.stageTypes.find((row) => row.code === input.code);

      if (existing) {
        existing.code = input.code;
        existing.name = input.name.trim();
        existing.active = input.active;
        persistDemoStore(store);
        return existing;
      }

      const created = {
        id: createDemoId("tipo-etapa"),
        code: input.code,
        name: input.name.trim(),
        active: input.active
      };
      store.stageTypes.push(created);
      persistDemoStore(store);
      return created;
    },

    async saveSupplier(input: { id?: string; name: string; active?: boolean }) {
      const prisma = resolvePrisma();
      const name = input.name.trim();

      if (prisma) {
        try {
          const record = input.id
            ? await prisma.fornecedor.update({
                where: { id: input.id },
                data: {
                  nome: name,
                  ativo: input.active ?? true
                }
              })
            : await prisma.fornecedor.create({
                data: {
                  nome: name,
                  ativo: input.active ?? true
                }
              });

          return {
            id: record.id,
            name: record.nome,
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.suppliers.find((row) => row.id === input.id)
        : store.suppliers.find((row) => row.name === name);

      if (existing) {
        existing.name = name;
        existing.active = input.active ?? existing.active;
        persistDemoStore(store);
        return { id: existing.id, name: existing.name, active: existing.active };
      }

      const created = {
        id: createDemoId("supplier"),
        name,
        active: input.active ?? true
      };
      store.suppliers.push(created);
      persistDemoStore(store);
      return created;
    },

    async saveUnit(input: { id?: string; code: string; name: string; measureType: UnidadeTipo; active: boolean }) {
      const prisma = resolvePrisma();
      const code = input.code.trim().toLowerCase();

      if (prisma) {
        try {
          const record = input.id
            ? await prisma.unidadeMedida.update({
                where: { id: input.id },
                data: {
                  codigo: code,
                  nome: input.name.trim(),
                  tipo: input.measureType,
                  ativo: input.active
                }
              })
            : await prisma.unidadeMedida.create({
                data: {
                  codigo: code,
                  nome: input.name.trim(),
                  tipo: input.measureType,
                  ativo: input.active
                }
              });

          return {
            id: record.id,
            code: record.codigo,
            name: record.nome,
            measureType: UNIT_TYPE_LABELS[record.tipo],
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.units.find((row) => row.id === input.id)
        : store.units.find((row) => row.code === code);

      if (existing) {
        existing.code = code;
        existing.name = input.name.trim();
        existing.measureType = toDemoMeasureType(input.measureType);
        existing.active = input.active;
        persistDemoStore(store);
        return existing;
      }

      const created = {
        id: createDemoId("unit"),
        code,
        name: input.name.trim(),
        measureType: toDemoMeasureType(input.measureType),
        active: input.active
      };
      store.units.push(created);
      persistDemoStore(store);
      return created;
    },

    async deleteUnit(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          const linkedCounts = await prisma.$transaction(async (tx) => {
            const unit = await tx.unidadeMedida.findUnique({ where: { id } });
            if (!unit) {
              return null;
            }

            const [itemUsage, itemStock, purchases, components] = await Promise.all([
              tx.item.count({ where: { unidadeUsoPadraoId: id } }),
              tx.item.count({ where: { unidadeEstoqueId: id } }),
              tx.itemCompra.count({ where: { unidadeCompraId: id } }),
              tx.fichaComponente.count({ where: { unidadeUsoId: id } })
            ]);

            return { itemUsage, itemStock, purchases, components };
          });

          if (!linkedCounts) {
            return { success: false as const, reason: "Unidade nao encontrada." };
          }

          if (linkedCounts.itemUsage + linkedCounts.itemStock + linkedCounts.purchases + linkedCounts.components > 0) {
            return {
              success: false as const,
              reason: "Nao foi possivel excluir: existe vinculo com itens ou fichas."
            };
          }

          await prisma.unidadeMedida.delete({ where: { id } });
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const unit = store.units.find((row) => row.id === id);
      if (!unit) {
        return { success: false as const, reason: "Unidade nao encontrada." };
      }

      const linked = store.items.some(
        (item) => item.stockUnit === unit.code || item.usageUnit === unit.code || item.purchaseUnit === unit.code
      );

      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com itens."
        };
      }

      store.units = store.units.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    },

    async saveModality(input: { id?: string; code: string; name: string; active: boolean }) {
      const prisma = resolvePrisma();
      const code = input.code.trim().toLowerCase();

      if (prisma) {
        try {
          const record = input.id
            ? await prisma.modalidade.update({
                where: { id: input.id },
                data: {
                  codigo: code,
                  nome: input.name.trim(),
                  ativo: input.active
                }
              })
            : await prisma.modalidade.create({
                data: {
                  codigo: code,
                  nome: input.name.trim(),
                  ativo: input.active
                }
              });

          return {
            id: record.id,
            code: record.codigo,
            name: record.nome,
            active: record.ativo
          };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const existing = input.id
        ? store.modalities.find((row) => row.id === input.id)
        : store.modalities.find((row) => row.code === code);

      if (existing) {
        existing.code = code;
        existing.label = input.name.trim();
        existing.active = input.active;
        persistDemoStore(store);
        return {
          id: existing.id,
          code: existing.code,
          name: existing.label,
          active: existing.active
        };
      }

      const created = {
        id: createDemoId("modality"),
        code,
        label: input.name.trim(),
        active: input.active
      };
      store.modalities.push(created);
      persistDemoStore(store);
      return {
        id: created.id,
        code: created.code,
        name: created.label,
        active: created.active
      };
    },

    async deleteModality(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          const linked = await prisma.fichaTecnica.count({
            where: { modalidadeId: id }
          });

          if (linked > 0) {
            return {
              success: false as const,
              reason: "Nao foi possivel excluir: existe vinculo com fichas."
            };
          }

          await prisma.modalidade.delete({ where: { id } });
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const linked = store.fichas.some((ficha) => ficha.modalityId === id);
      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com fichas."
        };
      }

      store.modalities = store.modalities.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    },

    async deleteItemType(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          const itemType = await prisma.tipoItemCadastro.findUnique({ where: { id } });
          if (!itemType) {
            return { success: false as const, reason: "Tipo nao encontrado." };
          }

          const linked = await prisma.item.count({
            where: { tipoPrincipal: itemType.codigo }
          });

          if (linked > 0) {
            return {
              success: false as const,
              reason: "Nao foi possivel excluir: existe vinculo com itens."
            };
          }

          await prisma.tipoItemCadastro.delete({ where: { id } });
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const itemType = store.itemTypes.find((row) => row.id === id);
      if (!itemType) {
        return { success: false as const, reason: "Tipo nao encontrado." };
      }

      const linked = store.items.some((item) => item.type === itemType.code);
      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com itens."
        };
      }

      store.itemTypes = store.itemTypes.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    },

    async deleteStageType(id: string) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          await prisma.$executeRawUnsafe(`delete from "tipo_etapa" where "id" = $1`, id);
          return { success: true as const };
        } catch {
          // fall back to demo storage
        }
      }

      const store = getDemoStore();
      const stageType = store.stageTypes.find((row) => row.id === id);
      if (!stageType) {
        return { success: false as const, reason: "Tipo de etapa nao encontrado." };
      }

      const linked = store.fichas.some((ficha) =>
        ficha.stages.some((stage) => stage.stageTypeId === id || stage.stageTypeCode === stageType.code)
      );

      if (linked) {
        return {
          success: false as const,
          reason: "Nao foi possivel excluir: existe vinculo com fichas."
        };
      }

      store.stageTypes = store.stageTypes.filter((row) => row.id !== id);
      persistDemoStore(store);
      return { success: true as const };
    }
  };
}

export function resetMasterDataRepositoryForTests() {
  resetDemoStore();
}
