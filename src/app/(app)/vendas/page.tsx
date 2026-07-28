import { requireSession } from "@/modules/access/server/session-cookie";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getSalesRepository } from "@/modules/sales/server/sales-repository";
import { SalesListingView } from "@/modules/sales/ui/sales-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

const SELLABLE_TYPES = new Set(["prato", "porcao", "marmita", "combo", "produto_pronto"]);

export default async function VendasPage() {
  const session = await requireSession();
  const [vendas, itemOptions] = await Promise.all([
    getSalesRepository(session.restaurantId).listVendas(),
    getCatalogRepository(session.restaurantId).listItemOptions()
  ]);

  const sellableOptions = itemOptions
    .filter((option) => SELLABLE_TYPES.has(option.type))
    .map((option) => ({ id: option.id, name: option.name }));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Vendas" }
        ]}
        title="Vendas"
        description="Registro diário de vendas por item, usado no cálculo de retorno financeiro."
        size="compact"
      />

      <SalesListingView vendas={vendas} itemOptions={sellableOptions} />
    </>
  );
}
