"use client";

import { useMemo, useState } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { EmptyState } from "@/components/ui/EmptyState";

interface CompositionTreeProps {
  rows: Array<{
    id: string;
    fichaId: string;
    fichaName: string;
    path: string;
    depth: number;
    componentType: string;
    quantity: string;
    usageUnit: string;
    totalCost: string;
    itemName?: string;
  }>;
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

function formatQuantity(quantity: string, usageUnit: string) {
  if (!quantity || quantity === "calculado" || quantity === "\u2014" || quantity === "-") {
    return "\u2014";
  }

  return `${quantity} ${usageUnit}`;
}

function resolveTypeChipSx(componentType: string, theme: Theme) {
  const normalized = componentType.toLowerCase();

  if (normalized.includes("sub") || normalized.includes("ficha")) {
    return {
      color: theme.palette.secondary.dark,
      borderColor: alpha(theme.palette.secondary.main, 0.32),
      bgcolor: alpha(theme.palette.secondary.main, 0.08)
    };
  }

  if (normalized.includes("embal")) {
    return {
      color: theme.palette.warning.dark,
      borderColor: alpha(theme.palette.warning.main, 0.32),
      bgcolor: alpha(theme.palette.warning.main, 0.08)
    };
  }

  return {
    color: theme.palette.primary.dark,
    borderColor: alpha(theme.palette.primary.main, 0.32),
    bgcolor: alpha(theme.palette.primary.main, 0.08)
  };
}

export function CompositionTree({ rows }: CompositionTreeProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(rows.map((row) => row.path))
  );

  const indexedRows = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      depth: row.depth ?? Math.max(0, row.path.split(" > ").length - 1),
      displayName: row.itemName || row.path.split(" > ").at(-1) || row.fichaName
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return indexedRows;
    }

    return indexedRows.filter((row) => {
      const haystack = `${row.fichaName} ${row.displayName} ${row.path}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [indexedRows, query]);

  const pathLookup = useMemo(
    () => new Map(filteredRows.map((row) => [row.path, row])),
    [filteredRows]
  );

  const hasChildren = useMemo(() => {
    return new Set(
      filteredRows.flatMap((row) =>
        filteredRows.some((candidate) => candidate.path.startsWith(`${row.path} > `)) ? [row.path] : []
      )
    );
  }, [filteredRows]);

  const visibleRows = useMemo(() => {
    return filteredRows.filter((row) => {
      const segments = row.path.split(" > ");
      const ancestorPaths = segments
        .slice(0, -1)
        .map((_, index) => segments.slice(0, index + 1).join(" > "))
        .filter((path) => pathLookup.has(path));

      return ancestorPaths.every((path) => expandedKeys.has(path));
    });
  }, [expandedKeys, filteredRows, pathLookup]);

  function toggleRow(path: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  return (
    <Stack spacing={3}>
      <TextField
        fullWidth
        label="Filtrar por ficha"
        placeholder="Filtrar por ficha..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }
        }}
      />

      <Paper sx={{ overflow: "hidden" }}>
        {rows.length === 0 || visibleRows.length === 0 ? (
          <EmptyState
            icon={<AccountTreeRoundedIcon sx={{ fontSize: 36 }} />}
            title="Nenhuma composicao encontrada"
            description="Ajuste o filtro ou finalize uma ficha tecnica para inspecionar a arvore expandida."
          />
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "40%" }}>Ficha/Item</TableCell>
                  <TableCell sx={{ width: 140 }}>Tipo</TableCell>
                  <TableCell sx={{ width: 110 }}>Profundidade</TableCell>
                  <TableCell sx={{ width: 130 }}>Quantidade</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    Custo
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row) => {
                  const expandable = hasChildren.has(row.path);
                  const isExpanded = expandedKeys.has(row.path);

                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: row.depth === 0 ? alpha(theme.palette.primary.main, 0.03) : "transparent"
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 2 }}>
                          {expandable ? (
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? `Recolher ${row.displayName}` : `Expandir ${row.displayName}`}
                              onClick={() => toggleRow(row.path)}
                            >
                              {isExpanded ? (
                                <KeyboardArrowDownRoundedIcon fontSize="small" />
                              ) : (
                                <KeyboardArrowRightRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          ) : (
                            <Box sx={{ width: 32, flexShrink: 0 }} />
                          )}
                          <Typography fontWeight={row.depth === 0 ? 600 : 500}>{row.displayName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={row.componentType.replaceAll("_", " ")}
                          sx={resolveTypeChipSx(row.componentType, theme)}
                        />
                      </TableCell>
                      <TableCell>{row.depth}</TableCell>
                      <TableCell>{formatQuantity(row.quantity, row.usageUnit)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} sx={{ color: "custom.custo" }}>
                          {formatCurrency(row.totalCost)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
