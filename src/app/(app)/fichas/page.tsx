import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { requirePermission } from "@/modules/access/server/authorization";
import {
  DesktopNewFichaAction,
  FichasListingView
} from "@/modules/engineering/ui/fichas-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

export default async function FichasPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = getSingle(resolvedSearchParams.query);
  const status = getSingle(resolvedSearchParams.status, "all") as
    | "rascunho"
    | "ativa"
    | "inativa"
    | "arquivada"
    | "all";
  const page = Number(getSingle(resolvedSearchParams.page, "1"));
  const pageSize = Number(getSingle(resolvedSearchParams.pageSize, "10"));
  const actor = await requirePermission("ficha.read");
  const repository = getEngineeringRepository(actor.restaurantId);
  const result = await repository.listFichas({
    query,
    status,
    page,
    pageSize
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Fichas Tecnicas" }
        ]}
        title="Fichas Tecnicas"
        description="Receitas, montagens e composicoes do cardapio."
        actions={<DesktopNewFichaAction />}
        size="compact"
      />

      <FichasListingView
        items={result.items}
        page={result.page}
        pageSize={pageSize}
        totalCount={result.totalCount}
        query={query}
        status={status}
      />
    </>
  );
}
