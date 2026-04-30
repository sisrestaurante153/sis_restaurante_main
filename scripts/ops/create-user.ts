// @ts-nocheck
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/modules/access/server/auth-service";
import {
  normalizeUserEmail,
  parseRoleCodes
} from "../../src/modules/access/domain/user-management";

function readFlag(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = readFlag("--email");
  const name = readFlag("--name");
  const password = readFlag("--password");
  const roleValues = process.argv.flatMap((value, index) => {
    if (value === "--role") {
      return process.argv[index + 1] ?? "";
    }

    return [];
  });

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  if (!email || !name || !password || roleValues.length === 0) {
    throw new Error(
      "Uso: npm run ops:create-user -- --email usuario@dominio --name 'Nome' --password 'senha123' --role admin"
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  const normalizedEmail = normalizeUserEmail(email);
  const roleCodes = parseRoleCodes(roleValues);
  const active = !hasFlag("--inactive");
  const passwordHash = await hashPassword(password);

  const roles = await prisma.role.findMany({
    where: {
      codigo: {
        in: roleCodes
      }
    }
  });

  if (roles.length !== roleCodes.length) {
    const foundCodes = new Set(roles.map((role) => role.codigo));
    const missing = roleCodes.filter((roleCode) => !foundCodes.has(roleCode));
    throw new Error(`Roles nao encontrados: ${missing.join(", ")}`);
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      nome: name,
      senhaHash: passwordHash,
      ativo: active
    },
    create: {
      email: normalizedEmail,
      nome: name,
      senhaHash: passwordHash,
      ativo: active
    }
  });

  await prisma.userRole.deleteMany({
    where: {
      userId: user.id,
      role: {
        codigo: {
          notIn: roleCodes
        }
      }
    }
  });

  for (const role of roles) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id
      }
    });
  }

  await prisma.auditoria.create({
    data: {
      entidade: "user",
      entidadeId: user.id,
      acao: "user.provisioned.via_script",
      depoisJson: {
        email: user.email,
        nome: user.nome,
        ativo: user.ativo,
        roleCodes
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        id: user.id,
        email: user.email,
        nome: user.nome,
        ativo: user.ativo,
        roleCodes
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

void main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
