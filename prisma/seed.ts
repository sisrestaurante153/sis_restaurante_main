// @ts-nocheck
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  FichaStatus,
  ItemType,
  ModoRendimento,
  PrismaClient,
  TipoComponente,
  UnidadeTipo
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/modules/access/server/auth-service";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada para executar o seed.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  const permissions = [
    { codigo: "item.read", nome: "Ler itens" },
    { codigo: "item.write", nome: "Editar itens" },
    { codigo: "ficha.read", nome: "Ler fichas" },
    { codigo: "ficha.write", nome: "Editar fichas" },
    { codigo: "impact.read", nome: "Consultar impacto de custo" },
    { codigo: "import.run", nome: "Executar importacao" }
  ];

  const roles = [
    {
      codigo: "admin",
      nome: "Administrador",
      permissionCodes: permissions.map((permission) => permission.codigo)
    },
    {
      codigo: "engenharia",
      nome: "Engenharia de Produto",
      permissionCodes: [
        "item.read",
        "item.write",
        "ficha.read",
        "ficha.write",
        "impact.read"
      ]
    },
    {
      codigo: "consulta",
      nome: "Consulta",
      permissionCodes: ["item.read", "ficha.read", "impact.read"]
    }
  ];

  const units = [
    { codigo: "kg", nome: "Quilograma", tipo: UnidadeTipo.massa },
    { codigo: "g", nome: "Grama", tipo: UnidadeTipo.massa },
    { codigo: "l", nome: "Litro", tipo: UnidadeTipo.volume },
    { codigo: "ml", nome: "Mililitro", tipo: UnidadeTipo.volume },
    { codigo: "un", nome: "Unidade", tipo: UnidadeTipo.contagem }
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { codigo: permission.codigo },
      update: permission,
      create: permission
    });
  }

  for (const role of roles) {
    await prisma.role.upsert({
      where: { codigo: role.codigo },
      update: {
        nome: role.nome
      },
      create: {
        codigo: role.codigo,
        nome: role.nome
      }
    });
  }

  for (const unit of units) {
    await prisma.unidadeMedida.upsert({
      where: { codigo: unit.codigo },
      update: unit,
      create: unit
    });
  }

  for (const role of roles) {
    const persistedRole = await prisma.role.findUniqueOrThrow({
      where: { codigo: role.codigo }
    });

    for (const permissionCode of role.permissionCodes) {
      const persistedPermission = await prisma.permission.findUniqueOrThrow({
        where: { codigo: permissionCode }
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: persistedRole.id,
            permissionId: persistedPermission.id
          }
        },
        update: {},
        create: {
          roleId: persistedRole.id,
          permissionId: persistedPermission.id
        }
      });
    }
  }

  const unidadeKg = await prisma.unidadeMedida.findUniqueOrThrow({
    where: { codigo: "kg" }
  });
  const unidadeG = await prisma.unidadeMedida.findUniqueOrThrow({
    where: { codigo: "g" }
  });
  const unidadeUn = await prisma.unidadeMedida.findUniqueOrThrow({
    where: { codigo: "un" }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { codigo: "admin" }
  });
  const engenhariaRole = await prisma.role.findUniqueOrThrow({
    where: { codigo: "engenharia" }
  });
  const consultaRole = await prisma.role.findUniqueOrThrow({
    where: { codigo: "consulta" }
  });

  const senhaAdmin = await hashPassword("admin123");
  const senhaEngenharia = await hashPassword("engenharia123");
  const senhaConsulta = await hashPassword("consulta123");

  const usuarioAdmin = await prisma.user.upsert({
    where: { email: "admin@sis-restaurante.local" },
    update: {
      nome: "Administrador Bootstrap"
    },
    create: {
      nome: "Administrador Bootstrap",
      email: "admin@sis-restaurante.local",
      senhaHash: senhaAdmin
    }
  });

  const usuarioEngenharia = await prisma.user.upsert({
    where: { email: "engenharia@sis-restaurante.local" },
    update: {
      nome: "Engenharia Produto"
    },
    create: {
      nome: "Engenharia Produto",
      email: "engenharia@sis-restaurante.local",
      senhaHash: senhaEngenharia
    }
  });

  const usuarioConsulta = await prisma.user.upsert({
    where: { email: "consulta@sis-restaurante.local" },
    update: {
      nome: "Consulta Operacional"
    },
    create: {
      nome: "Consulta Operacional",
      email: "consulta@sis-restaurante.local",
      senhaHash: senhaConsulta
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: usuarioAdmin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: usuarioAdmin.id,
      roleId: adminRole.id
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: usuarioEngenharia.id,
        roleId: engenhariaRole.id
      }
    },
    update: {},
    create: {
      userId: usuarioEngenharia.id,
      roleId: engenhariaRole.id
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: usuarioConsulta.id,
        roleId: consultaRole.id
      }
    },
    update: {},
    create: {
      userId: usuarioConsulta.id,
      roleId: consultaRole.id
    }
  });

  const tomate = await prisma.item.upsert({
    where: { nomeNormalizado: "tomate" },
    update: {
      nome: "Tomate"
    },
    create: {
      nome: "Tomate",
      nomeNormalizado: "tomate",
      tipoPrincipal: ItemType.insumo,
      unidadeEstoqueId: unidadeKg.id,
      unidadeUsoPadraoId: unidadeG.id
    }
  });

  const molhoBase = await prisma.item.upsert({
    where: { nomeNormalizado: "molho-base" },
    update: {
      nome: "Molho Base"
    },
    create: {
      nome: "Molho Base",
      nomeNormalizado: "molho-base",
      tipoPrincipal: ItemType.pre_preparo,
      unidadeEstoqueId: unidadeKg.id,
      unidadeUsoPadraoId: unidadeG.id
    }
  });

  const pote = await prisma.item.upsert({
    where: { nomeNormalizado: "pote-500ml" },
    update: {
      nome: "Pote 500ml"
    },
    create: {
      nome: "Pote 500ml",
      nomeNormalizado: "pote-500ml",
      tipoPrincipal: ItemType.embalagem,
      unidadeEstoqueId: unidadeUn.id,
      unidadeUsoPadraoId: unidadeUn.id
    }
  });

  await prisma.itemAlias.upsert({
    where: {
      itemId_aliasNormalizado: {
        itemId: tomate.id,
        aliasNormalizado: "tomate-italiano"
      }
    },
    update: {
      alias: "Tomate Italiano"
    },
    create: {
      itemId: tomate.id,
      alias: "Tomate Italiano",
      aliasNormalizado: "tomate-italiano",
      origem: "seed",
      confianca: "1.00"
    }
  });

  await prisma.conversaoUnidade.upsert({
    where: {
      itemId_unidadeOrigemId_unidadeDestinoId: {
        itemId: tomate.id,
        unidadeOrigemId: unidadeKg.id,
        unidadeDestinoId: unidadeG.id
      }
    },
    update: {
      fator: "1000.000000"
    },
    create: {
      itemId: tomate.id,
      unidadeOrigemId: unidadeKg.id,
      unidadeDestinoId: unidadeG.id,
      fator: "1000.000000",
      origem: "seed"
    }
  });

  const fornecedor = await prisma.fornecedor.upsert({
    where: { nome: "Fornecedor Bootstrap" },
    update: {},
    create: {
      nome: "Fornecedor Bootstrap",
      contato: "compras@sis-restaurante.local"
    }
  });

  await prisma.itemCompra.upsert({
    where: {
      itemId_fornecedorId_unidadeCompraId: {
        itemId: tomate.id,
        fornecedorId: fornecedor.id,
        unidadeCompraId: unidadeKg.id
      }
    },
    update: {
      custoCompra: "12.5000",
      custoUnitarioBase: "12.500000"
    },
    create: {
      itemId: tomate.id,
      fornecedorId: fornecedor.id,
      unidadeCompraId: unidadeKg.id,
      quantidadePorEmbalagem: "1.0000",
      custoCompra: "12.5000",
      custoUnitarioBase: "12.500000"
    }
  });

  const fichaMolho = await prisma.fichaTecnica.upsert({
    where: {
      itemResultanteId_versao: {
        itemResultanteId: molhoBase.id,
        versao: 1
      }
    },
    update: {
      status: FichaStatus.ativa
    },
    create: {
      itemResultanteId: molhoBase.id,
      versao: 1,
      status: FichaStatus.ativa,
      modoRendimento: ModoRendimento.percentual_perda,
      percentualPerda: "0.1000",
      criadaPorId: usuarioAdmin.id
    }
  });

  await prisma.fichaComponente.upsert({
    where: {
      fichaTecnicaId_ordem: {
        fichaTecnicaId: fichaMolho.id,
        ordem: 1
      }
    },
    update: {
      itemComponenteId: tomate.id
    },
    create: {
      fichaTecnicaId: fichaMolho.id,
      itemComponenteId: tomate.id,
      tipoComponente: TipoComponente.ingrediente,
      ordem: 1,
      quantidadeBruta: "1.0000",
      quantidadeLimpa: "0.9000",
      unidadeUsoId: unidadeKg.id,
      fatorCorrecao: "1.111111",
      custoUnitarioSnapshot: "12.500000",
      custoTotalSnapshot: "12.500000"
    }
  });

  await prisma.fichaComponente.upsert({
    where: {
      fichaTecnicaId_ordem: {
        fichaTecnicaId: fichaMolho.id,
        ordem: 2
      }
    },
    update: {
      itemComponenteId: pote.id
    },
    create: {
      fichaTecnicaId: fichaMolho.id,
      itemComponenteId: pote.id,
      tipoComponente: TipoComponente.embalagem,
      ordem: 2,
      quantidadeBruta: "1.0000",
      unidadeUsoId: unidadeUn.id,
      custoUnitarioSnapshot: "0.750000",
      custoTotalSnapshot: "0.750000"
    }
  });

  for (const row of [
    {
      itemAscendenteId: tomate.id,
      itemDescendenteId: tomate.id,
      profundidade: 0,
      relacaoDireta: false
    },
    {
      itemAscendenteId: molhoBase.id,
      itemDescendenteId: molhoBase.id,
      profundidade: 0,
      relacaoDireta: false
    },
    {
      itemAscendenteId: pote.id,
      itemDescendenteId: pote.id,
      profundidade: 0,
      relacaoDireta: false
    },
    {
      itemAscendenteId: molhoBase.id,
      itemDescendenteId: tomate.id,
      profundidade: 1,
      relacaoDireta: true
    },
    {
      itemAscendenteId: molhoBase.id,
      itemDescendenteId: pote.id,
      profundidade: 1,
      relacaoDireta: true
    }
  ]) {
    await prisma.dependenciaItem.upsert({
      where: {
        itemAscendenteId_itemDescendenteId: {
          itemAscendenteId: row.itemAscendenteId,
          itemDescendenteId: row.itemDescendenteId
        }
      },
      update: row,
      create: row
    });
  }

  await prisma.custoSnapshotItem.create({
    data: {
      itemId: tomate.id,
      custoUnitarioAtual: "12.500000",
      custoPorKgOuUnidadeUso: "12.500000",
      custoTotalAtual: "12.500000",
      origemRecalculo: "seed"
    }
  });

  await prisma.custoSnapshotItem.create({
    data: {
      itemId: molhoBase.id,
      custoUnitarioAtual: "14.138889",
      custoPorKgOuUnidadeUso: "14.138889",
      custoEmbalagemAtual: "0.750000",
      custoTotalAtual: "14.888889",
      origemRecalculo: "seed"
    }
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: usuarioAdmin.id,
      entidade: "ficha_tecnica",
      entidadeId: fichaMolho.id,
      acao: "seed.bootstrap",
      depoisJson: {
        fichaId: fichaMolho.id,
        itemId: molhoBase.id
      }
    }
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
