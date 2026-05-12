"use client";

import { useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import { BillingActionsMenu } from "./billing-actions-menu";

type PlanCode = "Starter" | "Pro" | "Enterprise";
type StatusCode = "active" | "trial" | "overdue" | "cancelled";

export interface SubscriptionRow {
  id: string;
  name: string;
  plan: PlanCode;
  status: StatusCode;
  nextBillingDate: string;
  monthlyValue: number;
  daysOverdue: number;
  trialEndsAt?: string;
}

const PLAN_STYLE: Record<PlanCode, string> = {
  Starter: "bg-orange-50 text-orange-700 border border-orange-200",
  Pro: "bg-blue-50 text-blue-700 border border-blue-200",
  Enterprise: "bg-purple-50 text-purple-700 border border-purple-200"
};

const STATUS_STYLE: Record<StatusCode, string> = {
  active: "bg-success-bg text-success border border-success/20",
  trial: "bg-blue-50 text-blue-600 border border-blue-200",
  overdue: "bg-error/10 text-error border border-error/20",
  cancelled: "bg-ink-100 text-ink-500 border border-ink-200"
};

const STATUS_LABEL: Record<StatusCode, string> = {
  active: "Ativa",
  trial: "Trial",
  overdue: "Inadimplente",
  cancelled: "Cancelada"
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface BillingSubscriptionListProps {
  subscriptions: SubscriptionRow[];
}

export function BillingSubscriptionList({ subscriptions }: BillingSubscriptionListProps) {
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  function getPrice(sub: SubscriptionRow) {
    return priceOverrides[sub.id] ?? sub.monthlyValue;
  }

  function handlePriceChange(id: string, newValue: number) {
    setPriceOverrides((prev) => ({ ...prev, [id]: newValue }));
  }

  return (
    <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-ink-100">
        <h2 className="font-display font-semibold text-base text-blue-900">Lista de Assinaturas</h2>
        <p className="text-xs text-ink-400 mt-0.5">
          Visão geral de todos os tenants com próxima data de cobrança.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Tenant</th>
              <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Plano</th>
              <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">Próx. cobrança</th>
              <th className="px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider text-right">Valor/mês</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {subscriptions.map((sub) => {
              const price = getPrice(sub);
              const isEdited = priceOverrides[sub.id] !== undefined;
              return (
                <tr key={sub.id} className="hover:bg-ink-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-blue-900">{sub.name}</span>
                    {sub.trialEndsAt && (
                      <span className="ml-2 text-[10px] text-blue-500">
                        trial até {sub.trialEndsAt}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLE[sub.plan]}`}>
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[sub.status]}`}>
                      {sub.status === "active" && <CheckCircleRoundedIcon sx={{ fontSize: 12 }} />}
                      {sub.status === "trial" && <AccessTimeRoundedIcon sx={{ fontSize: 12 }} />}
                      {sub.status === "overdue" && <ErrorRoundedIcon sx={{ fontSize: 12 }} />}
                      {sub.status === "cancelled" && <CancelRoundedIcon sx={{ fontSize: 12 }} />}
                      {STATUS_LABEL[sub.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-ink-600">{sub.nextBillingDate}</td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-ink-800 tabular-nums">
                      {formatCurrency(price)}
                    </span>
                    {isEdited && (
                      <span className="ml-2 text-[10px] text-orange-500 font-semibold">editado</span>
                    )}
                  </td>
                  <td className="px-2 py-4">
                    <BillingActionsMenu
                      tenantName={sub.name}
                      status={sub.status}
                      currentMonthlyValue={price}
                      onPriceChange={(v) => handlePriceChange(sub.id, v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
