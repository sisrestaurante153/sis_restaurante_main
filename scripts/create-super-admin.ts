import * as dotenv from "dotenv";
dotenv.config();

import { getPrismaClient } from "../src/modules/platform/infra/prisma";
import { createServerSupabaseClient } from "../src/lib/supabase";

async function main() {
  const email = process.argv[2];
  const nome = process.argv[3];
  const password = process.argv[4];

  if (!email || !nome || !password) {
    console.error("Uso correto: npx tsx scripts/create-super-admin.ts <email> <nome> <senha>");
    process.exit(1);
  }

  const prisma = getPrismaClient(process.env.DATABASE_URL);
  if (!prisma) {
    console.error("Erro: Não foi possível construir o Prisma Client.");
    process.exit(1);
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("Erro: Não foi possível construir o Supabase Client.");
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    console.log(`Iniciando criação do super-admin: ${email} (${nome})...`);

    // 0. Garantir restaurante de testes "Plataforma — Testes Internos" com assinatura ativa
    console.log("Garantindo restaurante de testes 'Plataforma — Testes Internos'...");
    const restId = "rest_plataforma_testes";
    await prisma.restaurante.upsert({
      where: { cd_restaurante: restId },
      update: {
        nm_restaurante: "Plataforma — Testes Internos",
        sn_ativo: true
      },
      create: {
        cd_restaurante: restId,
        nm_restaurante: "Plataforma — Testes Internos",
        sn_ativo: true
      }
    });

    const farFuture = new Date("2099-12-31T23:59:59Z");
    await prisma.assinatura.upsert({
      where: { cd_restaurante: restId },
      update: {
        tp_plano: "enterprise",
        tp_status: "active",
        vl_mensal: 0,
        ts_proximo_vencimento: farFuture,
        ts_trial_fim: null
      },
      create: {
        cd_restaurante: restId,
        tp_plano: "enterprise",
        tp_status: "active",
        vl_mensal: 0,
        ts_proximo_vencimento: farFuture,
        ts_trial_fim: null
      }
    });

    // 1. Garantir que o perfil 'super-admin' existe no Prisma
    let roleRecord = await prisma.role.findUnique({
      where: { ds_codigo: "super-admin" }
    });

    if (!roleRecord) {
      console.log("Perfil 'super-admin' não encontrado no Prisma. Criando perfil...");
      roleRecord = await prisma.role.create({
        data: {
          ds_codigo: "super-admin",
          nm_role: "Super Administrador",
          ds_descricao: "Super Administrador com todas as permissões da plataforma"
        }
      });
    }

    // 2. Criar ou atualizar o usuário no Supabase Auth
    let userId = "";
    const { data: suUser, error: suError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: { nome: nome.trim() },
      app_metadata: { roles: ["super-admin"] }
    });

    if (suError) {
      if (suError.message.toLowerCase().includes("already registered") || suError.message.toLowerCase().includes("already exists")) {
        console.log("Usuário já existe no Supabase Auth. Buscando ID...");
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingSu = listData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
        );

        if (!existingSu) {
          throw new Error("Não foi possível encontrar o usuário existente no Supabase Auth.");
        }

        userId = existingSu.id;
        console.log(`Usuário encontrado no Supabase (ID: ${userId}). Atualizando app_metadata...`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: { roles: ["super-admin"] }
        });
        if (updateError) throw updateError;
      } else {
        throw suError;
      }
    } else {
      userId = suUser.user.id;
      console.log(`Usuário criado com sucesso no Supabase Auth (ID: ${userId})`);
    }

    // 3. Upsert do usuário no Prisma
    console.log("Salvando usuário no banco de dados local (Prisma)...");
    const prismaUser = await prisma.user.upsert({
      where: { cd_usuario: userId },
      update: {
        nm_usuario: nome.trim(),
        ds_email: email.toLowerCase().trim(),
        sn_ativo: true,
        cd_restaurante: restId
      },
      create: {
        cd_usuario: userId,
        nm_usuario: nome.trim(),
        ds_email: email.toLowerCase().trim(),
        sn_ativo: true,
        cd_restaurante: restId
      }
    });

    // 4. Vincular o usuário ao papel 'super-admin'
    await prisma.userRole.deleteMany({
      where: { cd_usuario: userId }
    });

    await prisma.userRole.create({
      data: {
        cd_usuario: userId,
        cd_role: roleRecord.cd_role
      }
    });

    console.log(`🚀 Super-admin ${email} criado e vinculado com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao criar super-admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
