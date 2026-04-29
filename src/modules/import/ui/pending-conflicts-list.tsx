"use client";

import { useMemo, useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams
} from "@mui/x-data-grid";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataGridListingConfig, DataGridListingSx } from "@/components/ui/data-grid-pattern";
import { ConfiancaProgress } from "@/modules/import/ui/ConfiancaProgress";
import { ResolverDialog } from "@/modules/import/ui/ResolverDialog";

interface PendingConflictsListProps {
  conflicts: Array<{
    id: string;
    executionId?: string | null;
    type: string;
    rawName: string;
    normalizedName: string;
    sheetName: string;
    rowNumber: number;
    confidence: string;
    suggestedItemName: string | null;
    suggestedAlias: string | null;
    stagingStatus?: string;
  }>;
  itemOptions: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

function typeChipColor(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("unidade") || normalized.includes("medida")) {
    return "info";
  }

  if (normalized.includes("alias")) {
    return "secondary";
  }

  return "warning";
}

export function PendingConflictsList({ conflicts, itemOptions }: PendingConflictsListProps) {
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null);

  const activeConflict = useMemo(
    () => conflicts.find((conflict) => conflict.id === activeConflictId) ?? null,
    [activeConflictId, conflicts]
  );

  const columns = useMemo<GridColDef<(typeof conflicts)[number]>[]>(
    () => [
      {
        field: "id",
        headerName: "Conflito",
        width: 110,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<(typeof conflicts)[number]>) => (
          <Stack direction="row" spacing={1} alignItems="center">
            {row.stagingStatus === "resolved" ? (
              <CheckCircleRoundedIcon color="success" fontSize="small" />
            ) : (
              <WarningAmberRoundedIcon color="warning" fontSize="small" />
            )}
            <Typography variant="body2" fontWeight={600}>
              {row.id}
            </Typography>
          </Stack>
        )
      },
      {
        field: "type",
        headerName: "Tipo",
        width: 120,
        sortable: false,
        renderCell: ({ value }: GridRenderCellParams<(typeof conflicts)[number], string>) => (
          <Chip size="small" variant="outlined" color={typeChipColor(value ?? "")} label={value} />
        )
      },
      {
        field: "rawName",
        headerName: "Nome de origem",
        flex: 1,
        minWidth: 180
      },
      {
        field: "normalizedName",
        headerName: "Nome normalizado",
        flex: 1,
        minWidth: 180
      },
      {
        field: "sheetLine",
        headerName: "Aba/Linha",
        width: 120,
        sortable: false,
        valueGetter: (_value, row) => `${row.sheetName}/L${row.rowNumber}`
      },
      {
        field: "confidence",
        headerName: "Confianca",
        width: 130,
        sortable: false,
        renderCell: ({ value }: GridRenderCellParams<(typeof conflicts)[number], string>) => (
          <ConfiancaProgress value={value ?? "0"} />
        )
      },
      {
        field: "suggestion",
        headerName: "Sugestao",
        width: 160,
        sortable: false,
        valueGetter: (_value, row) => row.suggestedItemName ?? row.suggestedAlias ?? "Manual"
      },
      {
        field: "actions",
        headerName: "Acoes",
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<(typeof conflicts)[number]>) => (
          <Button size="small" variant="outlined" onClick={() => setActiveConflictId(row.id)}>
            Resolver
          </Button>
        )
      }
    ],
    []
  );

  return (
    <>
      <Paper sx={{ overflow: "hidden" }}>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box sx={{ minWidth: 1080 }}>
            <DataGrid
              rows={conflicts}
              columns={columns}
              {...DataGridListingConfig}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: 10
                  }
                }
              }}
              sx={DataGridListingSx}
              slots={{
                noRowsOverlay: () => (
                  <EmptyState
                    icon={<RuleFolderRoundedIcon sx={{ fontSize: 36 }} />}
                    title="Nenhuma pendencia em aberto"
                    description="A reconciliacao manual esta em dia. Novos conflitos da importacao aparecerao aqui."
                  />
                )
              }}
            />
          </Box>
        </Box>
      </Paper>

      <ResolverDialog
        open={Boolean(activeConflict)}
        conflict={activeConflict}
        itemOptions={itemOptions}
        onClose={() => setActiveConflictId(null)}
      />
    </>
  );
}
