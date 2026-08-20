import { getEngineeringRepository, type FichaSortBy, type ListFichasInput } from "@/modules/engineering/server/engineering-repository";
import { requireSession } from "@/modules/access/server/session-cookie";
import {
  DesktopNewFichaAction,
  FichasListingView
} from "@/modules/engineering/ui/fichas-listing-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VALID_SORT_BY: FichaSortBy[] = ["code", "produto", "modalidade", "grupo", "fc", "ic", "totalCost", "sellingPrice", "margem", "updatedAt", "status", "componentes", "obs"];

// Fichas cujo item resultante e pre-preparo ou intermediario (etapa produzida
// entre insumos e a ficha final) — mesma listagem de /fichas, so que filtrada.
const PRE_PREPARO_ITEM_TYPES = ["pre_preparo", "intermediario"] as const;

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

export default async function PrePreparoPage({ searchParams }: { searchParams: SearchParams }) {
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

  const session = await requireSession();
  const repository = getEngineeringRepository(session.restaurantId);
  const [result, modalities, groups] = await Promise.all([
    repository.listFichas({
      query,
      status: getSingle(resolvedSearchParams.status, "all") as ListFichasInput["status"],
      modalidade,
      grupo,
      page,
      pageSize,
      sortBy,
      sortDir,
      itemTypes: [...PRE_PREPARO_ITEM_TYPES]
    }),
    repository.listModalities(),
    repository.listOperationalGroups()
  ]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Pré-preparo" }
        ]}
        title="Pré-preparo"
        description="Fichas técnicas de itens intermediários entre insumos e a ficha final (pré-preparo e intermediário)."
        actions={<DesktopNewFichaAction href="/fichas/nova" label="Novo pré-preparo" />}
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
        basePath="/pre-preparo"
        newHref="/fichas/nova"
      />
    </>
  );
}
