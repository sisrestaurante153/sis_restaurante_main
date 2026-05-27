import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { getDemoStore } from "@/modules/platform/server/demo-data";
import { type AuthUserRecord } from "@/modules/access/server/auth-service";
import type { SubscriptionStatus } from "@/modules/billing/domain/plans";

export interface AuthUserWithSubscription extends AuthUserRecord {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  nextBillingDate: string | null;
}

const DEFAULT_ROLES = [
  { ds_codigo: "super-admin", nm_role: "Super Administrador" },
  { ds_codigo: "admin",      nm_role: "Administrador"        },
  { ds_codigo: "engenharia", nm_role: "Engenharia de Produto" },
  { ds_codigo: "consulta",   nm_role: "Consulta"              },
] as const;

async function ensureDefaultRoles(prisma: NonNullable<ReturnType<typeof getPrismaClient>>) {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { ds_codigo: role.ds_codigo },
      update: {},
      create: { ds_codigo: role.ds_codigo, nm_role: role.nm_role }
    });
  }
}

export function getAuthRepository() {
  return {
    async findUserByEmail(email: string): Promise<AuthUserWithSubscription | null> {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      // 1. Fetch Supabase user and roles first to have the source of truth
      const { createServerSupabaseClient } = await import("@/lib/supabase");
      const supabase = createServerSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let supabaseUser: any = null;
      let supabaseRoles: string[] = [];
      if (supabase) {
        try {
          const { data } = await supabase.auth.admin.listUsers();
          const su = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (su) {
            supabaseUser = su;
            supabaseRoles = su.app_metadata?.roles || [];
          }
        } catch (err) {
          console.error("Error fetching Supabase user in findUserByEmail:", err);
        }
      }

      if (prisma) {
        try {
          let user = await prisma.user.findUnique({
            where: { ds_email: email.toLowerCase().trim() },
            include: {
              roles: { include: { role: true } },
              restaurante: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                include: { assinatura: true } as any
              }
            }
          });

          // 2. Auto-create user in Prisma if they exist in Supabase but not locally
          if (!user && supabaseUser) {
            const suName = supabaseUser.user_metadata?.nome || supabaseUser.email?.split("@")[0] || "Usuário";
            const suRole = supabaseRoles[0] || "consulta";

            await ensureDefaultRoles(prisma);
            const roleRecord = await prisma.role.findFirst({ where: { ds_codigo: suRole } });

            const newUser = await prisma.user.create({
              data: {
                cd_usuario: supabaseUser.id,
                nm_usuario: suName,
                ds_email: supabaseUser.email!.toLowerCase().trim(),
                cd_restaurante: "rest_padrao",
                sn_ativo: true
              }
            });

            if (roleRecord) {
              await prisma.userRole.create({
                data: {
                  cd_usuario: newUser.cd_usuario,
                  cd_role: roleRecord.cd_role
                }
              });
            }

            user = await prisma.user.findUnique({
              where: { cd_usuario: newUser.cd_usuario },
              include: {
                roles: { include: { role: true } },
                restaurante: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  include: { assinatura: true } as any
                }
              }
            });
          }

          if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assinatura = (user.restaurante as any)?.assinatura;
            const localRoles = user.roles.map((a) => a.role.ds_codigo);
            // Sincroniza e prefere as roles do Supabase como fonte de verdade
            const finalRoles = supabaseRoles.length > 0 ? supabaseRoles : localRoles.length > 0 ? localRoles : ["consulta"];

            return {
              id: user.cd_usuario,
              restaurantId: user.cd_restaurante ?? "rest_padrao",
              email: user.ds_email,
              nome: user.nm_usuario,
              roleCodes: finalRoles,
              subscriptionStatus: assinatura?.tp_status ?? "active",
              trialEndsAt: assinatura?.ts_trial_fim?.toISOString() ?? null,
              nextBillingDate: assinatura?.ts_proximo_vencimento?.toISOString() ?? null
            };
          }
        } catch (err) {
          console.error("Database lookup fallback triggered in findUserByEmail:", err);
        }
      }

      // Fallback para a base demo quando o banco ainda nao estiver disponivel.
      const demoUser = getDemoStore().users.find((u) => u.email === email);
      if (!demoUser) return null;

      const finalRoles = supabaseRoles.length > 0 ? supabaseRoles : demoUser.roleCodes;

      return {
        id: demoUser.id,
        restaurantId: "rest_padrao",
        email: demoUser.email,
        nome: demoUser.nome,
        roleCodes: finalRoles,
        subscriptionStatus: "active",
        trialEndsAt: null,
        nextBillingDate: null
      };
    }
  };
}
