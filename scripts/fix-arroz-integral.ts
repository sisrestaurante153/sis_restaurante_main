import * as dotenv from "dotenv";
dotenv.config();

import { getPrismaClient } from "../src/modules/platform/infra/prisma";

async function main() {
  const prisma = getPrismaClient(process.env.DATABASE_URL);
  if (!prisma) {
    console.error("Could not construct Prisma Client");
    return;
  }
  try {
    // 1. Get the corrupt Ficha for "Arroz Integral"
    const ficha = await prisma.fichaTecnica.findUnique({
      where: {
        cd_ficha_tecnica: "cmpivhtbr001i04joqz4gaui4"
      },
      include: {
        itemResultante: true
      }
    });

    if (!ficha) {
      console.error("Ficha for Arroz Integral not found!");
      return;
    }

    console.log("Found corrupt Ficha:", {
      id: ficha.cd_ficha_tecnica,
      displayName: ficha.nm_exibicao,
      oldItemResultanteId: ficha.cd_item_resultante,
      oldItemResultanteName: ficha.itemResultante?.nm_item
    });

    // 2. Ensure "Arroz Integral" item exists
    const normalizedName = "arroz-integral";
    const displayName = "Arroz Integral";
    let targetItem = await prisma.item.findFirst({
      where: {
        nm_normalizado: normalizedName,
        cd_restaurante: ficha.cd_restaurante
      }
    });

    if (!targetItem) {
      console.log("Creating new Arroz Integral item...");
      // Let's get the yield unit of the ficha or use the unit of Arroz Branco
      const yieldUnitId = ficha.cd_unidade_rendimento || ficha.itemResultante.cd_unidade_uso_padrao;

      targetItem = await prisma.item.create({
        data: {
          nm_item: displayName,
          ds_codigo_interno: null, // set to null to avoid unique constraint conflict with Arroz Branco
          nm_normalizado: normalizedName,
          nm_categoria_operacional: ficha.itemResultante.nm_categoria_operacional,
          tp_item: ficha.itemResultante.tp_item,
          cd_unidade_estoque: yieldUnitId,
          cd_unidade_uso_padrao: yieldUnitId,
          cd_restaurante: ficha.cd_restaurante,
          sn_ativo: true
        }
      });
    }

    console.log("Target Item:", {
      id: targetItem.cd_item,
      name: targetItem.nm_item,
      code: targetItem.ds_codigo_interno
    });

    // 3. Update Ficha pointing to targetItem
    const updatedFicha = await prisma.fichaTecnica.update({
      where: {
        cd_ficha_tecnica: ficha.cd_ficha_tecnica
      },
      data: {
        cd_item_resultante: targetItem.cd_item,
        nr_versao: 1, // Set to version 1 since it's the first version of this item
        tp_status: "ativa" // Activate it
      }
    });

    console.log("Updated Ficha:", {
      id: updatedFicha.cd_ficha_tecnica,
      itemResultanteId: updatedFicha.cd_item_resultante,
      version: updatedFicha.nr_versao,
      status: updatedFicha.tp_status
    });

    console.log("Database fixed successfully!");
  } catch (err) {
    console.error("Error fixing DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
