"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { FinancialReturnRow } from "@/modules/sales/domain/types";

const BORDER = "#D3D1C7";
const BG = "#F4F4F2";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

type Quadrant = "alto_alta" | "alto_baixa" | "baixo_alta" | "baixo_baixa";

const QUADRANT_META: Record<Quadrant, { title: string; subtitle: string; color: string; bg: string }> = {
  alto_alta: {
    title: "Estrelas",
    subtitle: "Alto giro e alta margem — os melhores itens do cardápio.",
    color: "#1B6B2C",
    bg: "#EAF3DE"
  },
  alto_baixa: {
    title: "Vacas leiteiras",
    subtitle: "Alto giro e baixa margem — vendem bem, mas rendem pouco por unidade.",
    color: "#854F0B",
    bg: "#FDF6E8"
  },
  baixo_alta: {
    title: "Enigmas",
    subtitle: "Baixo giro e alta margem — rendem bem, mas vendem pouco.",
    color: "#185FA5",
    bg: "#E6F1FB"
  },
  baixo_baixa: {
    title: "Abacaxis",
    subtitle: "Baixo giro e baixa margem — candidatos a sair do cardápio.",
    color: "#A32D2D",
    bg: "#FBEAEA"
  }
};

function classify(row: FinancialReturnRow, qtyMedian: number, marginMedian: number): Quadrant {
  const highVolume = row.quantitySold >= qtyMedian;
  const highMargin = (row.marginPercent ?? 0) >= marginMedian;
  if (highVolume && highMargin) return "alto_alta";
  if (highVolume && !highMargin) return "alto_baixa";
  if (!highVolume && highMargin) return "baixo_alta";
  return "baixo_baixa";
}

function QuadrantCard({ quadrant, rows }: { quadrant: Quadrant; rows: FinancialReturnRow[] }) {
  const meta = QUADRANT_META[quadrant];
  return (
    <Box sx={{ border: `0.5px solid ${BORDER}`, borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ bgcolor: meta.bg, px: 2, py: 1.5, borderBottom: `0.5px solid ${BORDER}` }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: meta.color }}>
          {meta.title} ({rows.length})
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: "#5F5E5A" }}>{meta.subtitle}</Typography>
      </Box>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: "#888780", px: 2, py: 2 }}>Nenhum item nesta categoria.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: BG, fontSize: 11, fontWeight: 600, color: "#5F5E5A" } }}>
              <TableCell>Item</TableCell>
              <TableCell align="right">Qtde</TableCell>
              <TableCell align="right">Margem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .sort((a, b) => b.quantitySold - a.quantitySold)
              .map((row) => (
                <TableRow key={row.itemId}>
                  <TableCell sx={{ fontSize: 12.5 }}>{row.itemName}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12.5 }}>
                    {row.quantitySold.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12.5 }}>
                    {row.marginPercent !== null ? `${row.marginPercent.toFixed(1)}%` : "--"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export function MenuEngineeringMatrix({ rows }: { rows: FinancialReturnRow[] }) {
  const { qtyMedian, marginMedian, grouped } = useMemo(() => {
    const qtyMedian = median(rows.map((r) => r.quantitySold));
    const marginMedian = median(rows.map((r) => r.marginPercent ?? 0));

    const grouped: Record<Quadrant, FinancialReturnRow[]> = {
      alto_alta: [],
      alto_baixa: [],
      baixo_alta: [],
      baixo_baixa: []
    };
    for (const row of rows) {
      grouped[classify(row, qtyMedian, marginMedian)].push(row);
    }
    return { qtyMedian, marginMedian, grouped };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        Nenhuma venda registrada no período selecionado para montar a matriz.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: "#888780", mb: 2 }}>
        Classificação por mediana do período: giro alto a partir de {qtyMedian.toLocaleString("pt-BR")} unidades vendidas,
        margem alta a partir de {marginMedian.toFixed(1)}%.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <QuadrantCard quadrant="alto_alta" rows={grouped.alto_alta} />
        <QuadrantCard quadrant="alto_baixa" rows={grouped.alto_baixa} />
        <QuadrantCard quadrant="baixo_alta" rows={grouped.baixo_alta} />
        <QuadrantCard quadrant="baixo_baixa" rows={grouped.baixo_baixa} />
      </Box>
    </Box>
  );
}
