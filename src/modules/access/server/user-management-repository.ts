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
}

export interface CreateUserInput {
  name: string;
  email: string;
  restaurantId: string;
  roleCode: string;
}

export interface UpdateUserInput {
  id: string;
  name: string;
  roleCode: string;
  active: boolean;
}

export function getUserManagementRepository() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  return {
    async listUsers(restaurantId: string): Promise<UserRecord[]> {
      if (!prisma) return [];
      const users = await prisma.user.findMany({
        where: { cd_restaurante: restaurantId },
        orderBy: { ts_criacao: "desc" },
        include: {
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
        roleName: u.roles[0]?.role.nm_role ?? null
      }));
    },

    async countActiveUsers(restaurantId: string): Promise<number> {
      if (!prisma) return 0;
      return prisma.user.count({ where: { cd_restaurante: restaurantId, sn_ativo: true } });
    },

    async createUser(input: CreateUserInput): Promise<string> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      const role = await prisma.role.findFirst({ where: { ds_codigo: input.roleCode } });
      if (!role) throw new Error(`Perfil "${input.roleCode}" não encontrado.`);

      const existing = await prisma.user.findUnique({ where: { ds_email: input.email.toLowerCase().trim() } });
      if (existing) throw new Error("Já existe um usuário com este e-mail.");

      const user = await prisma.user.create({
        data: {
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
        data: { nm_usuario: input.name.trim(), sn_ativo: input.active }
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

    async deleteUser(userId: string): Promise<void> {
      if (!prisma) throw new Error("Banco de dados não disponível.");
      await prisma.userRole.deleteMany({ where: { cd_usuario: userId } });
      await prisma.user.delete({ where: { cd_usuario: userId } });
    }
  };
}
