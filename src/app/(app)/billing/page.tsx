import { requirePermission } from "@/modules/access/server/authorization";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { BillingActionsMenu } from "./billing-actions-menu";
import { BillingSubscriptionList } from "./billing-subscription-list";
import type { SubscriptionRow } from "./billing-subscription-list";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";

// ---------------------------------------------------------------------------
// Helpers de estilo
// ---------------------------------------------------------------------------

type PlanCode = "starter" | "pro" | "enterprise";

const PLAN_LABEL: Record<PlanCode, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise"
};

const PLAN_STYLE: Record<PlanCode, string> = {
  starter: "bg-orange-50 text-orange-700 border border-orange-200",
  pro: "bg-blue-50 text-blue-700 border border-blue-200",
  enterprise: "bg-purple-50 text-purple-700 border border-purple-200"
};

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-success-bg text-success",
  RECEIVED: "bg-success-bg text-success",
  OVERDUE: "bg-error/10 text-error",
  PENDING: "bg-warning-bg text-warning",
  REFUNDED: "bg-ink-100 text-ink-500"
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Pago",
  RECEIVED: "Recebido",
  OVERDUE: "Vencido",
  PENDING: "Pendente",
  REFUNDED: "Estornado"
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BillingPage() {
  await requirePermission("billing.manage");

  const repo = getBillingRepository();
  const [subscriptions, payments] = await Promise.all([
    repo.listSubscriptions(),
    repo.listPayments()
  ]);

  const totalActive = subscriptions.filter((s) => s.status === "active").length;
  const totalTrial = subscriptions.filter((s) => s.status === "trial").length;
  const totalOverdue = subscriptions.filter((s) => s.status === "overdue").length;
  const mrr = subscriptions
    .filter((s) => s.status === "active" || s.status === "overdue")
    .reduce((sum, s) => sum + s.monthlyValue, 0);

  const overdueList = subscriptions.filter((s) => s.status === "overdue");

  // Mapeia para o formato esperado pelo BillingSubscriptionList
  const subscriptionRows: SubscriptionRow[] = subscriptions.map((s) => ({
    id: s.id,
    name: s.restaurantName,
    plan: PLAN_LABEL[s.plan] as SubscriptionRow["plan"],
    status: s.status as SubscriptionRow["status"],
    nextBillingDate: s.nextBillingDate ?? "—",
    monthlyValue: s.monthlyValue,
    daysOverdue: s.daysOverdue,
    trialEndsAt: s.trialEndsAt ?? undefined
  }));

  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* Header */}
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          ADMINISTRAÇÃO
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Assinaturas & Faturamento
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Controle total sobre as assinaturas ativas, histórico de cobranças e gestão de inadimplência dos tenants.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm">
          <div className="text-2xl font-bold font-display text-blue-900">{subscriptions.length}</div>
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mt-1">Total tenants</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm">
          <div className="text-2xl font-bold font-display text-success">{totalActive}</div>
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mt-1">Assinaturas ativas</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm">
          <div className="text-2xl font-bold font-display text-error">{totalOverdue}</div>
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mt-1">Inadimplentes</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm">
          <div className="text-2xl font-bold font-display text-blue-900">{formatCurrency(mrr)}</div>
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mt-1">MRR</div>
          <div className="text-[10px] text-ink-400 mt-0.5">{totalTrial} em trial</div>
        </div>
      </div>

      {/* Relatório de Inadimplência */}
      {overdueList.length > 0 && (
        <div className="bg-white rounded-2xl border border-error/30 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-100 flex items-center gap-2">
            <ErrorRoundedIcon className="text-error" fontSize="small" />
            <h2 className="font-display font-semibold text-base text-blue-900">
              Relatório de Inadimplência
            </h2>
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-error/10 text-error">
              {overdueList.length} em aberto
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Plano</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Valor/mês</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider text-right">Dias em aberto</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {overdueList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-error/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-blue-900">{sub.restaurantName}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLE[sub.plan]}`}>
                        {PLAN_LABEL[sub.plan]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-ink-700">{formatCurrency(sub.monthlyValue)}</td>
                    <td className="px-4 py-4 text-ink-600">{sub.nextBillingDate ?? "—"}</td>
                    <td className="px-4 py-4 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-error">
                        <ErrorRoundedIcon sx={{ fontSize: 14 }} />
                        {sub.daysOverdue} dias
                      </span>
                    </td>
                    <td className="px-2 py-4">
                      <BillingActionsMenu
                        tenantName={sub.restaurantName}
                        status={sub.status}
                        currentMonthlyValue={sub.monthlyValue}
                        onPriceChange={() => {}}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Assinaturas */}
      <BillingSubscriptionList subscriptions={subscriptionRows} />

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100">
          <h2 className="font-display font-semibold text-base text-blue-900">Histórico de Pagamentos</h2>
          <p className="text-xs text-ink-400 mt-0.5">Detalhamento de cobranças por tenant — sincronizado via webhook Asaas.</p>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-ink-400">
            Nenhum pagamento registrado ainda. Os dados aparecerão aqui após a integração Asaas ser ativada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Plano</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Forma</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-ink-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-blue-900">{pay.tenant}</td>
                    <td className="px-4 py-4 text-ink-600 tabular-nums">{pay.dueDate}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLE[pay.plan]}`}>
                        {PLAN_LABEL[pay.plan]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-ink-500 text-xs">
                      {pay.paymentMethod === "CREDIT_CARD" ? "Cartão" : pay.paymentMethod === "PIX" ? "Pix" : "—"}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-ink-800 tabular-nums">
                      {formatCurrency(pay.value)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_STATUS_STYLE[pay.status] ?? "bg-ink-100 text-ink-500"}`}>
                        {PAYMENT_STATUS_LABEL[pay.status] ?? pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
