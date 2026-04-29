import Link from "next/link";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grow from "@mui/material/Grow";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { KpiCard } from "@/components/ui/KpiCard";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default async function DashboardPage() {
  const newFichaHref = "/fichas/nova";
  const newItemHref = "/itens/novo";
  const costsHref = "/custos";
  const pendingImportHref = "/importacao";
  const catalogRepository = getCatalogRepository();
  const engineeringRepository = getEngineeringRepository();
  const importRepository = getImportRepository();
  const [items, fichas, conflicts, costs] = await Promise.all([
    catalogRepository.listItems({ page: 1, pageSize: 50, query: "", type: "all", status: "all" }),
    engineeringRepository.listFichas({ page: 1, pageSize: 50, query: "", status: "all" }),
    importRepository.listPendingConflicts(),
    engineeringRepository.listCostSummaries()
  ]);

  const totalCost = costs.reduce((sum, row) => sum + Number(row.total), 0).toFixed(2);
  const attentionItems = [
    conflicts.length > 0
      ? `Ha ${conflicts.length} pendencias abertas na fila de reconciliacao manual.`
      : null,
    items.items.filter((item) => !item.fichaStatus).length > 0
      ? `${items.items.filter((item) => !item.fichaStatus).length} itens operacionais ainda sem ficha vinculada.`
      : null
  ].filter((value): value is string => Boolean(value));

  return (
    <Stack spacing={4}>
      <PageHeader
        eyebrow="visao geral"
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Dashboard" }
        ]}
        title="Dashboard operacional"
        description="Visao geral do sistema operacional com leitura imediata de cadastro, fichas, pendencias e custo consolidado."
        actions={
          <Button component={Link} href={newFichaHref as never} variant="contained">
            Nova ficha
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))"
          }
        }}
      >
        <Grow in timeout={120}>
          <Box>
            <KpiCard
              label="Itens mestres"
              value={items.totalCount}
              color="item"
              icon={<Inventory2RoundedIcon fontSize="small" />}
            />
          </Box>
        </Grow>
        <Grow in timeout={180}>
          <Box>
            <KpiCard
              label="Fichas versionadas"
              value={fichas.totalCount}
              color="ficha"
              icon={<ReceiptLongRoundedIcon fontSize="small" />}
            />
          </Box>
        </Grow>
        <Grow in timeout={240}>
          <Box>
            <KpiCard
              label="Pendencias import."
              value={conflicts.length}
              color="pendencia"
              icon={<ChecklistRoundedIcon fontSize="small" />}
            />
          </Box>
        </Grow>
        <Grow in timeout={300}>
          <Box>
            <KpiCard
              label="Custo consolidado"
              value={`R$ ${totalCost}`}
              color="custo"
              icon={<PaidRoundedIcon fontSize="small" />}
            />
          </Box>
        </Grow>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 7fr) minmax(0, 5fr)"
          }
        }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <WarningAmberRoundedIcon color="warning" />
                <Typography variant="h4">Pontos de atencao</Typography>
              </Stack>
              {attentionItems.length > 0 ? (
                <List disablePadding sx={{ display: "grid", gap: 1 }}>
                  {attentionItems.map((item) => (
                    <ListItem
                      key={item}
                      disablePadding
                      sx={{ alignItems: "flex-start", borderRadius: 1.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, mt: 0.25 }}>
                        <ErrorOutlineRoundedIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CheckCircleOutlineRoundedIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Nenhum ponto de atencao aberto neste momento.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <BoltRoundedIcon color="primary" />
                <Typography variant="h4">Atalhos rapidos</Typography>
              </Stack>
              <Stack spacing={1.5}>
                <Button
                  component={Link}
                  href={newItemHref as never}
                  variant="outlined"
                  fullWidth
                  startIcon={<AddCircleOutlineRoundedIcon />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Novo item
                </Button>
                <Button
                  component={Link}
                  href={costsHref as never}
                  variant="outlined"
                  fullWidth
                  startIcon={<PaidRoundedIcon />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Ver custos
                </Button>
                <Button
                  component={Link}
                  href={pendingImportHref as never}
                  variant="outlined"
                  fullWidth
                  startIcon={<ChecklistRoundedIcon />}
                  sx={{ justifyContent: "flex-start" }}
                >
                  Pendencias de importacao
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
