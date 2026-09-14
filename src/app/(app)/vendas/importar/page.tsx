import { requireSession } from "@/modules/access/server/session-cookie";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { SalesImportView } from "@/modules/sales/ui/sales-import-view";

export default async function VendasImportarPage() {
  await requireSession();

  return (
    <>
      <PageHeader
        size="compact"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Vendas", href: "/vendas" },
          { label: "Importar" }
        ]}
        title="Importar vendas"
        description="Importe um relatório de vendas (CSV ou Excel) exportado do seu sistema de PDV."
      />

      <SalesImportView />
    </>
  );
}
