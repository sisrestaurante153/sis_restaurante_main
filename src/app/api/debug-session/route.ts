import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/access/server/session-cookie";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DIAGNOSTICO TEMPORARIO - remover depois de resolver a divergencia entre
// os dados vistos pela aplicacao em producao e os do banco. Nao expoe
// credenciais: so o restaurantId da sessao e contagens agregadas.
export async function GET() {
  const session = await getCurrentSession();
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!session) {
    return NextResponse.json({ error: "sem sessao" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "sem prisma (DATABASE_URL vazio)" }, { status: 500 });
  }

  const sessionRestaurantId = session.restaurantId;

  const [restaurantes, vendasDoRestaurante, vendasOutubro, itensDoRestaurante, totalVendas] =
    await Promise.all([
      prisma.restaurante.findMany({ select: { cd_restaurante: true, nm_restaurante: true } }),
      prisma.venda.count({ where: { cd_restaurante: sessionRestaurantId } }),
      prisma.venda.count({
        where: {
          cd_restaurante: sessionRestaurantId,
          dt_venda: { gte: new Date("2026-10-01"), lte: new Date("2026-10-31") }
        }
      }),
      prisma.item.count({ where: { cd_restaurante: sessionRestaurantId } }),
      prisma.venda.count()
    ]);

  return NextResponse.json({
    sessao: {
      restaurantId: sessionRestaurantId,
      email: session.email,
      userId: session.userId
    },
    banco: {
      restaurantesExistentes: restaurantes,
      vendasDoRestauranteDaSessao: vendasDoRestaurante,
      vendasOutubro2026DoRestauranteDaSessao: vendasOutubro,
      itensDoRestauranteDaSessao: itensDoRestaurante,
      totalVendasNoBancoInteiro: totalVendas
    }
  });
}
