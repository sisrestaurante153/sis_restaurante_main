import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { requireSession } from "@/modules/access/server/session-cookie";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Link from "next/link";
import { DashboardCharts } from "./dashboard-charts";

export default async function DashboardPage() {
  const newFichaHref = "/fichas/nova";
  const newItemHref = "/itens/novo";
  const costsHref = "/custos";
  const pendingImportHref = "/importacao";
  
  const session = await requireSession();
  const catalogRepository = getCatalogRepository(session.restaurantId);
  const engineeringRepository = getEngineeringRepository(session.restaurantId);
  const importRepository = getImportRepository(session.restaurantId);
  
  const [items, fichas, conflicts, costs] = await Promise.all([
    catalogRepository.listItems({ page: 1, pageSize: 50, query: "", type: "all", status: "all" }),
    engineeringRepository.listFichas({ page: 1, pageSize: 50, query: "", status: "all" }),
    importRepository.listPendingConflicts(),
    engineeringRepository.listCostSummaries()
  ]);

  const totalCost = costs.reduce((sum, row) => sum + Number(row.total), 0).toFixed(2);
  const attentionItems = [
    conflicts.length > 0
      ? `Há ${conflicts.length} pendências abertas na fila de reconciliação manual.`
      : null,
    items.items.filter((item) => !item.fichaStatus).length > 0
      ? `${items.items.filter((item) => !item.fichaStatus).length} itens operacionais ainda sem ficha vinculada.`
      : null
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
            VISÃO GERAL
          </span>
          <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
            Dashboard Operacional
          </h1>
          <p className="text-ink-500 font-body text-sm max-w-2xl">
            Visão geral do sistema com leitura imediata de cadastro, fichas, pendências e custo consolidado.
          </p>
        </div>
        <Link 
          href={newFichaHref}
          className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm text-white"
        >
          <AddCircleOutlineRoundedIcon fontSize="small" />
          Nova Ficha
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Inventory2RoundedIcon />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-blue-900">{items.totalCount}</div>
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Itens</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <ReceiptLongRoundedIcon />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-blue-900">{fichas.totalCount}</div>
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Fichas Versionadas</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error">
            <ChecklistRoundedIcon />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-blue-900">{conflicts.length}</div>
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Pendências Import.</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-bg flex items-center justify-center text-success">
            <PaidRoundedIcon />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-blue-900">R$ {totalCost}</div>
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Custo Consolidado</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts items={items.items} costs={costs} />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atention Points */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-ink-200 shadow-sm">
          <h3 className="font-display font-semibold text-lg text-blue-900 mb-4 flex items-center gap-2">
            Pontos de Atenção
          </h3>
          
          {attentionItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {attentionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-warning-bg/50 border border-warning/20">
                  <ErrorOutlineRoundedIcon className="text-warning shrink-0 mt-0.5" fontSize="small" />
                  <span className="text-sm font-medium text-ink-800">{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success-bg border border-success/20">
              <CheckCircleOutlineRoundedIcon className="text-success" />
              <span className="text-sm font-medium text-success">Nenhum ponto de atenção aberto neste momento. Tudo certo!</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-ink-200 shadow-sm">
          <h3 className="font-display font-semibold text-lg text-blue-900 mb-4">
            Ações Rápidas
          </h3>
          <div className="flex flex-col gap-3">
            <Link 
              href={newItemHref}
              className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 hover:border-blue-600 hover:bg-blue-50 transition-colors text-blue-900 font-semibold text-sm group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <AddCircleOutlineRoundedIcon fontSize="small" />
              </div>
              Novo Item
            </Link>
            
            <Link 
              href={costsHref}
              className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-blue-900 font-semibold text-sm group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <PaidRoundedIcon fontSize="small" />
              </div>
              Analisar Custos
            </Link>

            <Link 
              href={pendingImportHref}
              className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 hover:border-ink-400 hover:bg-ink-50 transition-colors text-blue-900 font-semibold text-sm group"
            >
              <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center text-ink-600 group-hover:bg-ink-600 group-hover:text-white transition-colors">
                <ChecklistRoundedIcon fontSize="small" />
              </div>
              Pendências de Importação
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
