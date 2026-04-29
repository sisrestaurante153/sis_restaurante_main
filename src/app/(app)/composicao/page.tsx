import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { CompositionTree } from "@/modules/engineering/ui/composition-tree";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function CompositionPage() {
  const rows = await getEngineeringRepository().listCompositionRows();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Composicao" }
        ]}
        title="Composicao"
        description="Arvore de composicao expandida das fichas."
      />
      <CompositionTree rows={rows} />
    </>
  );
}
