import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { CostSummary } from "@/modules/engineering/ui/cost-summary";
import { PageHeader } from "@/components/layout/PageHeader";
import { requirePermission } from "@/modules/access/server/authorization";

export default async function CostsPage() {
  const actor = await requirePermission("ficha.read");
  const rows = await getEngineeringRepository(actor.restaurantId).listCostSummaries();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Custos" }
        ]}
        title="Custos"
        description="Consolidacao financeira por ficha."
      />
      <CostSummary rows={rows} />
    </>
  );
}
