import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { getDemoStore } from "@/modules/platform/server/demo-data";
import { hashPassword, type AuthUserRecord } from "@/modules/access/server/auth-service";

const demoPasswordHashes = new Map<string, Promise<string>>();

async function getDemoPasswordHash(email: string, password: string) {
  const cacheKey = `${email}:${password}`;

  if (!demoPasswordHashes.has(cacheKey)) {
    demoPasswordHashes.set(cacheKey, hashPassword(password));
  }

  return demoPasswordHashes.get(cacheKey)!;
}

export function getAuthRepository() {
  return {
    async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        try {
          const user = await prisma.user.findUnique({
            where: {
              email
            },
            include: {
              roles: {
                include: {
                  role: true
                }
              }
            }
          });

          if (user) {
            return {
              id: user.id,
              email: user.email,
              nome: user.nome,
              ativo: user.ativo,
              senhaHash: user.senhaHash,
              roleCodes: user.roles.map((assignment) => assignment.role.codigo)
            };
          }
        } catch {
          // Fallback para a base demo quando o banco ainda nao estiver disponivel.
        }
      }

      const demoUser = getDemoStore().users.find((user) => user.email === email);

      if (!demoUser) {
        return null;
      }

      return {
        id: demoUser.id,
        email: demoUser.email,
        nome: demoUser.nome,
        ativo: demoUser.ativo,
        senhaHash: await getDemoPasswordHash(demoUser.email, demoUser.password),
        roleCodes: demoUser.roleCodes
      };
    }
  };
}
