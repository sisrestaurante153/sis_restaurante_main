import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type DemoItemType =
  | "insumo"
  | "pre_preparo"
  | "intermediario"
  | "produto_pronto"
  | "prato"
  | "porcao"
  | "marmita"
  | "combo"
  | "embalagem"
  | "apoio";

export type DemoFichaStatus = "rascunho" | "ativa" | "inativa" | "arquivada";
export type DemoYieldMode = "percentual_perda" | "peso_final";
export type DemoComponentType = "ingrediente" | "embalagem" | "apoio";

export interface DemoModality {
  id: string;
  code: string;
  label: string;
  active: boolean;
}

export interface DemoSupplier {
  id: string;
  name: string;
  active: boolean;
}

export interface DemoUnit {
  id: string;
  code: string;
  name: string;
  measureType: "massa" | "volume" | "contagem";
  active: boolean;
}

export interface DemoOperationalCategory {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface DemoItemTypeRegistryEntry {
  id: string;
  code: DemoItemType;
  name: string;
  active: boolean;
}

export interface DemoStageTypeRegistryEntry {
  id: string;
  code: "limpeza_pre_preparo" | "coccao_preparo" | "montagem";
  name: string;
  active: boolean;
}

export interface DemoUser {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roleCodes: string[];
  password: string;
}

export interface DemoItemRecord {
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  description: string;
  type: DemoItemType;
  operationalCategory: string;
  stockUnit: string;
  usageUnit: string;
  purchaseUnit: string;
  purchaseQuantity: string;
  purchaseCost: string;
  conversionFactor: string;
  supplier: string;
  active: boolean;
  aliases: string[];
  lastCalculationAt: string;
  fichaStatus: DemoFichaStatus | null;
  costs: {
    direct: string;
    inherited: string;
    packaging: string;
    total: string;
  };
}

export interface DemoComponentRecord {
  id: string;
  stageId?: string;
  itemId: string;
  itemName: string;
  componentType: DemoComponentType;
  quantityUsed: string;
  quantityGross: string;
  quantityNet: string;
  usageUnit: string;
  correctionFactor?: string;
  cookingIndex?: string;
  notes?: string;
  directCost: string;
  inheritedCost: string;
  totalCost: string;
  impactPercent: string;
}

export interface DemoStageRecord {
  id: string;
  name: string;
  stageTypeId?: string;
  stageTypeCode?: string;
  stageTypeLabel?: string;
  outputQuantity: string;
  correctionFactor?: string;
  cookingIndex?: string;
  notes?: string;
}

export interface DemoExpandedRow {
  id: string;
  path: string;
  depth: number;
  itemName: string;
  componentType: DemoComponentType;
  usageUnit: string;
  quantity: string;
  totalCost: string;
}

export interface DemoFichaRecord {
  id: string;
  itemId: string;
  itemName: string;
  displayName: string;
  itemType: DemoItemType;
  modalityId: string;
  modalityLabel: string;
  version: number;
  status: DemoFichaStatus;
  yieldMode: DemoYieldMode;
  yieldUnitCode: string;
  percentLoss: string | null;
  finalWeight: string | null;
  portions: string | null;
  salePrice: string | null;
  variableExpensePercent: string | null;
  preparationMode: string;
  notes: string;
  updatedAt: string;
  stages: DemoStageRecord[];
  components: DemoComponentRecord[];
  expandedRows: DemoExpandedRow[];
  costs: {
    direct: string;
    inherited: string;
    packaging: string;
    total: string;
    perKg: string;
    perPortion: string | null;
    finalOutput: string;
  };
}

export interface DemoImportConflictRecord {
  id: string;
  type: string;
  rawName: string;
  normalizedName: string;
  sheetName: string;
  rowNumber: number;
  confidence: string;
  suggestedItemName: string | null;
  suggestedAlias: string | null;
  resolved: boolean;
}

export interface DemoImportExecutionRecord {
  id: string;
  originalFileName: string;
  originalFilePath: string | null;
  fileHash: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: "pendente" | "processando" | "concluida" | "concluida_com_conflitos" | "falha";
  currentStage: string;
  friendlySummary: {
    headline: string;
    whatHappened: string;
    impact: string;
    whatToDoNow: string;
    nextAction?: {
      label: string;
      href: string;
    } | null;
  } | null;
  technicalDetails: Record<string, unknown> | null;
  artifacts: Record<string, unknown> | null;
  operationalSummary: Record<string, unknown> | null;
  requestedByUserId: string | null;
  requestedByName: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  conflictCount: number;
}

export interface DemoAuditRecord {
  id: string;
  entity: "item" | "ficha_tecnica" | "importacao";
  entityId: string;
  entityLabel: string;
  action: string;
  userId: string | null;
  userName: string;
  createdAt: string;
  beforeSummary: string | null;
  afterSummary: string | null;
  beforeJson: unknown | null;
  afterJson: unknown | null;
}

export interface DemoAssemblyScenario {
  id: string;
  label: string;
  category: "prato" | "marmita" | "combo";
  includedItemIds: string[];
  totalCost: string;
  packagingCost: string;
  finalOutput: string;
}

export interface DemoStore {
  modalities: DemoModality[];
  suppliers: DemoSupplier[];
  units: DemoUnit[];
  operationalCategories: DemoOperationalCategory[];
  itemTypes: DemoItemTypeRegistryEntry[];
  stageTypes: DemoStageTypeRegistryEntry[];
  users: DemoUser[];
  items: DemoItemRecord[];
  fichas: DemoFichaRecord[];
  importExecutions: DemoImportExecutionRecord[];
  importConflicts: DemoImportConflictRecord[];
  audits: DemoAuditRecord[];
  assemblyScenarios: DemoAssemblyScenario[];
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createInitialDemoStore(): DemoStore {
  return {
    modalities: [
      { id: "mod-producao", code: "producao", label: "Producao", active: true },
      { id: "mod-delivery", code: "delivery", label: "Delivery", active: true },
      { id: "mod-salao", code: "salao", label: "Salao", active: true },
      { id: "mod-combo", code: "combo", label: "Combo", active: true }
    ],
    suppliers: [
      { id: "forn-vmarket", name: "VMarket", active: true },
      { id: "forn-cozinha-interna", name: "Cozinha interna", active: true },
      { id: "forn-emb-sul", name: "Embalagens Sul", active: true },
      { id: "forn-montagem-interna", name: "Montagem interna", active: true },
      { id: "forn-abc", name: "Distribuidora ABC", active: true },
      { id: "forn-centro", name: "Fornecedor Centro", active: true }
    ],
    units: [
      { id: "un-kg", code: "kg", name: "Quilograma", measureType: "massa", active: true },
      { id: "un-g", code: "g", name: "Grama", measureType: "massa", active: true },
      { id: "un-l", code: "l", name: "Litro", measureType: "volume", active: true },
      { id: "un-ml", code: "ml", name: "Mililitro", measureType: "volume", active: true },
      { id: "un-un", code: "un", name: "Unidade", measureType: "contagem", active: true },
      { id: "un-maco", code: "maco", name: "Maco", measureType: "contagem", active: true }
    ],
    operationalCategories: [
      { id: "cat-graos", code: "graos", name: "Graos", active: true },
      { id: "cat-proteinas", code: "proteinas", name: "Proteinas", active: true },
      { id: "cat-hortifruti", code: "hortifruti", name: "Hortifruti", active: true },
      { id: "cat-cozinha-quente", code: "cozinha-quente", name: "Cozinha quente", active: true },
      { id: "cat-guarnicoes", code: "guarnicoes", name: "Guarnicoes", active: true },
      { id: "cat-laticinios", code: "laticinios", name: "Laticinios", active: true },
      { id: "cat-mercearia", code: "mercearia", name: "Mercearia", active: true },
      { id: "cat-embalagens", code: "embalagens", name: "Embalagens", active: true },
      { id: "cat-descartaveis", code: "descartaveis", name: "Descartaveis", active: true },
      { id: "cat-montagem", code: "montagem", name: "Montagem", active: true },
      { id: "cat-operacional", code: "operacional", name: "Operacional", active: true }
    ],
    itemTypes: [
      { id: "tipo-insumo", code: "insumo", name: "Insumo", active: true },
      { id: "tipo-pre-preparo", code: "pre_preparo", name: "Pre-preparo", active: true },
      { id: "tipo-intermediario", code: "intermediario", name: "Intermediario", active: true },
      { id: "tipo-produto-pronto", code: "produto_pronto", name: "Produto pronto", active: true },
      { id: "tipo-prato", code: "prato", name: "Prato", active: true },
      { id: "tipo-porcao", code: "porcao", name: "Porcao", active: true },
      { id: "tipo-marmita", code: "marmita", name: "Marmita", active: true },
      { id: "tipo-combo", code: "combo", name: "Combo", active: true },
      { id: "tipo-embalagem", code: "embalagem", name: "Embalagem", active: true },
      { id: "tipo-apoio", code: "apoio", name: "Apoio", active: true }
    ],
    stageTypes: [
      {
        id: "tipo-etapa-limpeza",
        code: "limpeza_pre_preparo",
        name: "Limpeza / Pre-Preparo",
        active: true
      },
      {
        id: "tipo-etapa-coccao",
        code: "coccao_preparo",
        name: "Coccao / Preparo",
        active: true
      },
      {
        id: "tipo-etapa-montagem",
        code: "montagem",
        name: "Montagem",
        active: true
      }
    ],
    users: [
      {
        id: "user-admin",
        nome: "Administrador Bootstrap",
        email: "admin@sis-restaurante.local",
        ativo: true,
        roleCodes: ["admin"],
        password: "admin123"
      },
      {
        id: "user-engenharia",
        nome: "Engenharia Produto",
        email: "engenharia@sis-restaurante.local",
        ativo: true,
        roleCodes: ["engenharia"],
        password: "engenharia123"
      },
      {
        id: "user-consulta",
        nome: "Consulta Operacional",
        email: "consulta@sis-restaurante.local",
        ativo: true,
        roleCodes: ["consulta"],
        password: "consulta123"
      }
    ],
    items: [
      {
        id: "item-tomate",
        code: "INS-001",
        name: "Tomate Italiano",
        normalizedName: "tomate-italiano",
        description: "Base fresca para molhos e refogados.",
        type: "insumo",
        operationalCategory: "Hortifruti",
        stockUnit: "kg",
        usageUnit: "g",
        purchaseUnit: "kg",
        purchaseQuantity: "1.0000",
        purchaseCost: "12.5000",
        conversionFactor: "1000.0000",
        supplier: "VMarket",
        active: true,
        aliases: ["tomate", "tomate italiano"],
        lastCalculationAt: "2026-03-13T14:10:00.000Z",
        fichaStatus: null,
        costs: {
          direct: "12.5000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "12.5000"
        }
      },
      {
        id: "item-cebola",
        code: "INS-002",
        name: "Cebola Branca",
        normalizedName: "cebola-branca",
        description: "Uso base em molhos e pre-preparos.",
        type: "insumo",
        operationalCategory: "Hortifruti",
        stockUnit: "kg",
        usageUnit: "g",
        purchaseUnit: "kg",
        purchaseQuantity: "1.0000",
        purchaseCost: "7.8000",
        conversionFactor: "1000.0000",
        supplier: "VMarket",
        active: true,
        aliases: ["cebola"],
        lastCalculationAt: "2026-03-13T14:10:00.000Z",
        fichaStatus: null,
        costs: {
          direct: "7.8000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "7.8000"
        }
      },
      {
        id: "item-molho",
        code: "PRE-011",
        name: "Molho Base de Tomate",
        normalizedName: "molho-base-de-tomate",
        description: "Pre-preparo recursivo para pratos e marmitas.",
        type: "pre_preparo",
        operationalCategory: "Cozinha quente",
        stockUnit: "kg",
        usageUnit: "g",
        purchaseUnit: "kg",
        purchaseQuantity: "1.0000",
        purchaseCost: "24.6000",
        conversionFactor: "1000.0000",
        supplier: "Cozinha interna",
        active: true,
        aliases: ["molho base", "molho vermelho"],
        lastCalculationAt: "2026-03-13T14:12:00.000Z",
        fichaStatus: "ativa",
        costs: {
          direct: "24.6000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "24.6000"
        }
      },
      {
        id: "item-arroz",
        code: "INT-021",
        name: "Arroz Branco Cozido",
        normalizedName: "arroz-branco-cozido",
        description: "Intermediario de apoio para pratos e marmitas.",
        type: "intermediario",
        operationalCategory: "Guarnicoes",
        stockUnit: "kg",
        usageUnit: "g",
        purchaseUnit: "kg",
        purchaseQuantity: "1.0000",
        purchaseCost: "6.4000",
        conversionFactor: "1000.0000",
        supplier: "Cozinha interna",
        active: true,
        aliases: ["arroz"],
        lastCalculationAt: "2026-03-13T14:13:00.000Z",
        fichaStatus: "ativa",
        costs: {
          direct: "6.4000",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "6.4000"
        }
      },
      {
        id: "item-embalagem-prato",
        code: "EMB-101",
        name: "Pote Selado 1000ml",
        normalizedName: "pote-selado-1000ml",
        description: "Embalagem operacional do prato executivo.",
        type: "embalagem",
        operationalCategory: "Descartaveis",
        stockUnit: "un",
        usageUnit: "un",
        purchaseUnit: "un",
        purchaseQuantity: "1.0000",
        purchaseCost: "0.9500",
        conversionFactor: "1.0000",
        supplier: "Embalagens Sul",
        active: true,
        aliases: ["pote 1000"],
        lastCalculationAt: "2026-03-13T14:13:00.000Z",
        fichaStatus: null,
        costs: {
          direct: "0.9500",
          inherited: "0.0000",
          packaging: "0.9500",
          total: "0.9500"
        }
      },
      {
        id: "item-prato",
        code: "PRT-301",
        name: "Prato Executivo Frango",
        normalizedName: "prato-executivo-frango",
        description: "Produto final vendido no salao.",
        type: "prato",
        operationalCategory: "Montagem",
        stockUnit: "un",
        usageUnit: "un",
        purchaseUnit: "un",
        purchaseQuantity: "1.0000",
        purchaseCost: "18.3200",
        conversionFactor: "1.0000",
        supplier: "Montagem interna",
        active: true,
        aliases: ["prato executivo"],
        lastCalculationAt: "2026-03-13T14:15:00.000Z",
        fichaStatus: "ativa",
        costs: {
          direct: "7.7000",
          inherited: "9.6700",
          packaging: "0.9500",
          total: "18.3200"
        }
      },
      {
        id: "item-marmita",
        code: "MRM-411",
        name: "Marmita Premium 850g",
        normalizedName: "marmita-premium-850g",
        description: "Montagem completa para entrega.",
        type: "marmita",
        operationalCategory: "Delivery",
        stockUnit: "un",
        usageUnit: "un",
        purchaseUnit: "un",
        purchaseQuantity: "1.0000",
        purchaseCost: "24.9000",
        conversionFactor: "1.0000",
        supplier: "Montagem interna",
        active: true,
        aliases: ["marmita premium"],
        lastCalculationAt: "2026-03-13T14:18:00.000Z",
        fichaStatus: "ativa",
        costs: {
          direct: "8.4000",
          inherited: "14.3000",
          packaging: "2.2000",
          total: "24.9000"
        }
      },
      {
        id: "item-combo",
        code: "CMB-501",
        name: "Combo Familia Domingo",
        normalizedName: "combo-familia-domingo",
        description: "Combo com prato, porcao e apoio.",
        type: "combo",
        operationalCategory: "Promocional",
        stockUnit: "un",
        usageUnit: "un",
        purchaseUnit: "un",
        purchaseQuantity: "1.0000",
        purchaseCost: "47.5000",
        conversionFactor: "1.0000",
        supplier: "Montagem interna",
        active: false,
        aliases: ["combo domingo"],
        lastCalculationAt: "2026-03-12T20:30:00.000Z",
        fichaStatus: "inativa",
        costs: {
          direct: "3.5000",
          inherited: "42.1000",
          packaging: "1.9000",
          total: "47.5000"
        }
      }
    ],
    fichas: [
      {
        id: "ficha-molho-v1",
        itemId: "item-molho",
        itemName: "Molho Base de Tomate",
        displayName: "Molho Base de Tomate",
        itemType: "pre_preparo",
        modalityId: "mod-producao",
        modalityLabel: "Producao",
        version: 1,
        status: "ativa",
        yieldMode: "percentual_perda",
        yieldUnitCode: "kg",
        percentLoss: "0.1200",
        finalWeight: null,
        portions: "12.0000",
        salePrice: null,
        variableExpensePercent: null,
        preparationMode: "Refogar, reduzir e resfriar.",
        notes: "Receita de referencia para pratos e marmitas.",
        updatedAt: "2026-03-13T14:12:00.000Z",
        stages: [
          {
            id: "stage-molho-1",
            name: "Limpeza e Higienizacao",
            stageTypeId: "tipo-etapa-limpeza",
            stageTypeCode: "limpeza_pre_preparo",
            stageTypeLabel: "Limpeza / Pre-Preparo",
            outputQuantity: "2.4500",
            correctionFactor: "1.020000",
            cookingIndex: "1.000000",
            notes: "Separar e higienizar os vegetais."
          },
          {
            id: "stage-molho-2",
            name: "Coccao e Finalizacao",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            stageTypeLabel: "Coccao / Preparo",
            outputQuantity: "1.7600",
            correctionFactor: "1.000000",
            cookingIndex: "0.718400",
            notes: "Refogar, reduzir e resfriar."
          }
        ],
        components: [
          {
            id: "cmp-molho-1",
            stageId: "stage-molho-1",
            itemId: "item-tomate",
            itemName: "Tomate Italiano",
            componentType: "ingrediente",
            quantityUsed: "2.0000",
            quantityGross: "2.0000",
            quantityNet: "2.0000",
            usageUnit: "kg",
            directCost: "25.0000",
            inheritedCost: "0.0000",
            totalCost: "25.0000",
            impactPercent: "0.7600"
          },
          {
            id: "cmp-molho-2",
            stageId: "stage-molho-1",
            itemId: "item-cebola",
            itemName: "Cebola Branca",
            componentType: "ingrediente",
            quantityUsed: "0.5000",
            quantityGross: "0.5000",
            quantityNet: "0.4500",
            usageUnit: "kg",
            directCost: "3.5100",
            inheritedCost: "0.0000",
            totalCost: "3.5100",
            impactPercent: "0.1070"
          }
        ],
        expandedRows: [
          {
            id: "exp-molho-1",
            path: "Molho Base de Tomate > Tomate Italiano",
            depth: 1,
            itemName: "Tomate Italiano",
            componentType: "ingrediente",
            usageUnit: "kg",
            quantity: "2.0000",
            totalCost: "25.0000"
          },
          {
            id: "exp-molho-2",
            path: "Molho Base de Tomate > Cebola Branca",
            depth: 1,
            itemName: "Cebola Branca",
            componentType: "ingrediente",
            usageUnit: "kg",
            quantity: "0.4500",
            totalCost: "3.5100"
          }
        ],
        costs: {
          direct: "28.5100",
          inherited: "0.0000",
          packaging: "0.0000",
          total: "28.5100",
          perKg: "16.1989",
          perPortion: "2.3758",
          finalOutput: "1.7600"
        }
      },
      {
        id: "ficha-prato-v3",
        itemId: "item-prato",
        itemName: "Prato Executivo Frango",
        displayName: "Prato Executivo Frango",
        itemType: "prato",
        modalityId: "mod-salao",
        modalityLabel: "Salao",
        version: 3,
        status: "ativa",
        yieldMode: "peso_final",
        yieldUnitCode: "un",
        percentLoss: null,
        finalWeight: "0.5400",
        portions: "1.0000",
        salePrice: null,
        variableExpensePercent: null,
        preparationMode: "Montagem final em bancada quente.",
        notes: "Versao operacional para salao e take-away.",
        updatedAt: "2026-03-13T14:15:00.000Z",
        stages: [
          {
            id: "stage-prato-1",
            name: "Preparo e Manipulacao",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            stageTypeLabel: "Coccao / Preparo",
            outputQuantity: "0.4000",
            correctionFactor: "1.000000",
            cookingIndex: "1.000000",
            notes: "Separar base quente e molhos."
          },
          {
            id: "stage-prato-2",
            name: "Montagem do Produto",
            stageTypeId: "tipo-etapa-montagem",
            stageTypeCode: "montagem",
            stageTypeLabel: "Montagem",
            outputQuantity: "0.5400",
            correctionFactor: "1.000000",
            cookingIndex: "1.350000",
            notes: "Montar prato, incluir embalagem e finalizar."
          }
        ],
        components: [
          {
            id: "cmp-prato-1",
            stageId: "stage-prato-1",
            itemId: "item-arroz",
            itemName: "Arroz Branco Cozido",
            componentType: "ingrediente",
            quantityUsed: "0.1800",
            quantityGross: "0.1800",
            quantityNet: "0.1800",
            usageUnit: "kg",
            directCost: "1.1520",
            inheritedCost: "0.0000",
            totalCost: "1.1520",
            impactPercent: "0.0630"
          },
          {
            id: "cmp-prato-2",
            stageId: "stage-prato-1",
            itemId: "item-molho",
            itemName: "Molho Base de Tomate",
            componentType: "ingrediente",
            quantityUsed: "0.2200",
            quantityGross: "0.2200",
            quantityNet: "0.2200",
            usageUnit: "kg",
            directCost: "0.0000",
            inheritedCost: "3.5638",
            totalCost: "3.5638",
            impactPercent: "0.1945"
          },
          {
            id: "cmp-prato-3",
            stageId: "stage-prato-2",
            itemId: "item-embalagem-prato",
            itemName: "Pote Selado 1000ml",
            componentType: "embalagem",
            quantityUsed: "1.0000",
            quantityGross: "1.0000",
            quantityNet: "1.0000",
            usageUnit: "un",
            directCost: "0.9500",
            inheritedCost: "0.0000",
            totalCost: "0.9500",
            impactPercent: "0.0519"
          }
        ],
        expandedRows: [
          {
            id: "exp-prato-1",
            path: "Prato Executivo Frango > Arroz Branco Cozido",
            depth: 1,
            itemName: "Arroz Branco Cozido",
            componentType: "ingrediente",
            usageUnit: "kg",
            quantity: "0.1800",
            totalCost: "1.1520"
          },
          {
            id: "exp-prato-2",
            path: "Prato Executivo Frango > Molho Base de Tomate",
            depth: 1,
            itemName: "Molho Base de Tomate",
            componentType: "ingrediente",
            usageUnit: "kg",
            quantity: "0.2200",
            totalCost: "3.5638"
          },
          {
            id: "exp-prato-3",
            path: "Prato Executivo Frango > Molho Base de Tomate > Tomate Italiano",
            depth: 2,
            itemName: "Tomate Italiano",
            componentType: "ingrediente",
            usageUnit: "kg",
            quantity: "0.2500",
            totalCost: "3.1250"
          },
          {
            id: "exp-prato-4",
            path: "Prato Executivo Frango > Pote Selado 1000ml",
            depth: 1,
            itemName: "Pote Selado 1000ml",
            componentType: "embalagem",
            usageUnit: "un",
            quantity: "1.0000",
            totalCost: "0.9500"
          }
        ],
        costs: {
          direct: "7.7000",
          inherited: "9.6700",
          packaging: "0.9500",
          total: "18.3200",
          perKg: "33.9259",
          perPortion: "18.3200",
          finalOutput: "0.5400"
        }
      }
    ],
    importExecutions: [
      {
        id: "import-demo-1",
        originalFileName: "fichas-legado-demo.xlsx",
        originalFilePath: "artifacts/imports/demo/fichas-legado-demo.xlsx",
        fileHash: "demo-hash-1",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSizeBytes: 245760,
        status: "concluida_com_conflitos",
        currentStage: "concluida",
        friendlySummary: {
          headline: "Importacao concluida com pendencias",
          whatHappened: "A leitura do legado terminou e parte da carga ja foi aplicada.",
          impact: "Alguns nomes ainda precisam de reconciliacao manual antes do fechamento operacional.",
          whatToDoNow: "Abra as pendencias, valide os itens sugeridos e finalize a reconciliacao.",
          nextAction: {
            label: "Abrir pendencias",
            href: "/importacao/pendencias"
          }
        },
        technicalDetails: {
          parser: "demo"
        },
        artifacts: {
          reportPath: "artifacts/imports/demo/report.json",
          loadResultPath: "artifacts/imports/demo/load-result.json"
        },
        operationalSummary: {
          itemsImported: 12,
          recipesImported: 5
        },
        requestedByUserId: "user-admin",
        requestedByName: "Administrador Bootstrap",
        createdAt: "2026-03-13T15:00:00.000Z",
        startedAt: "2026-03-13T15:00:10.000Z",
        finishedAt: "2026-03-13T15:03:00.000Z",
        conflictCount: 2
      }
    ],
    importConflicts: [
      {
        id: "conf-1",
        type: "alias",
        rawName: "Molho Bse",
        normalizedName: "molho-bse",
        sheetName: "RECEITA PRATO 12",
        rowNumber: 18,
        confidence: "0.7400",
        suggestedItemName: "Molho Base de Tomate",
        suggestedAlias: "Molho Bse",
        resolved: false
      },
      {
        id: "conf-2",
        type: "unit_conversion",
        rawName: "Tomate",
        normalizedName: "tomate",
        sheetName: "TABELA VMARKET",
        rowNumber: 42,
        confidence: "0.5900",
        suggestedItemName: "Tomate Italiano",
        suggestedAlias: null,
        resolved: false
      }
    ],
    audits: [
      {
        id: "audit-1",
        entity: "item",
        entityId: "item-molho",
        entityLabel: "Molho Base de Tomate",
        action: "item.updated",
        userId: "user-admin",
        userName: "Administrador Bootstrap",
        createdAt: "2026-03-13T14:12:00.000Z",
        beforeSummary: "custo total 23.8000",
        afterSummary: "custo total 24.6000",
        beforeJson: {
          total: "23.8000"
        },
        afterJson: {
          total: "24.6000"
        }
      },
      {
        id: "audit-2",
        entity: "ficha_tecnica",
        entityId: "ficha-prato-v3",
        entityLabel: "Prato Executivo Frango v3",
        action: "ficha.activated",
        userId: "user-admin",
        userName: "Administrador Bootstrap",
        createdAt: "2026-03-13T14:15:00.000Z",
        beforeSummary: "status rascunho",
        afterSummary: "status ativa",
        beforeJson: {
          status: "rascunho"
        },
        afterJson: {
          status: "ativa"
        }
      }
    ],
    assemblyScenarios: [
      {
        id: "assembly-1",
        label: "Prato executivo com embalagem",
        category: "prato",
        includedItemIds: ["item-prato", "item-embalagem-prato"],
        totalCost: "18.3200",
        packagingCost: "0.9500",
        finalOutput: "1.0000"
      },
      {
        id: "assembly-2",
        label: "Marmita premium 850g",
        category: "marmita",
        includedItemIds: ["item-marmita"],
        totalCost: "24.9000",
        packagingCost: "2.2000",
        finalOutput: "1.0000"
      }
    ]
  };
}

let demoStore = createInitialDemoStore();
const DEMO_STORE_FILE = join(process.cwd(), "artifacts", "runtime", "demo-store.json");

function shouldPersistDemoStore() {
  return process.env.NODE_ENV !== "test";
}

function ensureDemoStoreDir() {
  mkdirSync(dirname(DEMO_STORE_FILE), { recursive: true });
}

function writeDemoStoreToDisk(store: DemoStore) {
  if (!shouldPersistDemoStore()) {
    return;
  }

  ensureDemoStoreDir();
  writeFileSync(DEMO_STORE_FILE, JSON.stringify(store, null, 2));
}

function readDemoStoreFromDisk() {
  if (!shouldPersistDemoStore()) {
    return null;
  }

  try {
    const content = readFileSync(DEMO_STORE_FILE, "utf8");
    return JSON.parse(content) as DemoStore;
  } catch {
    return null;
  }
}

function syncDemoStoreFromDisk() {
  const persistedStore = readDemoStoreFromDisk();

  if (persistedStore) {
    const defaults = createInitialDemoStore();
    demoStore = {
      ...defaults,
      ...persistedStore,
      modalities: persistedStore.modalities ?? defaults.modalities,
      suppliers: persistedStore.suppliers ?? defaults.suppliers,
      units: persistedStore.units ?? defaults.units,
      operationalCategories: persistedStore.operationalCategories ?? defaults.operationalCategories,
      itemTypes: persistedStore.itemTypes ?? defaults.itemTypes,
      stageTypes: persistedStore.stageTypes ?? defaults.stageTypes,
      users: persistedStore.users ?? defaults.users,
      items: persistedStore.items ?? defaults.items,
      fichas: persistedStore.fichas ?? defaults.fichas,
      importExecutions: persistedStore.importExecutions ?? defaults.importExecutions,
      importConflicts: persistedStore.importConflicts ?? defaults.importConflicts,
      audits: persistedStore.audits ?? defaults.audits,
      assemblyScenarios: persistedStore.assemblyScenarios ?? defaults.assemblyScenarios
    };
    return demoStore;
  }

  writeDemoStoreToDisk(demoStore);
  return demoStore;
}

export function getDemoStore() {
  return syncDemoStoreFromDisk();
}

export function persistDemoStore(store: DemoStore) {
  demoStore = cloneDemoStore(store);
  writeDemoStoreToDisk(demoStore);

  return demoStore;
}

export function resetDemoStore() {
  demoStore = createInitialDemoStore();

  if (shouldPersistDemoStore()) {
    rmSync(DEMO_STORE_FILE, { force: true });
    writeDemoStoreToDisk(demoStore);
  }

  return demoStore;
}

export function cloneDemoStore<T>(value: T): T {
  return structuredClone(value);
}

export function createDemoId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toNormalizedName(value: string) {
  return slugify(value);
}
