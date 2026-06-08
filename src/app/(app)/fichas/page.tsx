import { getEngineeringRepository, type FichaSortBy } from "@/modules/engineering/server/engineering-repository";
import { requirePermission } from "@/modules/access/server/authorization";
import {
  DesktopNewFichaAction,
  FichasListingView
} from "@/modules/engineering/ui/fichas-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VALID_SORT_BY: FichaSortBy[] = ["code", "produto", "modalidade", "grupo", "fc", "ic", "totalCost", "sellingPrice", "margem", "updatedAt", "status"];

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
  const modalidade = getSingle(resolvedSearchParams.modalidade, "all");
  const grupo = getSingle(resolvedSearchParams.grupo, "all");
  const page = Number(getSingle(resolvedSearchParams.page, "1"));
  const pageSize = Number(getSingle(resolvedSearchParams.pageSize, "10"));
  const rawSortBy = getSingle(resolvedSearchParams.sortBy);
  const sortBy = VALID_SORT_BY.includes(rawSortBy as FichaSortBy) ? (rawSortBy as FichaSortBy) : undefined;
  const rawSortDir = getSingle(resolvedSearchParams.sortDir);
  const sortDir = rawSortDir === "asc" || rawSortDir === "desc" ? rawSortDir : undefined;

  const actor = await requirePermission("ficha.read");
  const repository = getEngineeringRepository(actor.restaurantId);
  const [result, modalities, groups] = await Promise.all([
    repository.listFichas({
      query,
      status,
      modalidade,
      grupo,
      page,
      pageSize,
      sortBy,
      sortDir
    }),
    repository.listModalities(),
    repository.listOperationalGroups()
  ]);

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
        modalidade={modalidade}
        grupo={grupo}
        sortBy={sortBy}
        sortDir={sortDir}
        modalidadeOptions={modalities}
        grupoOptions={groups}
      />
    </>
  );
}
