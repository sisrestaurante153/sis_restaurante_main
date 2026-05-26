import * as dotenv from "dotenv";
dotenv.config();

import { getPrismaClient } from "../src/modules/platform/infra/prisma";
import { createServerSupabaseClient } from "../src/lib/supabase";

async function main() {
  const prisma = getPrismaClient(process.env.DATABASE_URL);
  if (!prisma) {
    console.error("Could not construct Prisma Client");
    return;
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    console.error("Could not construct Supabase client");
    return;
  }

  try {
    console.log("Starting user synchronization from Supabase Auth to Prisma...");

    // 1. Fetch Supabase users
    const { data: { users: supabaseUsers }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Error listing Supabase users:", error);
      return;
    }

    console.log(`Found ${supabaseUsers.length} users in Supabase Auth.`);

    // Ensure roles are seeded
    const defaultRoles = [
      { codigo: "admin", nome: "Administrador" },
      { codigo: "engenharia", nome: "Engenharia de Produto" },
      { codigo: "consulta", nome: "Consulta" }
    ];
    for (const r of defaultRoles) {
      await prisma.role.upsert({
        where: { ds_codigo: r.codigo },
        update: {},
        create: { ds_codigo: r.codigo, nm_role: r.nome }
      });
    }

    // Default restaurant ID if none is set
    const defaultRestaurant = "rest_padrao";
    // Ensure default restaurant exists
    await prisma.restaurante.upsert({
      where: { cd_restaurante: defaultRestaurant },
      update: {},
      create: { cd_restaurante: defaultRestaurant, nm_restaurante: "Restaurante Padrão" }
    });

    for (const su of supabaseUsers) {
      if (!su.email) continue;
      const emailLower = su.email.toLowerCase().trim();
      const suName = su.user_metadata?.nome || emailLower.split("@")[0];
      const suRoles: string[] = su.app_metadata?.roles || [];
      const suRole = suRoles[0] || "consulta";

      console.log(`Processing user: ${emailLower} (Supabase ID: ${su.id}, Role: ${suRole})`);

      // Find local user by email (case-insensitive)
      const matchingLocal = await prisma.user.findUnique({
        where: { ds_email: emailLower },
        include: {
          roles: {
            include: { role: true }
          }
        }
      });

      const roleRecord = await prisma.role.findFirst({ where: { ds_codigo: suRole } });
      if (!roleRecord) {
        console.error(`Role record not found for ds_codigo: ${suRole}`);
        continue;
      }

      if (!matchingLocal) {
        // User does not exist in Prisma, create them with their Supabase ID
        console.log(`- Creating new user in Prisma with ID: ${su.id}`);
        const user = await prisma.user.create({
          data: {
            cd_usuario: su.id,
            nm_usuario: suName,
            ds_email: emailLower,
            cd_restaurante: defaultRestaurant,
            sn_ativo: true
          }
        });
        await prisma.userRole.create({
          data: {
            cd_usuario: user.cd_usuario,
            cd_role: roleRecord.cd_role
          }
        });
        console.log(`- Created successfully.`);
      } else {
        // User exists in Prisma. Check if ID needs updating to match Supabase ID
        let currentId = matchingLocal.cd_usuario;
        if (currentId !== su.id) {
          console.log(`- ID Mismatch: Updating ID from ${currentId} to ${su.id}...`);
          
          // Delete UserRole first to avoid FK constraint violation
          await prisma.userRole.deleteMany({
            where: { cd_usuario: currentId }
          });

          // Update the primary key using raw SQL
          await prisma.$executeRawUnsafe(
            `UPDATE usuario SET cd_usuario = $1 WHERE cd_usuario = $2`,
            su.id, currentId
          );

          // Re-create UserRole with the new user ID
          await prisma.userRole.create({
            data: {
              cd_usuario: su.id,
              cd_role: roleRecord.cd_role
            }
          });

          currentId = su.id;
        }

        // Update fields if different
        const needsNameUpdate = matchingLocal.nm_usuario !== suName;
        const currentRoleCode = matchingLocal.roles[0]?.role.ds_codigo;
        const needsRoleUpdate = currentRoleCode !== suRole;

        if (needsNameUpdate) {
          console.log(`- Updating name from "${matchingLocal.nm_usuario}" to "${suName}"`);
          await prisma.user.update({
            where: { cd_usuario: currentId },
            data: { nm_usuario: suName }
          });
        }

        if (needsRoleUpdate) {
          console.log(`- Updating role from "${currentRoleCode}" to "${suRole}"`);
          await prisma.userRole.deleteMany({
            where: { cd_usuario: currentId }
          });
          await prisma.userRole.create({
            data: {
              cd_usuario: currentId,
              cd_role: roleRecord.cd_role
            }
          });
        }

        console.log(`- Updated/Verified successfully.`);
      }
    }

    console.log("Synchronization complete!");

  } catch (err) {
    console.error("Error during sync:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
