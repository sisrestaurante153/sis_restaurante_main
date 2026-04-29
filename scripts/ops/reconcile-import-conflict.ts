import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ImportacaoLinhaStatus,
  PrismaClient
} from "../../src/generated/prisma/client";
import { normalizeAliasValue } from "../../src/modules/import/domain/reconciliation";

function readFlag(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const conflictId = readFlag("--conflict-id");
  const itemId = readFlag("--item-id");
  const itemNormalizedName = readFlag("--item-normalized-name");
  const explicitAlias = readFlag("--alias");

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  if (!conflictId || (!itemId && !itemNormalizedName)) {
    throw new Error(
      "Uso: npm run ops:reconcile-conflict -- --conflict-id <id> (--item-id <id> | --item-normalized-name <nome>) [--alias 'Nome alternativo']"
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  const conflict = await prisma.importacaoConflito.findUnique({
    where: { id: conflictId }
  });

  if (!conflict) {
    throw new Error(`Conflito ${conflictId} nao encontrado.`);
  }

  const item = itemId
    ? await prisma.item.findUnique({ where: { id: itemId } })
    : await prisma.item.findUnique({
        where: { nomeNormalizado: itemNormalizedName! }
      });

  if (!item) {
    throw new Error("Item de destino nao encontrado.");
  }

  const aliasSource =
    explicitAlias ?? conflict.rawName ?? conflict.normalizedName;

  if (aliasSource) {
    await prisma.itemAlias.upsert({
      where: {
        itemId_aliasNormalizado: {
          itemId: item.id,
          aliasNormalizado: normalizeAliasValue(aliasSource)
        }
      },
      update: {
        alias: aliasSource,
        origem: "reconciliacao_manual"
      },
      create: {
        itemId: item.id,
        alias: aliasSource,
        aliasNormalizado: normalizeAliasValue(aliasSource),
        origem: "reconciliacao_manual"
      }
    });
  }

  if (conflict.stagingId) {
    await prisma.importacaoStaging.update({
      where: { id: conflict.stagingId },
      data: {
        itemId: item.id,
        status: ImportacaoLinhaStatus.imported
      }
    });
  }

  await prisma.importacaoConflito.update({
    where: { id: conflict.id },
    data: {
      resolvido: true,
      detalhesJson: {
        ...(typeof conflict.detalhesJson === "object" &&
        conflict.detalhesJson !== null
          ? (conflict.detalhesJson as Record<string, unknown>)
          : {}),
        resolucaoManual: {
          itemId: item.id,
          itemNome: item.nome,
          aliasAplicado: aliasSource ?? null
        }
      }
    }
  });

  await prisma.auditoria.create({
    data: {
      entidade: "importacao_conflito",
      entidadeId: conflict.id,
      acao: "import.conflict.reconciled.via_script",
      depoisJson: {
        itemId: item.id,
        itemNome: item.nome,
        alias: aliasSource ?? null
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        conflictId: conflict.id,
        resolved: true,
        itemId: item.id,
        itemName: item.nome,
        alias: aliasSource ?? null
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
