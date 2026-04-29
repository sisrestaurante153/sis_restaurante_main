import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { MasterDataWorkspace } from "@/modules/master-data/ui/master-data-workspace";

type SearchParams = Promise<{
  saved?: string;
  deleted?: string;
  error?: string;
}>;

function buildFeedback(params: { saved?: string; deleted?: string; error?: string }) {
  if (params.error) {
    return { severity: "error" as const, message: decodeURIComponent(params.error) };
  }

  if (params.saved) {
    return { severity: "success" as const, message: "Cadastro mestre salvo com sucesso." };
  }

  if (params.deleted) {
    return { severity: "success" as const, message: "Cadastro mestre removido com sucesso." };
  }

  return null;
}

export default async function CadastrosPage({ searchParams }: { searchParams?: SearchParams }) {
  const repository = getMasterDataRepository();
  const [suppliers, units, operationalCategories, modalities, itemTypes, stageTypes, params] = await Promise.all([
    repository.listSuppliers(),
    repository.listUnits(),
    repository.listOperationalCategories(),
    repository.listModalities(),
    repository.listItemTypes(),
    repository.listStageTypes(),
    searchParams ?? Promise.resolve({})
  ]);
  const feedback = buildFeedback(params ?? {});

  return (
    <Stack spacing={3}>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Cadastros mestres" }
        ]}
        title="Cadastros mestres"
        description="Gerencie fornecedor, unidade, categoria operacional, modalidade e tipo em areas proprias de manutencao."
      />

      {feedback ? <Alert severity={feedback.severity}>{feedback.message}</Alert> : null}

      <MasterDataWorkspace
        suppliers={suppliers}
        units={units}
        operationalCategories={operationalCategories}
        modalities={modalities}
        itemTypes={itemTypes}
        stageTypes={stageTypes}
      />
    </Stack>
  );
}
