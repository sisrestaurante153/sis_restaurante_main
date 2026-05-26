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
    console.log("=== USERS IN PRISMA ===");
    const prismaUsers = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });
    for (const u of prismaUsers) {
      console.log(`- Prisma User: ID: ${u.cd_usuario}, Name: ${u.nm_usuario}, Email: ${u.ds_email}, Restaurant: ${u.cd_restaurante}, Active: ${u.sn_ativo}, Roles: ${u.roles.map(r => r.role.ds_codigo).join(", ")}`);
    }

    console.log("\n=== USERS IN SUPABASE AUTH ===");
    const { data: { users: supabaseUsers }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Error listing Supabase users:", error);
    } else {
      for (const su of supabaseUsers) {
        console.log(`- Supabase User: ID: ${su.id}, Email: ${su.email}, Name: ${su.user_metadata?.nome}, Roles: ${su.app_metadata?.roles}`);
      }
    }

    console.log("\n=== DISCREPANCIES / ORPHANS ===");
    if (supabaseUsers) {
      for (const su of supabaseUsers) {
        const matchingPrisma = prismaUsers.find(pu => pu.ds_email.toLowerCase() === su.email?.toLowerCase());
        if (!matchingPrisma) {
          console.log(`- Orphan (in Supabase but NOT Prisma): ${su.email} (ID: ${su.id}, Name: ${su.user_metadata?.nome})`);
        }
      }
    }

    console.log("\n=== RESTAURANTS ===");
    const restaurants = await prisma.restaurante.findMany();
    for (const r of restaurants) {
      console.log(`- Restaurant: ID: ${r.cd_restaurante}, Name: ${r.nm_restaurante}`);
    }

  } catch (err) {
    console.error("Error running inspection:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
