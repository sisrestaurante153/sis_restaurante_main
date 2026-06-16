import { getEngineeringRepository, type FichaSortBy, type ListFichasInput } from "@/modules/engineering/server/engineering-repository";
import { requirePermission } from "@/modules/access/server/authorization";
import {
  DesktopNewFichaAction,
  FichasListingView
} from "@/modules/engineering/ui/fichas-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VALID_SORT_BY: FichaSortBy[] = ["code", "produto", "modalidade", "grupo", "fc", "ic", "totalCost", "sellingPrice", "margem", "updatedAt", "status", "componentes", "obs"];

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

export default async function FichasPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = getSingle(resolvedSearchParams.query);
  const query = rawQuery ? decodeURIComponent(rawQuery) : "";
  const rawModalidade = getSingle(resolvedSearchParams.modalidade, "all");
  const modalidade = rawModalidade ? decodeURIComponent(rawModalidade) : "all";
  const rawGrupo = getSingle(resolvedSearchParams.grupo, "all");
  const grupo = rawGrupo ? decodeURIComponent(rawGrupo) : "all";
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
      status: getSingle(resolvedSearchParams.status, "all") as ListFichasInput["status"],
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
        items={result?.items ?? []}
        page={result?.page ?? 1}
        pageSize={pageSize}
        totalCount={result?.totalCount ?? 0}
        query={query}
        status={getSingle(resolvedSearchParams.status, "all")}
        modalidade={modalidade}
        grupo={grupo}
        sortBy={sortBy}
        sortDir={sortDir}
        modalidadeOptions={modalities}
        grupoOptions={groups}
        didYouMean={result?.didYouMean}
      />
    </>
  );
}
