import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { FinancialReturnRow } from "@/modules/sales/domain/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MarginChip({ marginPercent }: { marginPercent: number | null }) {
  if (marginPercent === null) {
    return <Chip size="small" label="--" variant="outlined" />;
  }
  const color = marginPercent >= 40 ? "success" : marginPercent >= 20 ? "warning" : "error";
  return <Chip size="small" label={`${marginPercent.toFixed(1)}%`} color={color} variant="outlined" />;
}

export function FinancialReturnView({ rows }: { rows: FinancialReturnRow[] }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        Nenhuma venda registrada no período selecionado. Registre vendas em /vendas para ver a margem por item aqui.
      </Typography>
    );
  }

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenueTotal,
      cost: acc.cost + row.costTotal,
      margin: acc.margin + row.marginTotal
    }),
    { revenue: 0, cost: 0, margin: 0 }
  );

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Qtde vendida</TableCell>
            <TableCell align="right">Faturamento</TableCell>
            <TableCell align="right">Custo</TableCell>
            <TableCell align="right">Margem (R$)</TableCell>
            <TableCell align="right">Margem (%)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.itemId}>
              <TableCell>{row.itemName}</TableCell>
              <TableCell align="right">{row.quantitySold.toLocaleString("pt-BR")}</TableCell>
              <TableCell align="right">{formatCurrency(row.revenueTotal)}</TableCell>
              <TableCell align="right">{formatCurrency(row.costTotal)}</TableCell>
              <TableCell align="right" sx={{ color: row.marginTotal >= 0 ? "#1B6B2C" : "#A32D2D", fontWeight: 500 }}>
                {formatCurrency(row.marginTotal)}
              </TableCell>
              <TableCell align="right">
                <MarginChip marginPercent={row.marginPercent} />
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" } }}>
            <TableCell>Total</TableCell>
            <TableCell align="right">
              {rows.reduce((sum, row) => sum + row.quantitySold, 0).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell align="right">{formatCurrency(totals.revenue)}</TableCell>
            <TableCell align="right">{formatCurrency(totals.cost)}</TableCell>
            <TableCell align="right" sx={{ color: totals.margin >= 0 ? "#1B6B2C" : "#A32D2D" }}>
              {formatCurrency(totals.margin)}
            </TableCell>
            <TableCell align="right">
              {totals.revenue > 0 ? `${((totals.margin / totals.revenue) * 100).toFixed(1)}%` : "--"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}
