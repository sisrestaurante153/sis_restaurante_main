import { requirePermission } from "@/modules/access/server/authorization";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { PlanManager } from "@/modules/billing/ui/plan-manager";
import { PLANS } from "@/modules/billing/domain/plans";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

export default async function PlanosPage() {
  const session = await requireSession();
  await requirePermission("billing.manage");

  const isSuperAdmin = session.roleCodes.includes("super-admin");

  if (isSuperAdmin) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
            ADMINISTRAÇÃO DA PLATAFORMA
          </span>
          <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
            Gerenciamento de Planos (Global)
          </h1>
          <p className="text-ink-500 font-body text-sm max-w-2xl">
            Visualize, edite e crie as configurações de planos e limites da plataforma.
          </p>
        </div>

        <PlanManager />
      </div>
    );
  }

  const repo = getBillingRepository();
  const subscription = await repo.getSubscriptionByRestaurant(session.restaurantId);
  const currentPlan = subscription ? PLANS[subscription.plan] : null;

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-2xl mx-auto">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          MINHA CONTA
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Meu Plano
        </h1>
        <p className="text-ink-500 font-body text-sm">
          Visualize os detalhes do plano atual contratado pelo seu restaurante.
        </p>
      </div>

      {currentPlan ? (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-ink-100 bg-blue-50/50">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 uppercase mb-3">
              Plano Ativo
            </span>
            <h2 className="text-2xl font-display font-bold text-blue-900 mb-1">
              {currentPlan.label}
            </h2>
            <p className="text-sm text-ink-500">{currentPlan.description}</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">Valor da Assinatura</div>
              <div className="text-2xl font-bold text-blue-900">
                R$ {currentPlan.monthlyValue.toFixed(2).replace(".", ",")}
                <span className="text-sm font-normal text-ink-500">/mês</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Limites de Uso</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-ink-50 p-4 rounded-xl">
                  <div className="text-xs text-ink-500 mb-1">Usuários</div>
                  <div className="font-bold text-blue-900">
                    {currentPlan.limits.users === 9999 ? "Ilimitado" : currentPlan.limits.users}
                  </div>
                </div>
                <div className="bg-ink-50 p-4 rounded-xl">
                  <div className="text-xs text-ink-500 mb-1">Itens</div>
                  <div className="font-bold text-blue-900">{currentPlan.limits.items}</div>
                </div>
                <div className="bg-ink-50 p-4 rounded-xl">
                  <div className="text-xs text-ink-500 mb-1">Fichas</div>
                  <div className="font-bold text-blue-900">{currentPlan.limits.fichas}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-100 pt-6 flex items-center justify-between">
              <span className="text-sm text-ink-500">Deseja alterar ou expandir seus recursos?</span>
              <Link
                href="/assinatura"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                Fazer Upgrade
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-200 shadow-sm p-8 text-center">
          <p className="text-ink-500 text-sm mb-4">Nenhum plano contratado ou detectado para este restaurante.</p>
          <Link
            href="/assinatura"
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            Assinar um Plano
          </Link>
        </div>
      )}
    </div>
  );
}
