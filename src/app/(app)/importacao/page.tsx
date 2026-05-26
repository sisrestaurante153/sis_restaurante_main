import { requirePermission } from "@/modules/access/server/authorization";
import {
  buildImportDashboardSnapshot,
  getImportFeedbackMessage
} from "@/modules/import/server/import-execution-presenter";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { ImportWorkspace } from "@/modules/import/ui/import-workspace";

type SearchParams = Promise<{
  created?: string;
  error?: string;
  execucao?: string;
  operational?: string;
  success?: string;
  cancelled?: string;
}>;

export default async function ImportPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await requirePermission("import.read");

  const repository = getImportRepository(session.restaurantId);
  const [activeExecution, history, params] = await Promise.all([
    repository.getActiveImportExecution(),
    repository.listImportExecutions({ limit: 20 }),
    searchParams ?? Promise.resolve({})
  ]);
  const dashboard = buildImportDashboardSnapshot({
    activeExecution,
    history
  });
  const feedback = getImportFeedbackMessage(params ?? {});

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          FERRAMENTAS DE DADOS
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Área de Importação
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Envie planilhas do legado ou do operacional e acompanhe as execuções de importação do catálogo de itens.
        </p>
      </div>

      <ImportWorkspace initialDashboard={dashboard} feedback={feedback} />
    </div>
  );
}
