// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadLegacyImportReport } from "../../../scripts/load-legacy-import";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("load legacy import integration", () => {
  const prisma = getIntegrationPrisma();
  const tempDirs: string[] = [];
  const unitWorkbook = "teste-load-legado-unidade.xlsx";
  const composedWorkbook = "teste-load-legado-composto.xlsx";

  afterAll(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
    await closeIntegrationPrisma();
  });

  it("persists inferred unit conversion and usage cost for imported countable items", async () => {
    await prisma.custoSnapshotItem.deleteMany({
      where: {
        item: {
          nomeNormalizado: "integracao-load-legado-alho-3kg"
        }
      }
    });
    await prisma.itemCompra.deleteMany({
      where: {
        item: {
          nomeNormalizado: "integracao-load-legado-alho-3kg"
        }
      }
    });
    await prisma.itemAlias.deleteMany({
      where: {
        item: {
          nomeNormalizado: "integracao-load-legado-alho-3kg"
        }
      }
    });
    await prisma.conversaoUnidade.deleteMany({
      where: {
        item: {
          nomeNormalizado: "integracao-load-legado-alho-3kg"
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: unitWorkbook
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        execucao: {
          origemArquivo: unitWorkbook
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: unitWorkbook
      }
    });
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: "integracao-load-legado-alho-3kg"
      }
    });

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "sis-restaurante-load-legacy-"));
    tempDirs.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    const execution = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: unitWorkbook,
        status: "concluida"
      }
    });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          source_workbook: unitWorkbook,
          summary: {
            staged_items: 1,
            staged_recipes: 0,
            generated_aliases: 0,
            conflicts: 0
          },
          staging: {
            items: [
              {
                source_kind: "vmarket",
                sheet_name: "TABELA VMARKET",
                row_number: 2,
                display_name: "Integracao Load Legado Alho balde 3kg",
                canonical_name: "integracao-load-legado-alho-3kg",
                item_type: "insumo",
                purchase_unit: "un",
                usage_unit: "kg",
                purchase_to_usage_factor: 3,
                purchase_cost: 30,
                unit_cost_reference: 30
              }
            ],
            recipes: [],
            weights: []
          },
          aliases: [],
          conflicts: []
        },
        null,
        2
      ),
      "utf-8"
    );

    await loadLegacyImportReport({
      reportPath,
      executionId: execution.id
    });

    const persisted = await prisma.item.findUniqueOrThrow({
      where: {
        nomeNormalizado: "integracao-load-legado-alho-3kg"
      },
      include: {
        unidadeUsoPadrao: true,
        conversoes: {
          include: {
            unidadeOrigem: true,
            unidadeDestino: true
          }
        },
        compras: {
          include: {
            unidadeCompra: true
          }
        },
        custosSnapshot: {
          orderBy: {
            calculadoEm: "desc"
          },
          take: 1
        }
      }
    });

    expect(persisted.unidadeUsoPadrao?.codigo).toBe("kg");
    expect(persisted.compras[0]?.unidadeCompra.codigo).toBe("un");
    expect(persisted.compras[0]?.custoUnitarioBase.toString()).toBe("10");
    expect(persisted.custosSnapshot[0]?.custoPorKgOuUnidadeUso?.toString()).toBe("10");
    expect(persisted.conversoes).toHaveLength(1);
    expect(persisted.conversoes[0]?.unidadeOrigem.codigo).toBe("un");
    expect(persisted.conversoes[0]?.unidadeDestino.codigo).toBe("kg");
    expect(persisted.conversoes[0]?.fator.toString()).toBe("3");
  });

  it("recalculates imported composed items so listing costs are not left at zero", async () => {
    const trackedNames = [
      "integracao-load-legado-arroz",
      "integracao-load-legado-embalagem",
      "integracao-load-legado-prato"
    ];

    await prisma.custoSnapshotItem.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            in: trackedNames
          }
        }
      }
    });
    await prisma.calculoComponenteSnapshot.deleteMany({
      where: {
        OR: [
          {
            itemComponente: {
              nomeNormalizado: {
                in: trackedNames
              }
            }
          },
            {
              calculoExecucao: {
                item: {
                  nomeNormalizado: {
                    in: trackedNames
                  }
              }
            }
          }
        ]
      }
    });
    await prisma.calculoExecucao.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            in: trackedNames
          }
        }
      }
    });
    await prisma.itemCompra.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            in: trackedNames
          }
        }
      }
    });
    await prisma.itemAlias.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            in: trackedNames
          }
        }
      }
    });
    await prisma.conversaoUnidade.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            in: trackedNames
          }
        }
      }
    });
    await prisma.fichaComponente.deleteMany({
      where: {
        fichaTecnica: {
          itemResultante: {
            nomeNormalizado: "integracao-load-legado-prato"
          }
        }
      }
    });
    await prisma.fichaTecnica.deleteMany({
      where: {
        itemResultante: {
          nomeNormalizado: "integracao-load-legado-prato"
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: composedWorkbook
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        execucao: {
          origemArquivo: composedWorkbook
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: composedWorkbook
      }
    });
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: {
          in: trackedNames
        }
      }
    });

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "sis-restaurante-load-legacy-composed-"));
    tempDirs.push(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    const execution = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: composedWorkbook,
        status: "concluida"
      }
    });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          source_workbook: composedWorkbook,
          summary: {
            staged_items: 3,
            staged_recipes: 1,
            generated_aliases: 0,
            conflicts: 0
          },
          staging: {
            items: [
              {
                source_kind: "vmarket",
                sheet_name: "TABELA VMARKET",
                row_number: 2,
                display_name: "Integracao Load Legado Arroz",
                canonical_name: "integracao-load-legado-arroz",
                item_type: "insumo",
                purchase_unit: "kg",
                purchase_cost: 5,
                unit_cost_reference: 5
              },
              {
                source_kind: "embalagem",
                sheet_name: "EMBALAGENS",
                row_number: 3,
                display_name: "Integracao Load Legado Embalagem",
                canonical_name: "integracao-load-legado-embalagem",
                item_type: "embalagem",
                purchase_unit: "un",
                purchase_cost: 0.5,
                unit_cost_reference: 0.5
              },
              {
                source_kind: "sheet_product",
                sheet_name: "PRATO TESTE",
                row_number: 2,
                display_name: "Integracao Load Legado Prato",
                canonical_name: "integracao-load-legado-prato",
                item_type: "prato",
                purchase_unit: null,
                purchase_cost: null,
                unit_cost_reference: null
              }
            ],
            recipes: [
              {
                sheet_name: "PRATO TESTE",
                sheet_product_name: "Integracao Load Legado Prato",
                normalized_product_name: "integracao-load-legado-prato",
                recipe_kind: "final_composition",
                yield_value: 1,
                ingredient_components: [
                  {
                    source_row: 11,
                    raw_name: "Integracao Load Legado Arroz",
                    resolved_canonical_name: "integracao-load-legado-arroz",
                    gross_weight: 1,
                    net_weight: 1,
                    quantity: 1,
                    unit: "kg",
                    unit_cost: 5
                  }
                ],
                packaging_components: [
                  {
                    source_row: 12,
                    raw_name: "Integracao Load Legado Embalagem",
                    resolved_canonical_name: "integracao-load-legado-embalagem",
                    gross_weight: 1,
                    net_weight: 1,
                    quantity: 1,
                    unit: "un",
                    unit_cost: 0.5
                  }
                ]
              }
            ],
            weights: []
          },
          aliases: [],
          conflicts: []
        },
        null,
        2
      ),
      "utf-8"
    );

    await loadLegacyImportReport({
      reportPath,
      executionId: execution.id
    });

    const persisted = await prisma.item.findUniqueOrThrow({
      where: {
        nomeNormalizado: "integracao-load-legado-prato"
      },
      include: {
        custosSnapshot: {
          orderBy: {
            calculadoEm: "desc"
          },
          take: 1
        },
        fichasResultantes: {
          where: {
            status: "ativa"
          },
          include: {
            execucoesCalculo: {
              orderBy: {
                criadoEm: "desc"
              },
              take: 1
            }
          }
        }
      }
    });

    expect(persisted.custosSnapshot[0]?.custoTotalAtual.toString()).toBe("5.5");
    expect(persisted.custosSnapshot[0]?.custoEmbalagemAtual?.toString()).toBe("0.5");
    expect(persisted.fichasResultantes[0]?.execucoesCalculo[0]).toBeTruthy();
  });
});
