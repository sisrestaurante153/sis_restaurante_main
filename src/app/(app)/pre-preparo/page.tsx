import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  pre_preparo: { bg: "#E6F1FB", text: "#0C447C" },
  intermediario: { bg: "#EEEDFE", text: "#3C3489" }
};

const TYPE_LABEL: Record<string, string> = {
  pre_preparo: "Pré-preparo",
  intermediario: "Intermediário"
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ativo: { bg: "#EAF3DE", text: "#27500A" },
  inativo: { bg: "#F1EFE8", text: "#444441" }
};

const FICHA_STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ativa: { bg: "#EAF3DE", text: "#27500A" },
  rascunho: { bg: "#FAEEDA", text: "#633806" },
  inativa: { bg: "#F1EFE8", text: "#444441" },
  arquivada: { bg: "#F1EFE8", text: "#444441" }
};

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        fontSize: 10.5,
        padding: "2px 8px",
        borderRadius: "4px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        bgcolor: colors.bg,
        color: colors.text
      }}
    >
      {label}
    </Box>
  );
}

export default async function PrePreparoPage() {
  const session = await requireSession();
  const repository = getCatalogRepository(session.restaurantId);

  // Traz TODOS os itens de pre-preparo/intermediario (tenham ou nao ficha
  // tecnica vinculada) — alguns sao comprados prontos (so item + preco de
  // compra), outros sao produzidos via receita (ficha tecnica com etapas).
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

      <Box
        sx={{
          overflowX: "auto",
          border: "0.5px solid #D3D1C7",
          borderRadius: 2,
          bgcolor: "#fff"
        }}
      >
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "#F4F4F2", fontSize: 11.5, fontWeight: 600, color: "#5F5E5A", borderBottom: "0.5px solid #D3D1C7" } }}>
              <TableCell>Código</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Custo unitário</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ficha técnica</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    Nenhum item de pré-preparo ou intermediário cadastrado ainda.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const fichaColors = item.fichaStatus ? (FICHA_STATUS_BADGE_COLORS[item.fichaStatus] ?? FICHA_STATUS_BADGE_COLORS.inativa) : null;
                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ "& td": { p: 0, fontSize: 13, borderBottom: "0.5px solid #EDEBE3" } }}
                  >
                    <TableCell>
                      <Link
                        href={`/itens/${item.id}` as never}
                        style={{ display: "block", textDecoration: "none", color: "#185FA5", padding: "8px 16px", fontSize: 11.5 }}
                      >
                        {item.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/itens/${item.id}` as never}
                        style={{ display: "block", textDecoration: "none", color: item.active ? "#2C2C2A" : "#A32D2D", padding: "8px 16px", fontWeight: 500 }}
                      >
                        {!item.active ? "⊘ " : ""}
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ px: 2 }}>
                      <Badge label={TYPE_LABEL[item.type] ?? item.type} colors={TYPE_BADGE_COLORS[item.type] ?? { bg: "#F1EFE8", text: "#444441" }} />
                    </TableCell>
                    <TableCell sx={{ px: 2, color: "#5F5E5A" }}>{item.category}</TableCell>
                    <TableCell align="right" sx={{ px: 2 }}>
                      {item.baseUnitCost === "--" ? "—" : `R$ ${Number(item.baseUnitCost).toFixed(4)}`}
                    </TableCell>
                    <TableCell sx={{ px: 2 }}>
                      <Badge label={item.active ? "Ativo" : "Inativo"} colors={STATUS_BADGE_COLORS[item.active ? "ativo" : "inativo"]} />
                    </TableCell>
                    <TableCell sx={{ px: 2 }}>
                      {item.fichaId ? (
                        <Link
                          href={`/fichas/${item.fichaId}` as never}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                        >
                          <ReceiptLongOutlinedIcon sx={{ fontSize: 14, color: "#185FA5" }} />
                          {fichaColors ? <Badge label={capitalizeStatus(item.fichaStatus!)} colors={fichaColors} /> : null}
                        </Link>
                      ) : (
                        <Link
                          href={`/fichas/nova?linkedItemId=${item.id}` as never}
                          style={{ fontSize: 11.5, color: "#185FA5", textDecoration: "none" }}
                        >
                          + Criar ficha
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}

function capitalizeStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
