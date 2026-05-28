"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DecimalTextField } from "@/components/ui/DecimalTextField";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type {
  ComponentEditorRow,
  ComponentOption,
  StageTypeOption
} from "@/modules/engineering/ui/components-editor.types";
import { MONTAGEM_CODE } from "@/modules/engineering/ui/ficha-flat-rows";

// SPEC-FICHA-FIDELIDADE: templates batendo 1:1 o HTML tela-ficha-tecnica-v2.html
// (ver .grade-header/.item-row linhas 64-65 do HTML).
// Quick 20260424: nova coluna "Cod." (72px) entre drag handle e Item;
// Qtde bumped 80px -> 110px (zero cortado reportado pelo cliente);
// CF_GRID_TEMPLATE removido — Coccao Final agora alinha ao GRID_TEMPLATE.
// Quick 20260424 fase2 #5: nova coluna FC/IC (90px) entre Peso e Custo unit. —
// campo dedicado read-only com chip verde estilo Coccao Final, label dinamico
// (FC para limpeza, IC para coccao). 10 cols ao todo.
export const GRID_TEMPLATE = "22px 72px 1fr 110px 80px 240px 90px 90px 96px 28px";

const DEFAULT_UNITS = ["kg", "g", "l", "ml", "un"];

const HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: "#888780",
  textTransform: "uppercase" as const
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function calculateSubtotal(row: ComponentEditorRow, itemOptions: ComponentOption[]) {
  const option = itemOptions.find((item) => item.id === row.itemId);
  return (Number(option?.currentCost ?? "0") || 0) * Number(row.quantityUsed || "0");
}

