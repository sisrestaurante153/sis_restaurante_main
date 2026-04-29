"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { CostBreakdownCard } from "@/components/ui/CostBreakdownCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface CostSummaryProps {
  rows: Array<{
    fichaId: string;
    itemName: string;
    status: string;
    direct: string;
    inherited: string;
    packaging: string;
    total: string;
    perKg: string;
    perPortion: string | null;
    finalOutput: string;
  }>;
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function CostSummary({ rows }: CostSummaryProps) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => row.itemName.toLowerCase().includes(normalizedQuery));
  }, [query, rows]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 36 }} />}
        title="Nenhuma ficha com custos consolidados"
        description="Cadastre uma ficha tecnica para visualizar custo direto, herdado e impacto de embalagem."
        action={
          <Button component={Link} href="/fichas/nova" variant="contained">
            Criar primeira ficha
          </Button>
        }
      />
    );
  }

  return (
    <Stack spacing={3}>
      <TextField
        fullWidth
        label="Buscar ficha"
        placeholder="Buscar ficha..."
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

      {filteredRows.length === 0 ? (
        <Box
          sx={{
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider"
          }}
        >
          <EmptyState
            icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 36 }} />}
            title="Nenhuma ficha encontrada"
            description="Ajuste a busca ou crie uma nova ficha para acompanhar a consolidacao financeira."
            action={
              <Button component={Link} href="/fichas/nova" variant="contained">
                Criar primeira ficha
              </Button>
            }
          />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredRows.map((row) => (
            <Grid key={row.fichaId} size={{ xs: 12, sm: 6, md: 4 }}>
              <CostBreakdownCard
                href={`/fichas/${row.fichaId}`}
                status={row.status}
                title={row.itemName}
                outputLabel={row.finalOutput}
                rows={[
                  { label: "Direto", value: formatCurrency(row.direct) },
                  { label: "Herdado", value: formatCurrency(row.inherited) },
                  { label: "Embalagem", value: formatCurrency(row.packaging) }
                ]}
                total={formatCurrency(row.total)}
                unitLabel={row.perPortion ? "R$/porcao" : "R$/kg"}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
