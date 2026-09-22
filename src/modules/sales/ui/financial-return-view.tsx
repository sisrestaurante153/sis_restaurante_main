"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import type { FinancialReturnRow } from "@/modules/sales/domain/types";

const BORDER = "#D3D1C7";
const BG = "#F4F4F2";

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

type SortField = "itemName" | "quantitySold" | "revenueTotal" | "costTotal" | "marginTotal" | "marginPercent";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  field,
  align,
  sortField,
  sortDir,
  onSort
}: {
  label: string;
  field: SortField;
  align?: "right" | "left";
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <TableCell
      align={align}
      onClick={() => onSort(field)}
      sx={{
        cursor: "pointer",
        userSelect: "none",
        fontWeight: 600,
        color: isActive ? "#185FA5" : "inherit",
        whiteSpace: "nowrap"
      }}
    >
      {label} {isActive ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </TableCell>
  );
}

function ItemSalesDetail({ sales }: { sales: FinancialReturnRow["sales"] }) {
  return (
    <Box sx={{ py: 1.5, px: 2, bgcolor: BG }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "#5F5E5A", mb: 1 }}>
        Vendas individuais no período ({sales.length})
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 11.5 }}>Data</TableCell>
            <TableCell align="right" sx={{ fontSize: 11.5 }}>
              Quantidade
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11.5 }}>
              Preço unitário
            </TableCell>
            <TableCell align="right" sx={{ fontSize: 11.5 }}>
              Total
            </TableCell>
            <TableCell sx={{ fontSize: 11.5 }}>Canal</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.map((sale, idx) => (
            <TableRow key={`${sale.date}-${idx}`}>
              <TableCell sx={{ fontSize: 12.5 }}>{new Date(`${sale.date}T00:00:00`).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5 }}>
                {sale.quantity.toLocaleString("pt-BR")}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5 }}>
                {formatCurrency(sale.unitPrice)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5 }}>
                {formatCurrency(sale.total)}
              </TableCell>
              <TableCell sx={{ fontSize: 12.5 }}>{sale.channel ?? "--"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ItemRow({ row }: { row: FinancialReturnRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow hover sx={{ "& td": { borderBottom: expanded ? "none" : undefined } }}>
        <TableCell sx={{ width: 32 }}>
          <IconButton size="small" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Recolher" : "Expandir"}>
            {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
          </IconButton>
        </TableCell>
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
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <ItemSalesDetail sales={row.sales} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export function FinancialReturnView({ rows }: { rows: FinancialReturnRow[] }) {
  const [sortField, setSortField] = useState<SortField>("marginTotal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" || typeof bv === "string") {
        return String(av ?? "").localeCompare(String(bv ?? ""));
      }
      const an = av ?? -Infinity;
      const bn = bv ?? -Infinity;
      return (an as number) - (bn as number);
    });
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [rows, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

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
    <Box sx={{ overflowX: "auto", border: `0.5px solid ${BORDER}`, borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 780 }}>
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: BG } }}>
            <TableCell sx={{ width: 32 }} />
            <SortableHeader label="Item" field="itemName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader
              label="Qtde vendida"
              field="quantitySold"
              align="right"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Faturamento"
              field="revenueTotal"
              align="right"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Custo"
              field="costTotal"
              align="right"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Margem (R$)"
              field="marginTotal"
              align="right"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Margem (%)"
              field="marginPercent"
              align="right"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row) => (
            <ItemRow key={row.itemId} row={row} />
          ))}
          <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" } }}>
            <TableCell />
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
