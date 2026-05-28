import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { DesktopNewItemAction, ItemsListingView } from "@/modules/catalog/ui/items-listing-view";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { requireSession } from "@/modules/access/server/session-cookie";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([requireSession(), searchParams]);
  const query = getSingle(resolvedSearchParams.query);
  const type = getSingle(resolvedSearchParams.type, "all");
  const status = getSingle(resolvedSearchParams.status, "all") as "ativos" | "inativos" | "all";
  const category = getSingle(resolvedSearchParams.category, "all");
  const page = Number(getSingle(resolvedSearchParams.page, "1"));
  const pageSize = Number(getSingle(resolvedSearchParams.pageSize, "100"));
  const sort = getSingle(resolvedSearchParams.sort) as "code" | "name" | "type" | "category" | "purchaseQuantity" | "stockUnit" | "baseUnitCost" | "conversionFactor" | "usageQuantity" | "usageUnit" | "usagePrice" | "supplierName" | "active" | "updatedAt" | "";
  const order = getSingle(resolvedSearchParams.order) as "asc" | "desc" | "";
  const repository = getCatalogRepository(session.restaurantId);
  const masterData = getMasterDataRepository();
  const [result, categoryRows] = await Promise.all([
    repository.listItems({
      query,
      type: type as Parameters<typeof repository.listItems>[0]["type"],
      status,
      category,
      page,
      pageSize,
      sort: sort || undefined,
      order: order || undefined
    }),
    masterData.listOperationalCategories()
  ]);
  const categoryOptions = categoryRows
    .filter((row) => row.active)
    .map((row) => ({ value: row.name, label: row.name }));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Itens" }
        ]}
        title="Itens"
        description="Cadastro mestre de insumos e materiais."
        actions={<DesktopNewItemAction />}
        size="compact"
      />

      <ItemsListingView
        items={result.items}
        page={result.page}
        pageSize={pageSize}
        totalCount={result.totalCount}
        query={query}
        type={type}
        status={status}
        category={category}
        categoryOptions={categoryOptions}
        sort={sort || undefined}
        order={order || undefined}
      />
    </>
  );
}
