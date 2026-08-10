import "server-only";
import type { item_type, unidade_tipo, Prisma } from "@/generated/prisma/client";
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

const ITEM_TYPE_LABELS: Record<item_type, string> = {
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

const UNIT_TYPE_LABELS: Record<unidade_tipo, string> = {
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

const DEFAULT_UNITS: Array<{ code: string; name: string; measureType: unidade_tipo }> = [
  { code: "kg",  name: "Quilograma", measureType: "massa"    },
  { code: "g",   name: "Grama",      measureType: "massa"    },
  { code: "l",   name: "Litro",      measureType: "volume"   },
  { code: "ml",  name: "Mililitro",  measureType: "volume"   },
  { code: "un",  name: "Unidade",    measureType: "contagem" },
  { code: "frd", name: "Fardo",      measureType: "contagem" },
  { code: "cx",  name: "Caixa",      measureType: "contagem" },
  { code: "pct", name: "Pacote",     measureType: "contagem" },
  { code: "mç",  name: "Maço",       measureType: "contagem" },
  { code: "bdj", name: "Bandeja",    measureType: "contagem" },
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

function toDemoMeasureType(value: unidade_tipo): DemoUnit["measureType"] {
  return UNIT_TYPE_LABELS[value] as DemoUnit["measureType"];
}

function resolvePrisma() {
  return getPrismaClient(getServerEnv().DATABASE_URL);
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}

// Semeia os tipos canonicos SOMENTE na primeira execucao (tabela vazia).
// Antes disso o loop rodava incondicionalmente a cada listagem (upsert, ou
// mesmo "create se nao existir por codigo") — qualquer tipo que o usuario
// excluisse de propósito era recriado no proximo carregamento da tela, entao
// o botao "Excluir" em Tipos de Item nunca tinha efeito visivel. Uma vez que
// a tabela tenha pelo menos uma linha, ela é considerada "ja inicializada" e
// o registro passa a refletir fielmente as exclusoes do usuario.
async function ensureItemTypeRegistry(tx: Prisma.TransactionClient) {
  const count = await tx.tipoItemCadastro.count();
  if (count > 0) return;

  for (const [code, name] of Object.entries(ITEM_TYPE_LABELS)) {
    await tx.tipoItemCadastro.create({
      data: { tp_codigo: code as item_type, nm_tipo_item: name }
    });
  }
}

async function ensureMasterDataRegistry(tx: Prisma.TransactionClient) {
  await ensureItemTypeRegistry(tx);

  const [supplierCount, unitCount, categoryCount, modalityCount, stageTypeCount] = await Promise.all([
    tx.fornecedor.count(),
    tx.unidadeMedida.count(),
    tx.categoriaOperacional.count(),
    tx.modalidade.count(),
    tx.tipoEtapa.count()
  ]);

  if (supplierCount === 0) {
    await tx.fornecedor.createMany({
      data: DEFAULT_SUPPLIERS.map((name) => ({
        nm_fornecedor: name,
        sn_ativo: true
      })),
      skipDuplicates: true
    });
  }

  // Mesmo criterio: unidades canonicas so sao semeadas se a tabela estiver
  // vazia, para nao reviver unidades que o usuario excluiu de proposito.
  if (unitCount === 0) {
    await tx.unidadeMedida.createMany({
      data: DEFAULT_UNITS.map((unit) => ({
        ds_codigo: unit.code,
        nm_unidade: unit.name,
        tp_unidade: unit.measureType,
        sn_ativo: true
      })),
      skipDuplicates: true
    });
  }

  if (categoryCount === 0) {
    await tx.categoriaOperacional.createMany({
      data: DEFAULT_OPERATIONAL_CATEGORIES.map((name) => ({
        ds_codigo: toNormalizedName(name),
        nm_categoria: name,
        sn_ativo: true
      })),
      skipDuplicates: true
    });
  }

  if (modalityCount === 0) {
    await tx.modalidade.createMany({
      data: DEFAULT_MODALITIES.map((modality) => ({
        ds_codigo: modality.code,
        nm_modalidade: modality.name,
        sn_ativo: true
      })),
      skipDuplicates: true
    });
  }

  // Idem: tipos de etapa so sao semeados se a tabela estiver vazia.
  if (stageTypeCount === 0) {
    await tx.tipoEtapa.createMany({
      data: DEFAULT_STAGE_TYPES.map((stageType) => ({
        ds_codigo: stageType.code,
        nm_tipo_etapa: stageType.name,
        sn_ativo: true
      })),
      skipDuplicates: true
    });
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
      orderBy: { nm_tipo_item: "asc" }
    });

    return rows.map((row) => ({
      id: row.cd_tipo_item,
      code: row.tp_codigo,
      name: row.nm_tipo_item,
      active: row.sn_ativo
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
      orderBy: { nm_categoria: "asc" }
    });

    return rows.map((row) => ({
      id: row.cd_categoria,
      code: row.ds_codigo,
      name: row.nm_categoria,
      active: row.sn_ativo
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
      orderBy: { nm_fornecedor: "asc" }
    });

    return rows.map((row) => ({
      id: row.cd_fornecedor,
      name: row.nm_fornecedor,
      active: row.sn_ativo
    }));
  } catch {
    return null;
  }
}

// Padrão de sufixos internos gerados por testes ou importações malformadas.
// Unidades cujos códigos batem com esse padrão são excluídas do dropdown de UI.
const INTERNAL_UNIT_CODE_PATTERN = /-(int|forn|eng|presenter)(-|$)/;

function isInternalUnitCode(code: string) {
  return INTERNAL_UNIT_CODE_PATTERN.test(code);
}

async function listUnitsWithPrisma() {
  const prisma = resolvePrisma();
  if (!prisma) {
    return null;
  }

  try {
    // Remove legacy "maço" duplicate; canonical code is "mç".
    // If FK constraint prevents hard delete, deactivate instead.
    const mçCount = await prisma.unidadeMedida.count({ where: { ds_codigo: "mç" } });
    if (mçCount > 0) {
      await prisma.unidadeMedida.deleteMany({ where: { ds_codigo: "maço" } }).catch(async () => {
        await prisma.unidadeMedida.updateMany({ where: { ds_codigo: "maço" }, data: { sn_ativo: false } }).catch(() => {});
      });
    }

    await prisma.$transaction(async (tx) => {
      await ensureMasterDataRegistry(tx);
    });

    const rows = await prisma.unidadeMedida.findMany({
      where: { sn_ativo: true },
      orderBy: { ds_codigo: "asc" }
    });

    return rows
      .filter((row) => !isInternalUnitCode(row.ds_codigo))
      .map((row) => ({
        id: row.cd_unidade_medida,
        code: row.ds_codigo,
        name: row.nm_unidade,
        measureType: UNIT_TYPE_LABELS[row.tp_unidade],
        active: row.sn_ativo
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
      orderBy: { nm_modalidade: "asc" }
    });

    return rows.map((row) => ({
      id: row.cd_modalidade,
      code: row.ds_codigo,
      name: row.nm_modalidade,
      active: row.sn_ativo
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

    const rows = await prisma.tipoEtapa.findMany({
      orderBy: { nm_tipo_etapa: "asc" }
    });

    return rows.map((row) => ({
      id: row.cd_tipo_etapa,
      code: row.ds_codigo as DemoStageTypeRegistryEntry["code"],
      name: row.nm_tipo_etapa,
      active: row.sn_ativo
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
      const rows = (await listStageTypesWithPrisma()) ?? listStageTypesFromDemo();
      const ORDER: Record<string, number> = { limpeza_pre_preparo: 0, coccao_preparo: 1 };
      return rows.slice().sort((a, b) => {
        const oa = ORDER[a.code] ?? 99;
        const ob = ORDER[b.code] ?? 99;
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
      });
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
                where: { cd_categoria: input.id },
                data: { nm_categoria: name, ds_codigo: code, sn_ativo: input.active ?? true }
              })
            : await prisma.categoriaOperacional.create({
                data: { nm_categoria: name, ds_codigo: code, sn_ativo: input.active ?? true }
              });

          return {
            id: record.cd_categoria,
            code: record.ds_codigo,
            name: record.nm_categoria,
            active: record.sn_ativo
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
        let prismaReachable = false;
        try {
          const result = await prisma.$transaction(async (tx) => {
            prismaReachable = true;
            const linked = await tx.itemCompra.count({ where: { cd_fornecedor: id } });
            if (linked > 0) return { blocked: true };
            await tx.fornecedor.delete({ where: { cd_fornecedor: id } });
            return { blocked: false };
          });

          if (result.blocked) {
            return { success: false as const, reason: "Nao foi possivel excluir: existe vinculo com compras de itens." };
          }
          return { success: true as const };
        } catch {
          if (prismaReachable) {
            return { success: false as const, reason: "Erro ao excluir fornecedor. Tente novamente." };
          }
          // Banco inacessível — fall to demo storage
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
        let prismaReachable = false;
        try {
          const result = await prisma.$transaction(async (tx) => {
            prismaReachable = true;
            const category = await tx.categoriaOperacional.findUnique({ where: { cd_categoria: id } });
            if (!category) return { notFound: true, blocked: false };
            const linked = await tx.item.count({ where: { nm_categoria_operacional: category.nm_categoria } });
            if (linked > 0) return { notFound: false, blocked: true };
            await tx.categoriaOperacional.delete({ where: { cd_categoria: id } });
            return { notFound: false, blocked: false };
          });

          if (result.notFound) return { success: false as const, reason: "Categoria nao encontrada." };
          if (result.blocked) return { success: false as const, reason: "Nao foi possivel excluir: existe vinculo com itens." };
          return { success: true as const };
        } catch {
          if (prismaReachable) {
            return { success: false as const, reason: "Erro ao excluir categoria. Tente novamente." };
          }
          // Banco inacessível — fall to demo storage
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

    async saveItemType(input: { id?: string; code: item_type; name: string; active: boolean }) {
      const prisma = resolvePrisma();

      if (prisma) {
        try {
          await prisma.$transaction(async (tx) => {
            await ensureMasterDataRegistry(tx);
          });

          const record = input.id
            ? await prisma.tipoItemCadastro.update({
                where: { cd_tipo_item: input.id },
                data: {
                  tp_codigo: input.code,
                  nm_tipo_item: input.name.trim(),
                  sn_ativo: input.active
                }
              })
            : await prisma.tipoItemCadastro.create({
                data: {
                  tp_codigo: input.code,
                  nm_tipo_item: input.name.trim(),
                  sn_ativo: input.active
                }
              });

          return {
            id: record.cd_tipo_item,
            code: record.tp_codigo,
            name: record.nm_tipo_item,
            active: record.sn_ativo
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

          const record = input.id
            ? await prisma.tipoEtapa.update({
                where: { cd_tipo_etapa: input.id },
                data: {
                  ds_codigo: input.code,
                  nm_tipo_etapa: input.name.trim(),
                  sn_ativo: input.active
                }
              })
            : await prisma.tipoEtapa.create({
                data: {
                  ds_codigo: input.code,
                  nm_tipo_etapa: input.name.trim(),
                  sn_ativo: input.active
                }
              });

          return {
            id: record.cd_tipo_etapa,
            code: record.ds_codigo as DemoStageTypeRegistryEntry["code"],
            name: record.nm_tipo_etapa,
            active: record.sn_ativo
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
                where: { cd_fornecedor: input.id },
                data: {
                  nm_fornecedor: name,
                  sn_ativo: input.active ?? true
                }
              })
            : await prisma.fornecedor.create({
                data: {
                  nm_fornecedor: name,
                  sn_ativo: input.active ?? true
                }
              });

          return {
            id: record.cd_fornecedor,
            name: record.nm_fornecedor,
            active: record.sn_ativo
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

    async saveUnit(input: { id?: string; code: string; name: string; measureType: unidade_tipo; active: boolean }) {
      const prisma = resolvePrisma();
      const code = input.code.trim().toLowerCase();

      if (prisma) {
        // When Prisma is connected, let errors propagate so the action can show
        // a real error message instead of silently accepting a no-op.
        const record = input.id
          ? await prisma.unidadeMedida.update({
              where: { cd_unidade_medida: input.id },
              data: {
                ds_codigo: code,
                nm_unidade: input.name.trim(),
                tp_unidade: input.measureType,
                sn_ativo: input.active
              }
            })
          : await prisma.unidadeMedida.create({
              data: {
                ds_codigo: code,
                nm_unidade: input.name.trim(),
                tp_unidade: input.measureType,
                sn_ativo: input.active
              }
            });

        return {
          id: record.cd_unidade_medida,
          code: record.ds_codigo,
          name: record.nm_unidade,
          measureType: UNIT_TYPE_LABELS[record.tp_unidade],
          active: record.sn_ativo
        };
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
        // Rastreia se o banco respondeu ao menos uma chamada — se sim, não
        // cai no demo storage, pois o Prisma é a fonte de verdade.
        let prismaReachable = false;
        try {
          const linkedCounts = await prisma.$transaction(async (tx) => {
            prismaReachable = true;
            const unit = await tx.unidadeMedida.findUnique({ where: { cd_unidade_medida: id } });
            if (!unit) {
              return null;
            }

            const [itemUsage, itemStock, purchases, components] = await Promise.all([
              tx.item.count({ where: { cd_unidade_uso_padrao: id } }),
              tx.item.count({ where: { cd_unidade_estoque: id } }),
              tx.itemCompra.count({ where: { cd_unidade_compra: id } }),
              tx.fichaComponente.count({ where: { cd_unidade_uso: id } })
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

          await prisma.unidadeMedida.delete({ where: { cd_unidade_medida: id } });
          return { success: true as const };
        } catch {
          if (prismaReachable) {
            // O banco respondeu mas a operação falhou — retorna erro direto
            // sem cair no demo storage (que retornaria "nao encontrada" mesmo
            // após uma exclusão bem-sucedida, causando falso negativo).
            return { success: false as const, reason: "Erro ao excluir unidade. Tente novamente." };
          }
          // Banco inacessível — cai no demo storage
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
                where: { cd_modalidade: input.id },
                data: {
                  ds_codigo: code,
                  nm_modalidade: input.name.trim(),
                  sn_ativo: input.active
                }
              })
            : await prisma.modalidade.create({
                data: {
                  ds_codigo: code,
                  nm_modalidade: input.name.trim(),
                  sn_ativo: input.active
                }
              });

          return {
            id: record.cd_modalidade,
            code: record.ds_codigo,
            name: record.nm_modalidade,
            active: record.sn_ativo
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
        let prismaReachable = false;
        try {
          const result = await prisma.$transaction(async (tx) => {
            prismaReachable = true;
            const linked = await tx.fichaTecnica.count({ where: { cd_modalidade: id } });
            if (linked > 0) return { blocked: true };
            await tx.modalidade.delete({ where: { cd_modalidade: id } });
            return { blocked: false };
          });

          if (result.blocked) {
            return { success: false as const, reason: "Nao foi possivel excluir: existe vinculo com fichas." };
          }
          return { success: true as const };
        } catch {
          if (prismaReachable) {
            return { success: false as const, reason: "Erro ao excluir modalidade. Tente novamente." };
          }
          // Banco inacessível — fall to demo storage
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
        let prismaReachable = false;
        try {
          const result = await prisma.$transaction(async (tx) => {
            prismaReachable = true;
            const itemType = await tx.tipoItemCadastro.findUnique({ where: { cd_tipo_item: id } });
            if (!itemType) return { notFound: true, blocked: false };
            const linked = await tx.item.count({ where: { tp_item: itemType.tp_codigo } });
            if (linked > 0) return { notFound: false, blocked: true };
            await tx.tipoItemCadastro.delete({ where: { cd_tipo_item: id } });
            return { notFound: false, blocked: false };
          });

          if (result.notFound) return { success: false as const, reason: "Tipo nao encontrado." };
          if (result.blocked) return { success: false as const, reason: "Nao foi possivel excluir: existe vinculo com itens." };
          return { success: true as const };
        } catch {
          if (prismaReachable) {
            return { success: false as const, reason: "Erro ao excluir tipo de item. Tente novamente." };
          }
          // Banco inacessível — fall to demo storage
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
