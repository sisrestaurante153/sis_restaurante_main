import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getSalesRepository } from "@/modules/sales/server/sales-repository";
import { FinancialReturnView } from "@/modules/sales/ui/financial-return-view";
import { PageHeader } from "@/modules/platform/ui/page-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingle(searchParam: string | string[] | undefined, fallback = "") {
  return Array.isArray(searchParam) ? searchParam[0] ?? fallback : searchParam ?? fallback;
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function RetornoFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, resolvedSearchParams] = await Promise.all([requireSession(), searchParams]);
  const dateFrom = getSingle(resolvedSearchParams.dateFrom, firstDayOfMonth());
  const dateTo = getSingle(resolvedSearchParams.dateTo, new Date().toISOString().slice(0, 10));

  const rows = await getSalesRepository(session.restaurantId).getFinancialReturn({ dateFrom, dateTo });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Retorno Financeiro" }
        ]}
        title="Retorno Financeiro"
        description="Cruza vendas registradas com o custo calculado da ficha técnica para mostrar a margem real de cada item."
        size="compact"
      />

      <Box component="form" method="get" sx={{ display: "flex", gap: 2, alignItems: "flex-end", mb: 3, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="De"
          name="dateFrom"
          type="date"
          defaultValue={dateFrom}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Até"
          name="dateTo"
          type="date"
          defaultValue={dateTo}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button type="submit" variant="outlined">
          Filtrar
        </Button>
      </Box>

      <FinancialReturnView rows={rows} />
    </>
  );
}
