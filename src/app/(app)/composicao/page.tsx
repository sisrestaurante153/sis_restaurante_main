import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { CompositionTree } from "@/modules/engineering/ui/composition-tree";
import { PageHeader } from "@/components/layout/PageHeader";
import { requirePermission } from "@/modules/access/server/authorization";

export default async function CompositionPage() {
  const actor = await requirePermission("ficha.read");
  const rows = await getEngineeringRepository(actor.restaurantId).listCompositionRows();

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
