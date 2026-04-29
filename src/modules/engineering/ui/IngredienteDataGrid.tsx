"use client";

import { useEffect, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ComponentEditorRow, ComponentOption } from "@/modules/engineering/ui/components-editor.types";

// Quick 20260424 fase2 #1: COD na grade Montagem e Descartaveis.
// Padrao identico ao CodeInput de FichaFlatGrid (commit 0dd6c34): o usuario
// digita o codigo do item; no blur ou Enter, faz match case-insensitive em
// ComponentOption.code e dispara onMatch para autofill do Item.
function CodeInput({
  itemOptions,
  currentCode,
  onMatch
}: {
  itemOptions: ComponentOption[];
  currentCode: string;
  onMatch: (option: ComponentOption) => void;
}) {
  const [value, setValue] = useState(currentCode);
  useEffect(() => {
    setValue(currentCode);
  }, [currentCode]);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(currentCode);
      return;
    }
    const match = itemOptions.find(
      (i) => (i.code ?? "").toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      onMatch(match);
    } else {
      setValue(currentCode);
    }
  };

  return (
    <TextField
      fullWidth
      size="small"
      label="Cod."
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      slotProps={{ htmlInput: { style: { fontSize: 11 } } }}
    />
  );
}

interface IngredienteDataGridProps {
  rows: Array<{ row: ComponentEditorRow; index: number }>;
  itemOptions: ComponentOption[];
  onUpdateRow: (index: number, patch: Partial<ComponentEditorRow>) => void;
  onRemoveRow: (index: number) => void;
  onReorderRows?: (from: number, to: number) => void;
  quantityHeaderLabel?: string;
  costHeaderLabel?: string;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

function inferDisplayType(option?: ComponentOption, fallback?: string) {
  return (option?.type ?? fallback ?? "").replaceAll("_", " ");
}

function calculateSubtotal(row: ComponentEditorRow, itemOptions: ComponentOption[]) {
  const option = itemOptions.find((item) => item.id === row.itemId);
  return (Number(option?.currentCost ?? "0") || 0) * Number(row.quantityUsed || "0");
}

function DragHandle() {
  return (
    <Box
      aria-hidden
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "2px",
        opacity: 0.35,
        cursor: "grab",
        p: "2px",
        "&:hover": { opacity: 0.7 },
        "&:active": { cursor: "grabbing" }
      }}
    >
      {[0, 1, 2].map((rowKey) => (
        <Box key={rowKey} sx={{ display: "flex", gap: "2px" }}>
          {[0, 1].map((dotKey) => (
            <Box
              key={dotKey}
              sx={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                bgcolor: "#888780"
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function IngredienteDataGrid({
  rows,
  itemOptions,
  onUpdateRow,
  onRemoveRow,
  onReorderRows,
  quantityHeaderLabel = "Qtde Usada",
  costHeaderLabel = "Custo Insumo"
}: IngredienteDataGridProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const headerSx = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: "text.secondary",
    textTransform: "uppercase" as const
  };

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box
        role="table"
        aria-label="Ingredientes da etapa"
        sx={{
          // Quick 20260424 fase2 #1: +72px (Cod) + 8px (gap) -> 1060.
          minWidth: 1060,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Box
          role="row"
          sx={{
            display: "grid",
            gridTemplateColumns: "24px 72px minmax(220px, 1fr) 120px 80px 110px 100px 110px 110px 40px",
            gap: 1,
            px: 1,
            py: 1,
            borderBottom: "0.5px solid",
            borderColor: "divider",
            alignItems: "center"
          }}
        >
          <Box />
          <Typography role="columnheader" sx={headerSx}>
            Cod.
          </Typography>
          <Typography role="columnheader" sx={headerSx}>
            Item / Produto
          </Typography>
          <Typography role="columnheader" sx={headerSx}>
            Tipo
          </Typography>
          <Typography role="columnheader" sx={{ ...headerSx, textAlign: "right" }}>
            {quantityHeaderLabel}
          </Typography>
          <Typography role="columnheader" sx={headerSx}>
            Unidade
          </Typography>
          <Typography role="columnheader" sx={{ ...headerSx, textAlign: "right" }}>
            Custo Unit.
          </Typography>
          <Typography role="columnheader" sx={{ ...headerSx, textAlign: "right" }}>
            {costHeaderLabel}
          </Typography>
          <Typography role="columnheader" sx={headerSx}>
            Camada
          </Typography>
          <Box />
        </Box>

        {rows.length === 0 ? (
          <Box sx={{ py: 3, px: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>
            Nenhum ingrediente adicionado a esta etapa ainda.
          </Box>
        ) : null}

        {rows.map(({ row, index }) => {
          const option = itemOptions.find((item) => item.id === row.itemId);
          const subtotal = calculateSubtotal(row, itemOptions);

          return (
            <Box
              key={index}
              role="row"
              draggable={Boolean(onReorderRows)}
              onDragStart={(event) => {
                if (!onReorderRows) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
                setDraggingIndex(index);
              }}
              onDragOver={(event) => {
                if (!onReorderRows) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setHoverIndex(index);
              }}
              onDragLeave={() => {
                if (hoverIndex === index) setHoverIndex(null);
              }}
              onDrop={(event) => {
                if (!onReorderRows) return;
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                setDraggingIndex(null);
                setHoverIndex(null);
                if (Number.isFinite(from) && from !== index) {
                  onReorderRows(from, index);
                }
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setHoverIndex(null);
              }}
              sx={{
                display: "grid",
                gridTemplateColumns: "24px 72px minmax(220px, 1fr) 120px 80px 110px 100px 110px 110px 40px",
                gap: 1,
                px: 1,
                py: 1.25,
                borderBottom: "0.5px solid",
                borderColor: "divider",
                alignItems: "center",
                bgcolor:
                  draggingIndex === index
                    ? "rgba(24,95,165,0.05)"
                    : hoverIndex === index
                      ? "rgba(24,95,165,0.08)"
                      : "transparent",
                transition: "background-color 120ms ease",
                "&:hover": { bgcolor: draggingIndex === index ? "rgba(24,95,165,0.05)" : "#FAFAF9" }
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                {onReorderRows ? <DragHandle /> : null}
              </Box>

              {/* Quick 20260424 fase2 #1: COD picker, mesmo padrao da FichaFlatGrid. */}
              <CodeInput
                itemOptions={itemOptions}
                currentCode={option?.code ?? ""}
                onMatch={(matched) =>
                  onUpdateRow(index, {
                    itemId: matched.id,
                    usageUnit: matched.usageUnit ?? row.usageUnit,
                    componentType:
                      matched.type === "embalagem"
                        ? "embalagem"
                        : matched.type === "apoio"
                          ? "apoio"
                          : "ingrediente"
                  })
                }
              />

              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Item"
                  value={row.itemId}
                  onChange={(event) => {
                    const nextItem = itemOptions.find((item) => item.id === event.target.value);
                    onUpdateRow(index, {
                      itemId: event.target.value,
                      usageUnit: nextItem?.usageUnit ?? row.usageUnit,
                      componentType:
                        nextItem?.type === "embalagem"
                          ? "embalagem"
                          : nextItem?.type === "apoio"
                            ? "apoio"
                            : "ingrediente"
                    });
                  }}
                >
                  {itemOptions.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {row.levelLabel ? (
                    <Box
                      component="span"
                      sx={{
                        fontSize: 10,
                        bgcolor: "#E6F1FB",
                        color: "#185FA5",
                        border: "0.5px solid #B5D4F4",
                        borderRadius: "4px",
                        px: "5px",
                        py: "1px",
                        fontWeight: 600,
                        lineHeight: 1.4
                      }}
                    >
                      {row.levelLabel}
                    </Box>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {option?.operationalCategory ?? "Sem grupo"}
                  </Typography>
                </Stack>
              </Stack>

              <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                {inferDisplayType(option, row.componentType)}
              </Typography>

              <TextField
                fullWidth
                size="small"
                type="number"
                label="Qtde"
                value={row.quantityUsed}
                slotProps={{ htmlInput: { step: "0.0001", style: { textAlign: "right" } } }}
                onChange={(event) => onUpdateRow(index, { quantityUsed: event.target.value })}
              />

              <TextField
                fullWidth
                size="small"
                label="Unidade"
                value={row.usageUnit}
                onChange={(event) => onUpdateRow(index, { usageUnit: event.target.value })}
              />

              <Box sx={{ textAlign: "right", fontSize: 13, fontWeight: 500 }}>
                {formatCurrency(option?.currentCost ?? "0")}
              </Box>

              <Box sx={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: "custom.custo" }}>
                {formatCurrency(subtotal)}
              </Box>

              <Typography variant="body2" color="text.secondary">
                {row.levelLabel ?? "--"}
              </Typography>

              <IconButton
                aria-label={`Remover item ${index + 1}`}
                size="small"
                onClick={() => onRemoveRow(index)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
