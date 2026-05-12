import { requirePermission } from "@/modules/access/server/authorization";
import { BillingActionsMenu } from "./billing-actions-menu";
import { BillingSubscriptionList } from "./billing-subscription-list";
import type { SubscriptionRow } from "./billing-subscription-list";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";

// ---------------------------------------------------------------------------
// Mock data — substituir por repositório real quando billing for implementado
// ---------------------------------------------------------------------------

type PlanCode = "Starter" | "Pro" | "Enterprise";

interface Payment {
  id: string;
  tenant: string;
  date: string;
  value: number;
  plan: PlanCode;
  status: "paid" | "failed" | "pending";
}

const subscriptions: SubscriptionRow[] = [
  { id: "rest_001", name: "Restaurante Bella Italia", plan: "Pro", status: "active", nextBillingDate: "2026-06-11", monthlyValue: 299, daysOverdue: 0 },
  { id: "rest_002", name: "Pizzaria do João", plan: "Starter", status: "trial", nextBillingDate: "2026-05-18", monthlyValue: 99, daysOverdue: 0, trialEndsAt: "2026-05-18" },
  { id: "rest_003", name: "Churrascaria Gaúcha", plan: "Pro", status: "overdue", nextBillingDate: "2026-04-11", monthlyValue: 299, daysOverdue: 30 },
  { id: "rest_004", name: "Sushi House", plan: "Enterprise", status: "active", nextBillingDate: "2026-06-15", monthlyValue: 599, daysOverdue: 0 },
  { id: "rest_005", name: "Café da Manhã Feliz", plan: "Starter", status: "overdue", nextBillingDate: "2026-04-25", monthlyValue: 99, daysOverdue: 16 },
  { id: "rest_006", name: "Bistrô Francês", plan: "Pro", status: "cancelled", nextBillingDate: "—", monthlyValue: 299, daysOverdue: 0 }
];

const payments: Payment[] = [
  { id: "pay_001", tenant: "Restaurante Bella Italia", date: "2026-05-11", value: 299, plan: "Pro", status: "paid" },
  { id: "pay_002", tenant: "Sushi House", date: "2026-05-10", value: 599, plan: "Enterprise", status: "paid" },
  { id: "pay_003", tenant: "Churrascaria Gaúcha", date: "2026-04-11", value: 299, plan: "Pro", status: "failed" },
  { id: "pay_004", tenant: "Pizzaria do João", date: "2026-04-15", value: 99, plan: "Starter", status: "paid" },
  { id: "pay_005", tenant: "Café da Manhã Feliz", date: "2026-04-25", value: 99, plan: "Starter", status: "failed" },
  { id: "pay_006", tenant: "Bistrô Francês", date: "2026-04-30", value: 299, plan: "Pro", status: "paid" }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_STYLE: Record<PlanCode, string> = {
  Starter: "bg-orange-50 text-orange-700 border border-orange-200",
  Pro: "bg-blue-50 text-blue-700 border border-blue-200",
  Enterprise: "bg-purple-50 text-purple-700 border border-purple-200"
};

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  paid: "bg-success-bg text-success",
  failed: "bg-error/10 text-error",
  pending: "bg-warning-bg text-warning"
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  failed: "Falhou",
  pending: "Pendente"
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BillingPage() {
  await requirePermission("billing.manage");

  const totalActive = subscriptions.filter((s) => s.status === "active").length;
  const totalTrial = subscriptions.filter((s) => s.status === "trial").length;
  const totalOverdue = subscriptions.filter((s) => s.status === "overdue").length;
  const mrr = subscriptions
    .filter((s) => s.status === "active" || s.status === "overdue")
    .reduce((sum, s) => sum + s.monthlyValue, 0);

  const overdueList = subscriptions.filter((s) => s.status === "overdue");

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
                    <td className="px-6 py-4 font-semibold text-blue-900">{sub.name}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLE[sub.plan]}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-ink-700">{formatCurrency(sub.monthlyValue)}</td>
                    <td className="px-4 py-4 text-ink-600">{sub.nextBillingDate}</td>
                    <td className="px-4 py-4 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-error">
                        <ErrorRoundedIcon sx={{ fontSize: 14 }} />
                        {sub.daysOverdue} dias
                      </span>
                    </td>
                    <td className="px-2 py-4">
                      <BillingActionsMenu
                        tenantName={sub.name}
                        status={sub.status}
                        currentMonthlyValue={sub.monthlyValue}
                        onPriceChange={undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Assinaturas — client component gerencia edições de preço */}
      <BillingSubscriptionList subscriptions={subscriptions} />

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100">
          <h2 className="font-display font-semibold text-base text-blue-900">Histórico de Pagamentos</h2>
          <p className="text-xs text-ink-400 mt-0.5">Detalhamento de cobranças por tenant.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Plano</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider text-right">Valor</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-ink-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-blue-900">{pay.tenant}</td>
                  <td className="px-4 py-4 text-ink-600 tabular-nums">{pay.date}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLE[pay.plan]}`}>
                      {pay.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-ink-800 tabular-nums">
                    {formatCurrency(pay.value)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_STATUS_STYLE[pay.status]}`}>
                      {PAYMENT_STATUS_LABEL[pay.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
