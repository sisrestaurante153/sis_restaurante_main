import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { getDemoStore } from "@/modules/platform/server/demo-data";
import { type AuthUserRecord } from "@/modules/access/server/auth-service";

export interface AuthUserWithSubscription extends AuthUserRecord {
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

export function getAuthRepository() {
  return {
    async findUserByEmail(email: string): Promise<AuthUserWithSubscription | null> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        try {
          const user = await prisma.user.findUnique({
            where: { ds_email: email },
            include: {
              roles: { include: { role: true } },
              restaurante: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                include: { assinatura: true } as any
              }
            }
          });

          if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assinatura = (user.restaurante as any)?.assinatura;
            return {
              id: user.cd_usuario,
              restaurantId: user.cd_restaurante ?? "rest_padrao",
              email: user.ds_email,
              nome: user.nm_usuario,
              roleCodes: user.roles.map((a) => a.role.ds_codigo),
              subscriptionStatus: assinatura?.tp_status ?? "active",
              trialEndsAt: assinatura?.ts_trial_fim?.toISOString() ?? null
            };
          }
        } catch {
          // Fallback para a base demo quando o banco ainda nao estiver disponivel.
        }
      }

      const demoUser = getDemoStore().users.find((u) => u.email === email);
      if (!demoUser) return null;

      return {
        id: demoUser.id,
        restaurantId: "rest_padrao",
        email: demoUser.email,
        nome: demoUser.nome,
        roleCodes: demoUser.roleCodes,
        subscriptionStatus: "active",
        trialEndsAt: null
      };
    }
  };
}
