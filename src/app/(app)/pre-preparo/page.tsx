import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";
import { requireSession } from "@/modules/access/server/session-cookie";

const PRE_PREPARO_TYPES = ["pre_preparo", "intermediario"] as const;

const TYPE_LABEL: Record<string, string> = {
  pre_preparo: "Pré-preparo",
  intermediario: "Intermediário"
};

export default async function PrePreparoPage() {
  const session = await requireSession();
  const repository = getCatalogRepository(session.restaurantId);

  const results = await Promise.all(
    PRE_PREPARO_TYPES.map((type) =>
      repository.listItems({
        page: 1,
        pageSize: 500,
        query: "",
        type,
        status: "all"
      })
    )
  );

  const items = results
    .flatMap((result) => result?.items ?? [])
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Pré-preparo" }
        ]}
        title="Pré-preparo"
        description="Itens intermediários entre insumos e a ficha técnica final (pré-preparo e intermediário)."
        actions={
          <Button
            component={Link}
            href="/itens/novo?type=pre_preparo"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: "#185FA5",
              "&:hover": { backgroundColor: "#0C447C" }
            }}
          >
            Novo pré-preparo
          </Button>
        }
        size="compact"
      />

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Custo unitário</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    Nenhum item de pré-preparo ou intermediário cadastrado ainda.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} hover sx={{ "& td": { p: 0 } }}>
                  <TableCell>
                    <Link
                      href={`/itens/${item.id}` as never}
                      style={{ display: "block", textDecoration: "none", color: "inherit", padding: "8px 16px" }}
                    >
                      {item.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/itens/${item.id}` as never}
                      style={{ display: "block", textDecoration: "none", color: "inherit", padding: "8px 16px" }}
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ px: 2 }}>
                    <Chip size="small" label={TYPE_LABEL[item.type] ?? item.type} />
                  </TableCell>
                  <TableCell sx={{ px: 2 }}>{item.category}</TableCell>
                  <TableCell align="right" sx={{ px: 2 }}>
                    {item.baseUnitCost === "--" ? "--" : `R$ ${Number(item.baseUnitCost).toFixed(4)}`}
                  </TableCell>
                  <TableCell sx={{ px: 2 }}>
                    <Chip
                      size="small"
                      label={item.active ? "Ativo" : "Inativo"}
                      color={item.active ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}
