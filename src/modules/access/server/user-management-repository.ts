import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  roleCode: string | null;
  roleName: string | null;
  restaurantId?: string | null;
  restaurantName?: string | null;
}

export interface CreateUserInput {
  id?: string;
  name: string;
  email: string;
  restaurantId: string | null;
  roleCode: string;
}

export interface UpdateUserInput {
  id: string;
  name: string;
  roleCode: string;
  active: boolean;
  restaurantId?: string | null;
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

export function getUserManagementRepository() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  return {
    async listUsers(restaurantId: string | null): Promise<UserRecord[]> {
      if (!prisma) return [];
      await ensureDefaultRoles(prisma);

      // 1. Fetch from Supabase
      const { createServerSupabaseClient } = await import("@/lib/supabase");
      const supabase = createServerSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let supabaseUsers: any[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.admin.listUsers();
          if (error) throw error;
          supabaseUsers = data?.users ?? [];
        } catch (err) {
          console.error("Error fetching Supabase users in listUsers:", err);
        }
      }

      // 2. Query all local users
      const localUsers = await prisma.user.findMany({
        include: {
          roles: {
            include: { role: true },
            orderBy: { ts_atribuicao: "desc" },
            take: 1
          }
        }
      });

      // 3. Sync missing Supabase users into Prisma
      for (const su of supabaseUsers) {
        if (!su.email) continue;
        const matchingLocal = localUsers.find(
          (lu) => lu.ds_email.toLowerCase() === su.email!.toLowerCase()
        );

        const suName = su.user_metadata?.nome || su.email.split("@")[0];
        const suRoles: string[] = su.app_metadata?.roles || [];
        const suRole = suRoles[0] || "consulta";

        if (!matchingLocal) {
          try {
            const roleRecord = await prisma.role.findFirst({ where: { ds_codigo: suRole } });
            const user = await prisma.user.create({
              data: {
                cd_usuario: su.id,
                nm_usuario: suName,
                ds_email: su.email.toLowerCase().trim(),
                cd_restaurante: restaurantId || null,
                sn_ativo: true
              }
            });
            if (roleRecord) {
              await prisma.userRole.create({
                data: {
                  cd_usuario: user.cd_usuario,
                  cd_role: roleRecord.cd_role
                }
              });
            }
          } catch (createErr) {
            console.error(`Failed to auto-create missing user ${su.email} during listing:`, createErr);
          }
        } else {
          // If role changed in Supabase, sync locally
          const currentRoleCode = matchingLocal.roles[0]?.role.ds_codigo;
          if (currentRoleCode !== suRole) {
            const roleRecord = await prisma.role.findFirst({ where: { ds_codigo: suRole } });
            if (roleRecord) {
              try {
                await prisma.userRole.deleteMany({ where: { cd_usuario: matchingLocal.cd_usuario } });
                await prisma.userRole.create({
                  data: {
                    cd_usuario: matchingLocal.cd_usuario,
                    cd_role: roleRecord.cd_role
                  }
                });
              } catch (roleSyncErr) {
                console.error(`Failed to sync role for user ${su.email}:`, roleSyncErr);
              }
            }
          }
        }
      }

      // 4. Return users in the system (filtered by restaurant if applicable)
      const users = await prisma.user.findMany({
        where: restaurantId ? { cd_restaurante: restaurantId } : {},
        orderBy: { ts_criacao: "desc" },
        include: {
          restaurante: true,
          roles: {
            include: { role: true },
            orderBy: { ts_atribuicao: "desc" as const },
            take: 1
          }
        }
      });

      return users.map((u) => ({
        id: u.cd_usuario,
        name: u.nm_usuario,
        email: u.ds_email,
        active: u.sn_ativo,
        createdAt: u.ts_criacao.toISOString(),
        roleCode: u.roles[0]?.role.ds_codigo ?? null,
        roleName: u.roles[0]?.role.nm_role ?? null,
        restaurantId: u.cd_restaurante,
        restaurantName: u.restaurante?.nm_restaurante ?? null
      }));
    },

    async countActiveUsers(restaurantId: string): Promise<number> {
      if (!prisma) return 0;
      return prisma.user.count({ where: { cd_restaurante: restaurantId, sn_ativo: true } });
    },

    async createUser(input: CreateUserInput): Promise<string> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      await ensureDefaultRoles(prisma);
      const role = await prisma.role.findFirst({ where: { ds_codigo: input.roleCode } });
      if (!role) throw new Error(`Perfil "${input.roleCode}" não encontrado.`);

      const existing = await prisma.user.findUnique({ where: { ds_email: input.email.toLowerCase().trim() } });
      if (existing) throw new Error("Já existe um usuário com este e-mail.");

      const user = await prisma.user.create({
        data: {
          cd_usuario: input.id,
          nm_usuario: input.name.trim(),
          ds_email: input.email.toLowerCase().trim(),
          cd_restaurante: input.restaurantId,
          sn_ativo: true
        }
      });
      await prisma.userRole.create({
        data: { cd_usuario: user.cd_usuario, cd_role: role.cd_role }
      });
      return user.cd_usuario;
    },

    async updateUser(input: UpdateUserInput): Promise<void> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      const role = await prisma.role.findFirst({ where: { ds_codigo: input.roleCode } });
      if (!role) throw new Error(`Perfil "${input.roleCode}" não encontrado.`);

      await prisma.user.update({
        where: { cd_usuario: input.id },
        data: { 
          nm_usuario: input.name.trim(), 
          sn_ativo: input.active,
          cd_restaurante: input.restaurantId || null
        }
      });
      await prisma.userRole.deleteMany({ where: { cd_usuario: input.id } });
      await prisma.userRole.create({ data: { cd_usuario: input.id, cd_role: role.cd_role } });
    },

    async deactivateUser(userId: string): Promise<void> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      await prisma.user.update({ where: { cd_usuario: userId }, data: { sn_ativo: false } });
    },

    async findUserEmailById(userId: string): Promise<string | null> {
      if (!prisma) return null;
      const user = await prisma.user.findUnique({
        where: { cd_usuario: userId },
        select: { ds_email: true }
      });
      return user?.ds_email ?? null;
    },

    async checkUserRestaurant(userId: string): Promise<string | null> {
      if (!prisma) return null;
      const user = await prisma.user.findUnique({
        where: { cd_usuario: userId },
        select: { cd_restaurante: true }
      });
      return user?.cd_restaurante ?? null;
    },

    async deleteUser(userId: string): Promise<void> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      await prisma.userRole.deleteMany({ where: { cd_usuario: userId } });
      await prisma.user.delete({ where: { cd_usuario: userId } });
    },

    async listAllRestaurants() {
      if (!prisma) return [];
      return prisma.restaurante.findMany({
        orderBy: { nm_restaurante: "asc" }
      });
    }
  };
}