function DragHandle({ disabled = false }: { disabled?: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "2px",
        opacity: disabled ? 0.15 : 0.35,
        cursor: disabled ? "default" : "grab",
        p: "2px",
        "&:hover": { opacity: disabled ? 0.15 : 0.7 },
        "&:active": { cursor: disabled ? "default" : "grabbing" }
      }}
    >
      {[0, 1, 2].map((rowKey) => (
        <Box key={rowKey} sx={{ display: "flex", gap: "2px" }}>
          {[0, 1].map((dotKey) => (
            <Box key={dotKey} sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#888780" }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// Quick 20260424: subcomponente que aceita digitacao livre do codigo e
// commit (no blur ou Enter). Match case-insensitive contra ComponentOption.code.
function CodeInput({
  itemOptions,
  currentCode,
  onMatch,
  onNotFound
}: {
  itemOptions: ComponentOption[];
  currentCode: string;
  onMatch: (option: ComponentOption) => void;
  onNotFound: (query: string) => void;
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
      // Bug 3: em vez de reverter silenciosamente, oferece cadastro
      onNotFound(trimmed);
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

// Quick 20260424 fase2 #7: substitui TextField select "Tipo de etapa" (40px altura)
// por Chip compacto colorido (24px altura) + Menu MUI para troca. Reduz altura
// vertical da linha em ~16-20px e libera ~30-40px horizontais para o campo Peso
// (subgrid Etapa | Peso re-balanceado de 1fr/1fr para 80px/1fr).
function stageChipTokens(stageCode: string, stageLabel: string) {
  switch (stageCode) {
    case "limpeza_pre_preparo":
      return { shortLabel: "LIMPEZA", bg: "#E6F1FB", fg: "#185FA5", border: "#B5D4F4" };
    case "coccao_preparo":
      return { shortLabel: "COCCAO", bg: "#FFFDF5", fg: "#854F0B", border: "#FAC775" };
    case "montagem":
      return { shortLabel: "MONT.", bg: "#EAF3DE", fg: "#1B6B2C", border: "#C0DD97" };
    default:
      return {
        shortLabel: (stageLabel || "ETAPA").toUpperCase(),
        bg: "#F5F4F0",
        fg: "#888780",
        border: "#D3D1C7"
      };
  }
}

function StageTypeChip({
  stageCode,
  stageLabel,
  stageTypes,
  onChange
}: {
  stageCode: string;
  stageLabel: string;
  stageTypes: StageTypeOption[];
  onChange: (option: StageTypeOption) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tokens = stageChipTokens(stageCode, stageLabel);
  return (
    <>
      <Chip
        label={tokens.shortLabel}
        size="small"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={`Tipo de etapa: ${tokens.shortLabel}. Clique para alterar.`}
        sx={{
          height: 24,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.04em",
          bgcolor: tokens.bg,
          color: tokens.fg,
          border: `1px solid ${tokens.border}`,
          borderRadius: "4px",
          cursor: "pointer",
          "& .MuiChip-label": { px: 0.75 },
          "&:hover": { bgcolor: tokens.bg, opacity: 0.85 }
        }}
        // Inline style adicional para permitir assertion confiavel em jsdom
        // (sx do MUI resolve para CSS classes que jsdom nao computa).
        style={{ backgroundColor: tokens.bg, color: tokens.fg, borderColor: tokens.border }}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { fontSize: 11 } } }}
      >
        {stageTypes.map((opt) => (
          <MenuItem
            key={opt.id}
            dense
            onClick={() => {
              onChange(opt);
              setAnchor(null);
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Ajuste 1: autocomplete de item com suporte a Tab (seleciona o item destacado
// e move o foco) e Enter (MUI já trata quando o dropdown está aberto).
function ItemAutocomplete({
  row,
  index,
  itemOptions,
  duplicateItemIds,
  onUpdateRow,
  showRowErrors,
  onSelectNext
}: {
  row: ComponentEditorRow;
  index: number;
  itemOptions: ComponentOption[];
  duplicateItemIds?: ReadonlySet<string>;
  onUpdateRow: (index: number, patch: Partial<ComponentEditorRow>) => void;
  showRowErrors?: boolean;
  onSelectNext?: () => void;
}) {
  const highlightedRef = useRef<ComponentOption | null>(null);

  const handleSelect = (item: ComponentOption) => {
    onUpdateRow(index, {
      itemId: item.id,
      usageUnit: item.usageUnit ?? row.usageUnit,
      componentType:
        item.type === "embalagem" ? "embalagem"
        : item.type === "apoio" ? "apoio"
        : "ingrediente"
    });
    setTimeout(() => {
      onSelectNext?.();
    }, 50);
  };

  const option = itemOptions.find((item) => item.id === row.itemId) ?? null;

  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Autocomplete
        fullWidth
        size="small"
        options={itemOptions}
        getOptionLabel={(opt) => opt.name}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        value={option}
        onChange={(_event, nextItem) => {
          if (!nextItem) return;
          handleSelect(nextItem);
        }}
        onHighlightChange={(_event, highlighted) => {
          highlightedRef.current = highlighted;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Item"
            error={showRowErrors && !row.itemId}
            helperText={showRowErrors && !row.itemId ? "Selecione um item" : undefined}
            onKeyDown={(event) => {
              // Tab com item destacado: seleciona sem preventDefault
              // (o Tab ainda move o foco para o próximo campo)
              if (event.key === "Tab" && highlightedRef.current) {
                handleSelect(highlightedRef.current);
              } else if (event.key === "Enter") {
                if (highlightedRef.current) {
                  handleSelect(highlightedRef.current);
                  event.preventDefault();
                } else if (option) {
                  event.preventDefault();
                  onSelectNext?.();
                }
              }
            }}
          />
        )}
        noOptionsText="Nenhum item encontrado"
      />
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
        {row.itemId && duplicateItemIds?.has(row.itemId) ? (
          <Tooltip title="Este item ja aparece nesta ficha. Revise antes de duplicar o componente." arrow>
            <WarningAmberIcon
              aria-label="Item duplicado nesta ficha"
              sx={{ fontSize: 14, color: "#B45309", cursor: "help" }}
            />
          </Tooltip>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {option?.operationalCategory ?? "Sem grupo"}
        </Typography>
      </Stack>
    </Stack>
  );
}

interface FichaFlatGridProps {
  rows: ComponentEditorRow[];
  itemOptions: ComponentOption[];
  stageTypeOptions: StageTypeOption[];
  unitOptions?: string[];
  // Quick 20260424 fase2 #2: ids de itens duplicados na ficha; cada linha
  // afetada exibe um icone de alerta com Tooltip (sem poluir a tela com Alert).
  duplicateItemIds?: Set<string>;
  // Ajuste 1/2: quando true, linhas sem item selecionado ficam vermelhas e a
  // grade rola até a primeira linha inválida.
  showRowErrors?: boolean;
  onUpdateRow: (index: number, patch: Partial<ComponentEditorRow>) => void;
  onRemoveRow: (index: number) => void;
  onReorderRows?: (from: number, to: number) => void;
  onAddRow: () => void;
  onAddCoccaoFinal: () => void;
  hasCoccaoFinal: boolean;
}

export function FichaFlatGrid({
  rows,
  itemOptions,
  stageTypeOptions,
  unitOptions,
  duplicateItemIds,
  showRowErrors,
  onUpdateRow,
  onRemoveRow,
  onReorderRows,
  onAddRow,
  onAddCoccaoFinal,
  hasCoccaoFinal
}: FichaFlatGridProps) {
  const router = useRouter();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const qtyRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!showRowErrors) return;
    const firstError = containerRef.current?.querySelector<HTMLElement>('[data-row-has-error="true"]');
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showRowErrors]);
  // Bug 3: guarda o código digitado que não foi encontrado para exibir o modal
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [refreshedAfterCreate, setRefreshedAfterCreate] = useState(false);

  const regularStageTypes = stageTypeOptions.filter((option) => option.code !== MONTAGEM_CODE);
  const regularRowIndices = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.isCoccaoFinal);
  const coccaoFinalEntry = rows
    .map((row, index) => ({ row, index }))
    .find(({ row }) => row.isCoccaoFinal);

  const resolvedUnitOptions = unitOptions && unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS;

  // Quick 20260424 item 5.2: IC do Coccao Final = rendimento_porcao / soma_qtde_usada.
  const totalRegularQty = regularRowIndices.reduce(
    (sum, { row }) => sum + (Number(row.quantityUsed || "0") || 0),
    0
  );
  const coccaoFinalRendimento = Number(coccaoFinalEntry?.row.outputWeight || "0") || 0;
  const icFinal =
    totalRegularQty > 0 && coccaoFinalRendimento > 0 ? coccaoFinalRendimento / totalRegularQty : null;
  const icFinalLabel = icFinal !== null ? `${Math.round(icFinal * 100)}%` : "--";

  return (
    <>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box ref={containerRef} role="table" aria-label="Estrutura da ficha tecnica" sx={{ minWidth: 1210, display: "flex", flexDirection: "column" }}>
        <Box
          role="row"
          sx={{
            display: "grid",
            gridTemplateColumns: GRID_TEMPLATE,
            gap: 1,
            px: 1,
            py: 1,
            borderBottom: "0.5px solid",
            borderColor: "#D3D1C7",
            alignItems: "center"
          }}
        >
          <Box />
          <Typography role="columnheader" sx={HEADER_SX}>Cod.</Typography>
          <Typography role="columnheader" sx={HEADER_SX}>Item / Produto</Typography>
          <Typography role="columnheader" sx={HEADER_SX}>Qtde usada</Typography>
          <Typography role="columnheader" sx={HEADER_SX}>Unidade</Typography>
          {/* Quick 20260424 fase2 #7: subgrid Etapa|Peso re-balanceado de 1fr/1fr
              para 80px/1fr — chip compacto + Peso ganha ~30-40px efetivos. */}
          <Box sx={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 0.75 }}>
            <Typography role="columnheader" sx={HEADER_SX}>Etapa</Typography>
            <Typography role="columnheader" sx={HEADER_SX}>Peso</Typography>
          </Box>
          {/* Quick 20260424 fase2 #5: header da nova coluna FC/IC (label dinamico por linha). */}
          <Typography role="columnheader" sx={{ ...HEADER_SX, textAlign: "center" }}>FC / IC</Typography>
          <Typography role="columnheader" sx={{ ...HEADER_SX, textAlign: "center" }}>Custo unit.</Typography>
          <Typography role="columnheader" sx={{ ...HEADER_SX, textAlign: "center" }}>Custo insumo</Typography>
          <Box />
        </Box>

        {regularRowIndices.length === 0 ? (
          <Box sx={{ py: 3, px: 2, textAlign: "center", color: "text.secondary", fontSize: 12 }}>
            Nenhum ingrediente adicionado. Use o botao Adicionar Itens abaixo.
          </Box>
        ) : null}

        {regularRowIndices.map(({ row, index }) => {
          const option = itemOptions.find((item) => item.id === row.itemId);
          const subtotal = calculateSubtotal(row, itemOptions);
          const stageCode = row.stageTypeCode;
          const pesoLabel =
            stageCode === "limpeza_pre_preparo"
              ? "Peso Limpo"
              : stageCode === "coccao_preparo"
                ? "Peso Pos-coccao"
                : "Peso Final";
          // Quick 20260424 fase2 #3 (revisao 2): cliente quer ver o CALCULO
          // expandido na linha (igual planilha do Excel), nao so o resultado.
          //   FC (Limpeza)  = peso_limpo      / qtde_usada
          //   IC (Coccao)   = peso_pos_coccao / qtde_usada
          // Hint exibido: "FC = 0.185/0.22 = 84%" ou "IC = 0.18/0.18 = 100%".
          const qty = Number(row.quantityUsed || "0") || 0;
          const out = Number(row.outputWeight || "0") || 0;
          const factor = qty > 0 && out > 0 ? out / qty : null;
          const factorLabel = factor !== null ? `${Math.round(factor * 100)}%` : "--";
          const factorPrefix =
            stageCode === "limpeza_pre_preparo"
              ? "FC"
              : stageCode === "coccao_preparo"
                ? "IC"
                : "";
          const fmtNum = (n: number) => Number(n.toFixed(3)).toString().replace(".", ",");

          return (
            <Box key={`${row.itemId}-${index}`} data-row-has-error={showRowErrors && !row.itemId ? "true" : undefined}>
            <Box
              role="row"
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
                gridTemplateColumns: GRID_TEMPLATE,
                gap: 1,
                px: 1,
                py: 1.25,
                borderBottom: "0.5px solid",
                borderColor: "#D3D1C7",
                alignItems: "start",
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
              <Box
                draggable={Boolean(onReorderRows)}
                onDragStart={onReorderRows ? (event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  setDraggingIndex(index);
                } : undefined}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                {onReorderRows ? <DragHandle /> : null}
              </Box>

              {/* Quick 20260424 item 1: picker por codigo (commit no blur/Enter). */}
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
                onNotFound={(query) => {
                  setNotFoundQuery(query);
                  setRefreshedAfterCreate(false);
                }}
              />

              {/* Ajuste 1: ItemAutocomplete com suporte a Tab/Enter */}
              <ItemAutocomplete
                row={row}
                index={index}
                itemOptions={itemOptions}
                duplicateItemIds={duplicateItemIds}
                onUpdateRow={onUpdateRow}
                showRowErrors={showRowErrors}
                onSelectNext={() => {
                  qtyRefs.current[index]?.focus();
                  qtyRefs.current[index]?.select();
                }}
              />

              {/* Ajuste 3: DecimalTextField para quantidade (vírgula, 3 casas) */}
              <DecimalTextField
                fullWidth
                size="small"
                label="Qtde"
                value={row.quantityUsed}
                inputStyle={{ paddingRight: 8 }}
                onChange={(value) => onUpdateRow(index, { quantityUsed: value })}
                inputRef={(el: HTMLInputElement | null) => {
                  qtyRefs.current[index] = el;
                }}
              />

              {/* Quick 20260424 item 3: Unidade vira select; Ajuste 2: conversão kg↔g */}
              <TextField
                fullWidth
                select
                size="small"
                label="Unidade"
                value={row.usageUnit || ""}
                onChange={(event) => {
                  const newUnit = event.target.value;
                  const oldUnit = row.usageUnit;
                  if ((oldUnit === "kg" && newUnit === "g") || (oldUnit === "g" && newUnit === "kg")) {
                    const num = parseFloat(row.quantityUsed.replace(",", "."));
                    if (!isNaN(num)) {
                      const converted = oldUnit === "kg" ? num * 1000 : num / 1000;
                      onUpdateRow(index, { usageUnit: newUnit, quantityUsed: converted.toFixed(4) });
                      return;
                    }
                  }
                  onUpdateRow(index, { usageUnit: newUnit });
                }}
              >
                {/* Garante exibicao do valor atual mesmo se nao estiver na lista. */}
                {row.usageUnit && !resolvedUnitOptions.includes(row.usageUnit) ? (
                  <MenuItem key={`current-${row.usageUnit}`} value={row.usageUnit}>
                    {row.usageUnit}
                  </MenuItem>
                ) : null}
                {resolvedUnitOptions.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>

              {stageCode ? (
                // Quick 20260424 fase2 #7: subgrid Etapa|Peso re-balanceado de
                // 1fr/1fr para 80px/1fr. Coluna Etapa vira Chip compacto colorido
                // (24px altura) com Menu MUI para troca — antes era TextField select
                // outlined (40px altura), causa direta do scroll vertical e do Peso
                // pequenininho reportados pelo cliente.
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr",
                    gap: 0.75,
                    alignItems: "start"
                  }}
                >
                  <Stack spacing={0.25} sx={{ alignSelf: "center" }}>
                    <StageTypeChip
                      stageCode={row.stageTypeCode ?? ""}
                      stageLabel={row.stageTypeLabel ?? ""}
                      stageTypes={regularStageTypes}
                      onChange={(nextType) =>
                        onUpdateRow(index, {
                          stageTypeId: nextType.id,
                          stageTypeCode: nextType.code,
                          stageTypeLabel: nextType.label
                        })
                      }
                    />
                  </Stack>
                  <Stack spacing={0.25}>
                    {/* Ajuste 3: DecimalTextField para peso de saída */}
                    <DecimalTextField
                      fullWidth
                      size="small"
                      label={pesoLabel}
                      placeholder="Qtde Final"
                      value={row.outputWeight ?? ""}
                      onChange={(value) => onUpdateRow(index, { outputWeight: value })}
                      onBlur={(event) => {
                        const raw = event.target.value.replace(",", ".");
                        const num = parseFloat(raw);
                        if (!raw.trim() || isNaN(num) || num === 0) {
                          onUpdateRow(index, {
                            stageTypeId: undefined,
                            stageTypeCode: undefined,
                            stageTypeLabel: undefined,
                            outputWeight: ""
                          });
                        }
                      }}
                    />
                    {/* Quick 20260424 fase2 #5 rev3: hint embaixo do Peso volta pra
                        spacer invisivel — o calculo agora vive na coluna FC/IC dedicada. */}
                    <Typography variant="caption" sx={{ fontSize: 10, pl: 0.5, visibility: "hidden" }}>
                      &nbsp;
                    </Typography>
                  </Stack>
                </Box>
              ) : (
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const firstType = regularStageTypes[0];
                    if (!firstType) return;
                    onUpdateRow(index, {
                      stageTypeId: firstType.id,
                      stageTypeCode: firstType.code,
                      stageTypeLabel: firstType.label
                    });
                  }}
                  sx={{
                    alignSelf: "center",
                    borderColor: "#B5D4F4",
                    bgcolor: "#E6F1FB",
                    color: "#185FA5",
                    textTransform: "none",
                    fontSize: 11,
                    py: 0.5,
                    "&:hover": { bgcolor: "#D4E8F7", borderColor: "#185FA5" }
                  }}
                >
                  + Adicionar Etapa
                </Button>
              )}

              {/* Quick 20260424 fase2 #5: campo dedicado FC/IC. Label dinamico por linha.
                  fase2 #6: cor condicional — verde se factor >= 1 (manteve/ganhou peso),
                  vermelho se factor < 1 (perda de peso = "negativo" no vocabulario do
                  cliente), cinza se vazio. Tooltip no hover mostra a formula expandida
                  pra o cliente conferir o calculo. */}
              <Tooltip
                arrow
                title={
                  factor !== null
                    ? `${factorPrefix} = ${pesoLabel.toLowerCase()} / qtde usada = ${fmtNum(out)} / ${fmtNum(qty)} = ${factorLabel}`
                    : "Preencha Qtde e Peso para calcular."
                }
              >
                <TextField
                  fullWidth
                  size="small"
                  label={factorPrefix || "FC / IC"}
                  value={factor !== null ? factorLabel : ""}
                  slotProps={{
                    input: { readOnly: true },
                    htmlInput: { style: { textAlign: "center", fontWeight: 600 } }
                  }}
                  sx={
                    factor === null
                      ? { "& .MuiOutlinedInput-root": { bgcolor: "#F5F4F0", color: "#888780" } }
                      : factor < 1
                        ? { "& .MuiOutlinedInput-root": { bgcolor: "#FDE7E9", color: "#8B1B2A" } }
                        : { "& .MuiOutlinedInput-root": { bgcolor: "#EAF3DE", color: "#1B6B2C" } }
                  }
                />
              </Tooltip>

              <Box sx={{ textAlign: "center", fontSize: 13, fontWeight: 500 }}>
                {formatCurrency(option?.currentCost ?? "0")}
              </Box>

              <Box sx={{ textAlign: "center", fontSize: 13, fontWeight: 500 }}>
                {formatCurrency(subtotal)}
              </Box>

              <IconButton type="button" aria-label={`Remover item ${index + 1}`} size="small" onClick={() => onRemoveRow(index)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
            </Box>
          );
        })}

        {/* Quick 20260424 item 5.1: Coccao Final usa o mesmo GRID_TEMPLATE das linhas.
            Quick 20260424 fase2 #5: IC final agora vive na coluna FC/IC dedicada (slot 7);
            slots 8 (Custo unit) e 9 (Custo insumo) ficam vazios. */}
        {coccaoFinalEntry ? (
          <Box
            role="row"
            sx={{
              display: "grid",
              gridTemplateColumns: GRID_TEMPLATE,
              gap: 1,
              px: 1.25,
              py: 1.25,
              mt: 1,
              alignItems: "center",
              bgcolor: "#FFFDF5",
              border: "0.5px dashed #FAC775",
              borderRadius: 1
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <DragHandle disabled />
            </Box>
            <Box />
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: "#854F0B",
                whiteSpace: "nowrap",
                alignSelf: "center"
              }}
            >
              Coccao / Preparo Final
            </Typography>
            <Box />
            <Box />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
              <TextField
                fullWidth
                size="small"
                label="Tipo de etapa"
                value="Coccao / Preparo"
                slotProps={{ input: { readOnly: true }, htmlInput: { style: { fontSize: 12 } } }}
              />
              {/* Ajuste 3: DecimalTextField para rendimento da coccão final */}
              <DecimalTextField
                fullWidth
                required
                size="small"
                label="Rendimento da Porcao"
                placeholder="Qtde Final"
                value={coccaoFinalEntry.row.outputWeight ?? ""}
                onChange={(value) => onUpdateRow(coccaoFinalEntry.index, { outputWeight: value })}
              />
            </Box>
            {/* Slot 7: FC/IC dedicada — IC do Coccao Final cai aqui.
                fase2 #6: mesma regra de cor condicional das linhas regulares
                (vermelho se <100%, verde se >=100%) + tooltip com formula. */}
            <Tooltip
              arrow
              title={
                icFinal !== null
                  ? `IC = rendimento da porcao / soma qtde usada = ${Number(coccaoFinalRendimento.toFixed(4)).toString()} / ${Number(totalRegularQty.toFixed(4)).toString()} = ${icFinalLabel}`
                  : "Preencha o Rendimento da Porcao para calcular."
              }
            >
              <TextField
                fullWidth
                size="small"
                label="IC"
                value={icFinalLabel}
                slotProps={{
                  input: { readOnly: true },
                  htmlInput: { style: { textAlign: "center", fontWeight: 600 } }
                }}
                sx={
                  icFinal === null
                    ? { "& .MuiOutlinedInput-root": { bgcolor: "#F5F4F0", color: "#888780" } }
                    : icFinal < 1
                      ? { "& .MuiOutlinedInput-root": { bgcolor: "#FDE7E9", color: "#8B1B2A" } }
                      : { "& .MuiOutlinedInput-root": { bgcolor: "#EAF3DE", color: "#1B6B2C" } }
                }
              />
            </Tooltip>
            {/* Slot 8 (Custo unit) e Slot 9 (Custo insumo): vazios no Coccao Final. */}
            <Box />
            <Box />
            <IconButton
              type="button"
              aria-label="Remover Coccao Final"
              size="small"
              onClick={() => onRemoveRow(coccaoFinalEntry.index)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : null}

        <Stack direction="row" justifyContent="flex-end" spacing={1.25} sx={{ pt: 1.5, pb: 0.5, px: 1 }}>
          {!hasCoccaoFinal ? (
            <Button
              type="button"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddCoccaoFinal}
              sx={{ borderColor: "#185FA5", color: "#185FA5", borderWidth: 1.5 }}
            >
              Adicionar Coccao Final
            </Button>
          ) : null}
          <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={onAddRow}>
            Adicionar Itens
          </Button>
        </Stack>
      </Box>
    </Box>

    {/* Bug 3: Modal exibido quando o código digitado não corresponde a nenhum item */}
    <Dialog open={notFoundQuery !== null} onClose={() => setNotFoundQuery(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Item não encontrado</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14, color: "#4A4741" }}>
          Nenhum item com o código{" "}
          <Box component="strong" sx={{ fontFamily: "monospace" }}>
            {notFoundQuery}
          </Box>{" "}
          foi encontrado. Deseja cadastrá-lo?
        </Typography>
        {refreshedAfterCreate && (
          <Typography sx={{ fontSize: 13, color: "#0E8A4F", mt: 1.5, fontWeight: 600 }}>
            ✓ Lista atualizada. Agora você pode buscar o item pelo código ou nome.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          size="small"
          onClick={() => setNotFoundQuery(null)}
          sx={{ color: "#888780" }}
        >
          Fechar
        </Button>
        {!refreshedAfterCreate && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              router.refresh();
              setRefreshedAfterCreate(true);
            }}
            sx={{ borderColor: "#185FA5", color: "#185FA5" }}
          >
            Já cadastrei — atualizar lista
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          onClick={() => window.open("/itens/novo", "_blank")}
          sx={{ bgcolor: "#185FA5", "&:hover": { bgcolor: "#0C447C" } }}
        >
          Cadastrar item
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
