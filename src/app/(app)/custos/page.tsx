import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { CostSummary } from "@/modules/engineering/ui/cost-summary";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function CostsPage() {
  const rows = await getEngineeringRepository().listCostSummaries();

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
