import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { getDemoStore } from "@/modules/platform/server/demo-data";
import { type AuthUserRecord } from "@/modules/access/server/auth-service";

export function getAuthRepository() {
  return {
    async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        try {
          const user = await prisma.user.findUnique({
            where: {
              ds_email: email
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
              id: user.cd_usuario,
              email: user.ds_email,
              nome: user.nm_usuario,
              roleCodes: user.roles.map((assignment) => assignment.role.ds_codigo)
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
        roleCodes: demoUser.roleCodes
      };
    }
  };
}
