import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  importacao_linha_status,
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
    where: { cd_conflito: conflictId }
  });

  if (!conflict) {
    throw new Error(`Conflito ${conflictId} nao encontrado.`);
  }

  const item = itemId
    ? await prisma.item.findUnique({ where: { cd_item: itemId } })
    : await prisma.item.findFirst({
        where: { nm_normalizado: itemNormalizedName! }
      });

  if (!item) {
    throw new Error("Item de destino nao encontrado.");
  }

  const aliasSource =
    explicitAlias ?? conflict.ds_nome_bruto ?? conflict.nm_normalizado;

  if (aliasSource) {
    await prisma.itemAlias.upsert({
      where: {
        cd_item_nm_alias_normalizado: {
          cd_item: item.cd_item,
          nm_alias_normalizado: normalizeAliasValue(aliasSource)
        }
      },
      update: {
        nm_alias: aliasSource,
        ds_origem: "reconciliacao_manual"
      },
      create: {
        cd_item: item.cd_item,
        nm_alias: aliasSource,
        nm_alias_normalizado: normalizeAliasValue(aliasSource),
        ds_origem: "reconciliacao_manual"
      }
    });
  }

  if (conflict.cd_staging) {
    await prisma.importacaoStaging.update({
      where: { cd_staging: conflict.cd_staging },
      data: {
        cd_item: item.cd_item,
        tp_status: importacao_linha_status.imported
      }
    });
  }

  await prisma.importacaoConflito.update({
    where: { cd_conflito: conflict.cd_conflito },
    data: {
      sn_resolvido: true,
      js_detalhes: {
        ...(typeof conflict.js_detalhes === "object" &&
        conflict.js_detalhes !== null
          ? (conflict.js_detalhes as Record<string, unknown>)
          : {}),
        resolucaoManual: {
          itemId: item.cd_item,
          itemNome: item.nm_item,
          aliasAplicado: aliasSource ?? null
        }
      }
    }
  });

  await prisma.auditoria.create({
    data: {
      nm_entidade: "importacao_conflito",
      cd_entidade: conflict.cd_conflito,
      ds_acao: "import.conflict.reconciled.via_script",
      js_depois: {
        itemId: item.cd_item,
        itemNome: item.nm_item,
        alias: aliasSource ?? null
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        conflictId: conflict.cd_conflito,
        resolved: true,
        itemId: item.cd_item,
        itemName: item.nm_item,
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
