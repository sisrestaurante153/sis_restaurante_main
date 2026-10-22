import Alert from "@mui/material/Alert";
import { requireSession } from "@/modules/access/server/session-cookie";
import { listAllFichasForSearch, listPendingFichaItems } from "@/modules/engineering/server/ficha-link-repository";
import { PendingFichasList } from "@/modules/engineering/ui/pending-fichas-list";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageFeedbackSnackbar } from "@/components/ui/PageFeedbackSnackbar";

type SearchParams = Promise<{ linked?: string; error?: string }>;

export default async function VincularFichasPendentesPage({ searchParams }: { searchParams?: SearchParams }) {
  const [session, params] = await Promise.all([
    requireSession(),
    searchParams ?? Promise.resolve({} as { linked?: string; error?: string })
  ]);

  // Sempre recalculada ao vivo, sem cache - a lista reflete o estado atual
  // do catalogo a cada carregamento da pagina.
  const [pendingItems, searchableFichas] = await Promise.all([
    listPendingFichaItems(session.restaurantId),
    listAllFichasForSearch(session.restaurantId)
  ]);

  const feedback =
    params.linked === "1"
      ? { severity: "success" as const, message: "Ficha vinculada com sucesso." }
      : params.error === "link"
        ? { severity: "error" as const, message: "Nao foi possivel vincular a ficha. Tente novamente." }
        : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Fichas Tecnicas", href: "/fichas" },
          { label: "Vincular pendentes" }
        ]}
        title="Vincular fichas pendentes"
        description="Itens vendaveis sem ficha tecnica ativa, com sugestoes de fichas ja existentes no catalogo para vincular."
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Vincular reatribui a ficha escolhida pro item pendente, exatamente como ela esta - ingredientes e custo nao
        sao recalculados. Essa lista e recalculada toda vez que a pagina carrega.
      </Alert>

      <PendingFichasList items={pendingItems} allFichas={searchableFichas} />
      <PageFeedbackSnackbar message={feedback?.message} severity={feedback?.severity} />
    </>
  );
}
