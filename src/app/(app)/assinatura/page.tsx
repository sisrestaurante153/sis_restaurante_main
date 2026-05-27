import { requireSession } from "@/modules/access/server/session-cookie";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { PLANS } from "@/modules/billing/domain/plans";
import { AtivarAssinaturaForm } from "./ativar-form";
import Link from "next/link";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default async function AssinaturaPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const isBlockedUrl = searchParams.blocked === "1";

  const repo = getBillingRepository();
  const subscription = await repo.getSubscriptionByRestaurant(session.restaurantId);

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <BlockRoundedIcon sx={{ fontSize: 48, color: "error.main" }} />
        <h1 className="text-xl font-bold text-blue-900">Nenhuma assinatura encontrada</h1>
        <p className="text-sm text-ink-500">Entre em contato com o suporte.</p>
      </div>
    );
  }

  const plan = PLANS[subscription.plan];
  const trialDaysLeft = daysUntil(subscription.trialEndsAt);
  const isTrialExpired = subscription.status === "trial" && trialDaysLeft === 0;
  const isActive = subscription.status === "active";
  const isOverdue = subscription.status === "overdue";
  const isBlocked = subscription.status === "cancelled" || subscription.status === "suspended" || subscription.status === "bloqueada" || subscription.status === "expirada" || isTrialExpired;

  // Super Admin vê o painel de billing completo (exceto se vier bloqueado ou se precisar ativar)
  if (session.roleCodes.includes("super-admin") && !isBlockedUrl && isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-ink-500 text-sm">Administradores gerenciam assinaturas em</p>
        <Link
          href="/billing"
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Painel de Faturamento →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">Minha Assinatura</h1>
        <p className="text-ink-500 text-sm">Gerencie seu plano e forma de pagamento.</p>
      </div>

      {/* Banner de Bloqueio */}
      {isBlockedUrl && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl mt-1">
              <BlockRoundedIcon />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-1">
                Acesso Bloqueado
              </h2>
              <p className="text-sm text-red-700 mb-4">
                {subscription.status === "trial" || isTrialExpired ? (
                  `Seu período de teste de 14 dias encerrou em ${formatDate(subscription.trialEndsAt)}.`
                ) : (
                  `Sua assinatura venceu em ${formatDate(subscription.nextBillingDate || subscription.trialEndsAt)}. Renove para continuar acessando o sistema.`
                )}
              </p>
              
              <div className="border-t border-red-200/60 pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-xs text-red-800">
                  <div>
                    <span className="block font-medium text-red-600 uppercase tracking-wider text-[10px]">Plano Atual</span>
                    <span className="font-semibold text-sm">{plan?.label ?? "—"}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-red-600 uppercase tracking-wider text-[10px]">Data de Vencimento</span>
                    <span className="font-semibold text-sm">
                      {formatDate(subscription.nextBillingDate || subscription.trialEndsAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="#ativacao-secao"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  Renovar agora
                </Link>
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 text-sm font-semibold rounded-xl transition-colors"
                >
                  Falar com suporte
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-2xl border p-6 ${
        isActive ? "border-success/30 bg-success-bg/40" :
        isOverdue ? "border-warning/30 bg-warning-bg/40" :
        isBlocked ? "border-error/30 bg-error/5" :
        "border-blue-200 bg-blue-50/40"
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {isActive && <CheckCircleRoundedIcon sx={{ color: "success.main" }} />}
          {(isOverdue || (!isActive && !isBlocked)) && <WarningAmberRoundedIcon sx={{ color: "warning.main" }} />}
          {isBlocked && <BlockRoundedIcon sx={{ color: "error.main" }} />}
          <div>
            <div className="font-semibold text-blue-900">
              {isActive && "Assinatura ativa"}
              {isOverdue && "Pagamento em atraso"}
              {isTrialExpired && "Trial encerrado"}
              {subscription.status === "trial" && !isTrialExpired && `Trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? "dia restante" : "dias restantes"}`}
              {subscription.status === "cancelled" && "Assinatura cancelada"}
              {subscription.status === "suspended" && "Acesso suspenso"}
              {subscription.status === "bloqueada" && "Assinatura bloqueada"}
              {subscription.status === "expirada" && "Assinatura expirada"}
            </div>
            <div className="text-sm text-ink-500 mt-0.5">
              Plano <span className="font-semibold">{plan?.label ?? "—"}</span> · R$ {subscription.monthlyValue.toFixed(2).replace(".", ",")}/mês
            </div>
          </div>
        </div>

        {isActive && subscription.nextBillingDate && (
          <p className="text-sm text-ink-600">
            Próxima cobrança: <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
          </p>
        )}

        {isOverdue && (
          <p className="text-sm text-warning font-medium">
            {subscription.daysOverdue} {subscription.daysOverdue === 1 ? "dia" : "dias"} em atraso — regularize para evitar suspensão.
          </p>
        )}
      </div>

      {/* Formulário de ativação — exibido se não estiver ativo */}
      {!isActive && (
        <div id="ativacao-secao" className="bg-white rounded-2xl border border-ink-200 shadow-sm p-6">
          <h2 className="font-display font-semibold text-lg text-blue-900 mb-1">
            {isBlocked ? "Reativar assinatura" : "Ativar assinatura"}
          </h2>
          <p className="text-sm text-ink-500 mb-6">
            {subscription.status === "trial" && !isTrialExpired
              ? `Seu trial termina em ${trialDaysLeft} dias. Ative agora para garantir acesso contínuo.`
              : "Informe seus dados para ativar a cobrança recorrente via Asaas."}
          </p>
          <AtivarAssinaturaForm
            subscriptionId={subscription.id}
            email={session.email}
            planLabel={plan?.label ?? "—"}
            monthlyValue={subscription.monthlyValue}
          />
        </div>
      )}

      {/* Planos disponíveis */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm p-6">
        <h2 className="font-display font-semibold text-base text-blue-900 mb-4">Planos disponíveis</h2>
        <div className="flex flex-col gap-3">
          {Object.values(PLANS).map((p) => (
            <div
              key={p.code}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                p.code === subscription.plan
                  ? "border-blue-400 bg-blue-50"
                  : "border-ink-200"
              }`}
            >
              <div>
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  {p.label}
                  {p.code === subscription.plan && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">atual</span>
                  )}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">{p.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-900">R$ {p.monthlyValue}/mês</div>
                <div className="text-xs text-ink-400">
                  {p.limits.users === 9999 ? "Ilimitado" : `${p.limits.users} usuários`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
