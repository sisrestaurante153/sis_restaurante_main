import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { requirePermission } from "@/modules/access/server/authorization";
import {
  buildImportDashboardSnapshot,
  getImportFeedbackMessage
} from "@/modules/import/server/import-execution-presenter";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { ImportWorkspace } from "@/modules/import/ui/import-workspace";
import { PageHeader } from "@/components/layout/PageHeader";

type SearchParams = Promise<{
  created?: string;
  error?: string;
  execucao?: string;
}>;

export default async function ImportPage({ searchParams }: { searchParams?: SearchParams }) {
  await requirePermission("import.run");

  const repository = getImportRepository();
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
    <Stack spacing={3}>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Importacao" }
        ]}
        title="Area de importacao"
        description="Envio do XLSX legado, acompanhamento da fila interna, leitura clara do desfecho da execucao e acesso rapido as pendencias."
      />

      <Alert severity="info">
        O upload cria a execucao e preserva o arquivo original. O parse Python e a carga Prisma seguem no worker interno da mesma aplicacao.
      </Alert>

      <ImportWorkspace initialDashboard={dashboard} feedback={feedback} />
    </Stack>
  );
}
