import Alert from "@mui/material/Alert";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { requireSession } from "@/modules/access/server/session-cookie";
import { PendingConflictsList } from "@/modules/import/ui/pending-conflicts-list";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageFeedbackSnackbar } from "@/components/ui/PageFeedbackSnackbar";

type SearchParams = Promise<{
  resolved?: string;
  error?: string;
  execucao?: string;
}>;

export default async function ImportPendingPage({ searchParams }: { searchParams?: SearchParams }) {
  const [session, params] = await Promise.all([
    requireSession(),
    searchParams ?? Promise.resolve({} as { resolved?: string; error?: string; execucao?: string })
  ]);
  const [conflicts, itemOptions] = await Promise.all([
    getImportRepository(session.restaurantId).listPendingConflicts({
      executionId: params.execucao
    }),
    getCatalogRepository(session.restaurantId).listItemOptions()
  ]);
  const feedback =
    params.resolved === "1"
      ? { severity: "success" as const, message: "Pendencia resolvida com sucesso." }
      : params.error === "resolve"
        ? { severity: "error" as const, message: "Nao foi possivel resolver a pendencia." }
        : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Importacao", href: "/importacao" },
          { label: "Pendencias" }
        ]}
        title="Pendencias de importacao"
        description={
          params.execucao
            ? `Reconciliacao manual da importacao legada para a execucao ${params.execucao}.`
            : "Reconciliacao manual da importacao legada."
        }
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        O Excel original e a fonte de conferencia. Use esta tela para resolver conflitos entre o dado importado e o cadastro normalizado.
      </Alert>

      <PendingConflictsList conflicts={conflicts} itemOptions={itemOptions} />
      <PageFeedbackSnackbar message={feedback?.message} severity={feedback?.severity} />
    </>
  );
}
