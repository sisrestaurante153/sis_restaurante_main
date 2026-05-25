"use client";

import { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { FormSection } from "@/components/ui/FormSection";

export interface PurchaseRow {
  supplierName: string;
  purchaseUnit: string;
  purchaseIsPrimary: boolean;
  purchaseQuantity: string;
  purchaseCost: string;
  priceUpdatedAt: string;
  // D-05: derivacao client-side do principal.
  usageUnit: string;
  usageQuantity: string;
  usageIsFixedFromPrimary: boolean;
}

interface PurchasesEditorProps {
  rows: PurchaseRow[];
  onRowsChange: (rows: PurchaseRow[]) => void;
  supplierOptions?: string[];
  unitOptions?: string[];
  purchaseUnit: string;
  errorMessage?: string;
  // Quick 20260421 T1: mapa de erros per-row indexado por "purchases.N.campo"
  // (preservado em parseItemFormData). Permite listar no Alert exatamente
  // qual campo de qual fornecedor reprovou no Zod — evitando que Fornecedor 2
  // "suma" silenciosamente ao salvar.
  rowErrors?: Record<string, string[] | undefined>;
}

function buildDefaultRow(purchaseUnit: string): PurchaseRow {
  return {
    supplierName: "",
    purchaseUnit,
    purchaseIsPrimary: true,
    purchaseQuantity: "1.0000",
    purchaseCost: "0.0000",
    priceUpdatedAt: new Date().toISOString().slice(0, 10),
    usageUnit: purchaseUnit,
    usageQuantity: "1.0000",
    usageIsFixedFromPrimary: false
  };
}

function buildAdditionalRow(purchaseUnit: string): PurchaseRow {
  // Novo fornecedor secundario: D-05 fixado do 1o; sem defaults de usage (derivado do principal).
  //
  // Quick 20260421 T1: purchaseQuantity e purchaseCost nao sao mais pre-preenchidos
  // com "1.0000" / "0.0000" — o valor "0.0000" passava despercebido e era
  // rejeitado pelo Zod (positiveDecimal > 0), fazendo o Fornecedor 2 nao
  // persistir e "sumir da tela" no reload apos save. Agora string vazia
  // forca o usuario a digitar e permite que o placeholder "0,0000"/"R$ 0,00"
  // seja visto (matcheia HTML update/tela-item-v1.html linhas 335/353).
  return {
    supplierName: "",
    purchaseUnit,
    purchaseIsPrimary: false,
    purchaseQuantity: "",
    purchaseCost: "",
    priceUpdatedAt: new Date().toISOString().slice(0, 10),
    usageUnit: "",
    usageQuantity: "",
    usageIsFixedFromPrimary: true
  };
}

const defaultPurchaseUnitOptions = ["kg", "g", "l", "ml", "un"];

// Badge "fixado do 1o fornecedor" — HTML update/tela-item-v1.html linha 110.
function FixadoBadge() {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 10,
        bgcolor: "#EAF3DE",
        color: "#1B6B2C",
        border: "0.5px solid #C0DD97",
        borderRadius: "4px",
        padding: "1px 6px",
        fontWeight: 500,
        ml: 0.75
      }}
    >
      fixado do 1o fornecedor
    </Box>
  );
}

// Quick 20260421 T1: mapeamento dos codigos de campo para label amigavel
// usados na listagem de erros per-row.
const PURCHASE_FIELD_LABEL: Record<string, string> = {
  supplierName: "Fornecedor",
  purchaseUnit: "Unidade de compra",
  purchaseQuantity: "Quantidade de compra",
  purchaseCost: "Preco de compra",
  priceUpdatedAt: "Atualizado em",
  usageUnit: "Unidade de uso",
  usageQuantity: "Quantidade de uso"
};

function summarizeRowErrors(rowErrors: Record<string, string[] | undefined> | undefined): Array<{
  rowIndex: number;
  field: string;
  message: string;
}> {
  if (!rowErrors) return [];
  const collected: Array<{ rowIndex: number; field: string; message: string }> = [];
  for (const [key, messages] of Object.entries(rowErrors)) {
    if (!messages || messages.length === 0) continue;
    // keys esperadas: "purchases.<index>.<field>"
    const parts = key.split(".");
    if (parts.length !== 3 || parts[0] !== "purchases") continue;
    const rowIndex = Number(parts[1]);
    const field = parts[2];
    if (!Number.isInteger(rowIndex) || rowIndex < 0) continue;
    for (const message of messages) {
      collected.push({ rowIndex, field, message });
    }
  }
  return collected;
}

export function PurchasesEditor({
  rows,
  onRowsChange,
  supplierOptions = [],
  unitOptions = defaultPurchaseUnitOptions,
  purchaseUnit,
  errorMessage,
  rowErrors
}: PurchasesEditorProps) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const serializedRows = JSON.stringify(rows);

  const [primarySwitchMessage, setPrimarySwitchMessage] = useState<string | null>(null);

  // D-05: derivacao client-side do principal.
  const primaryRow = rows.find((row) => row.purchaseIsPrimary);
  const primaryUsageUnit = primaryRow?.usageUnit ?? "";
  const primaryUsageQuantity = primaryRow?.usageQuantity ?? "";

  function updateRow(index: number, patch: Partial<PurchaseRow>) {
    onRowsChange(
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return { ...row, ...patch };
      })
    );
  }

  function removeRow(index: number) {
    onRowsChange(
      rows.length === 1
        ? [buildDefaultRow(purchaseUnit)]
        : rows.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({
            ...row,
            purchaseIsPrimary: rowIndex === 0 ? true : row.purchaseIsPrimary
          }))
    );
  }

  // D-06: tornar secundario em principal, resetar demais, exibir aviso inline transitorio.
  function handleTogglePrimary(index: number) {
    const target = rows[index];
    if (!target) return;
    const newPrimaryName = target.supplierName?.trim() || `Fornecedor ${index + 1}`;
    onRowsChange(
      rows.map((row, rowIndex) => ({
        ...row,
        purchaseIsPrimary: rowIndex === index,
        usageIsFixedFromPrimary: rowIndex !== index
      }))
    );
    setPrimarySwitchMessage(`Campos fixados atualizados a partir de ${newPrimaryName}`);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setPrimarySwitchMessage(null), 3000);
    }
  }

  const quantityTooltip = "Ex.: 1 caixa, 12 un, 5 kg ou o volume total comprado por embalagem.";
  const purchaseQuantityPrompt = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <span>Quantidade de compra</span>
      <Tooltip title={quantityTooltip}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
      </Tooltip>
    </Stack>
  );

  // Pattern readonly verde (HTML linhas 91-93).
  const readonlyGreenSx = {
    "& .MuiInputBase-root": {
      bgcolor: "#EAF3DE"
    },
    "& .MuiInputBase-input": {
      color: "#1B6B2C",
      fontWeight: 500
    }
  } as const;

  const editableWhiteSx = {
    "& .MuiInputBase-root": {
      bgcolor: "#FFFFFF"
    }
  } as const;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      {/* Phase 09.1 gap #2/#5: drop description to match HTML .card-label only
          (update/tela-item-v1.html linha 224 — sem subtitulo descritivo).
          Phase 09.2 A1: botao "+ Adicionar fornecedor" movido do header para o rodape
          do card, alinhando ao HTML (update/tela-item-v1.html linha 364-371). */}
      <FormSection title="Detalhamento de Compras / Fornecedor">
        <input type="hidden" name="purchasesJson" value={serializedRows} />

        {primarySwitchMessage ? (
          <Alert severity="info" sx={{ fontSize: 12, py: 0.5, mb: 1.5 }}>
            {primarySwitchMessage}
          </Alert>
        ) : null}

        {errorMessage ? (
          <Typography color="error.main" variant="body2">
            {errorMessage}
          </Typography>
        ) : null}

        {/* Quick 20260421 T1: lista os erros nested de purchases[N].campo
            que antes eram engolidos pelo .flatten() do Zod. Evita que
            Fornecedor 2 "suma" silenciosamente quando o usuario esquece
            de preencher Preco de compra ou Quantidade de compra. */}
        {(() => {
          const rowErrorEntries = summarizeRowErrors(rowErrors);
          if (rowErrorEntries.length === 0) return null;
          return (
            <Alert severity="error" sx={{ fontSize: 12, mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Revise os campos destacados abaixo:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {rowErrorEntries.map((entry, idx) => {
                  const fieldLabel = PURCHASE_FIELD_LABEL[entry.field] ?? entry.field;
                  return (
                    <li key={`${entry.rowIndex}-${entry.field}-${idx}`}>
                      <Typography variant="body2" component="span">
                        <strong>Fornecedor {entry.rowIndex + 1}</strong> — {fieldLabel}: {entry.message}
                      </Typography>
                    </li>
                  );
                })}
              </Box>
            </Alert>
          );
        })()}

        {desktop ? (
          <Stack spacing={1.5}>
            {rows.map((row, index) => {
              const isPrimary = row.purchaseIsPrimary;
              const displayUsageUnit = isPrimary ? row.usageUnit : primaryUsageUnit;
              const displayUsageQuantity = isPrimary ? row.usageQuantity : primaryUsageQuantity;

              const qc = Number(row.purchaseQuantity) || 0;
              const qu = Number(displayUsageQuantity) || 0;
              const fator = qu > 0 ? qc / qu : null;
              const cost = Number(row.purchaseCost) || 0;
              // D-07: precoUso por fornecedor usa os proprios qc/fator.
              const precoUso = fator && fator > 0 ? cost / fator : null;

              const supplierLabel = isPrimary
                ? `Fornecedor ${index + 1} — Principal`
                : `Fornecedor ${index + 1}`;

              return (
                <Box
                  key={`${row.supplierName}-${index}`}
                  sx={{
                    p: 2.5,
                    border: "0.5px solid",
                    // R10 option-a: inverter — secundarios verdes bate HTML linha 98.
                    borderColor: isPrimary ? "divider" : "#C0DD97",
                    borderRadius: 2,
                    bgcolor: isPrimary ? "#FAFAF9" : "#F0F7E8"
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        color: "text.secondary"
                      }}
                    >
                      {supplierLabel}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {!isPrimary ? (
                        <Button
                          type="button"
                          size="small"
                          variant="text"
                          onClick={() => handleTogglePrimary(index)}
                          sx={{
                            fontSize: 11,
                            color: "#185FA5",
                            textTransform: "none",
                            minWidth: 0
                          }}
                        >
                          Tornar principal
                        </Button>
                      ) : null}
                      {!isPrimary ? (
                        <IconButton
                          aria-label={`Remover fornecedor ${index + 1}`}
                          size="small"
                          onClick={() => removeRow(index)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </Stack>
                  </Stack>

                  {/* Linha 1: Fornecedor | Atualizado em */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: 2,
                      mb: 1.5
                    }}
                  >
                    <Autocomplete
                      freeSolo
                      options={supplierOptions}
                      value={row.supplierName}
                      onInputChange={(_event, value) => updateRow(index, { supplierName: value })}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          size="small"
                          label="Fornecedor"
                          name="purchaseSupplierName"
                          sx={editableWhiteSx}
                        />
                      )}
                    />
                    <input type="hidden" name="purchaseIsPrimary" value={String(row.purchaseIsPrimary)} />
                    <Box>
                      <input type="hidden" name="purchasePriceUpdatedAt" value={row.priceUpdatedAt} />
                      <DateTimePicker
                        label="Atualizado em"
                        format="DD/MM/YYYY, HH:mm"
                        value={row.priceUpdatedAt ? dayjs(row.priceUpdatedAt) : null}
                        onChange={(value) =>
                          updateRow(index, {
                            priceUpdatedAt: value ? value.toISOString() : ""
                          })
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            placeholder: !isPrimary ? "dd/mm/aaaa, hh:mm" : undefined,
                            sx: editableWhiteSx
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Linha A: Unidade de compra | Unidade de uso | (vazio)
                      Quick 20260421 T2: usar grid 1fr 1fr 0.7fr (igual as Linhas B e C)
                      para alinhar Fornecedor 1 (principal) com Fornecedor 2 (secundario)
                      e manter larguras consistentes por card.
                      HTML ref: update/tela-item-v1.html linha 313 (g-3-b com 3a coluna vazia). */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 0.7fr",
                      gap: 2,
                      mb: 1.5
                    }}
                  >
                    {/* Phase 09.2 A2: purchaseUnit editavel por fornecedor. */}
                    <TextField
                      fullWidth
                      size="small"
                      select
                      label="Unidade de compra"
                      value={row.purchaseUnit}
                      onChange={(event) => updateRow(index, { purchaseUnit: event.target.value })}
                      sx={editableWhiteSx}
                    >
                      {unitOptions.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </TextField>
                    <input type="hidden" name="purchaseUnit" value={row.purchaseUnit} />

                    {isPrimary ? (
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label="Unidade de uso"
                        name="purchaseUsageUnit"
                        value={row.usageUnit || ""}
                        onChange={(event) => updateRow(index, { usageUnit: event.target.value })}
                        sx={editableWhiteSx}
                      >
                        {unitOptions.map((unit) => (
                          <MenuItem key={unit} value={unit}>
                            {unit}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <>
                        <TextField
                          fullWidth
                          size="small"
                          label={
                            <>
                              Unidade de uso
                              <FixadoBadge />
                            </>
                          }
                          value={displayUsageUnit || ""}
                          slotProps={{
                            input: { readOnly: true },
                            htmlInput: { "aria-readonly": "true" }
                          }}
                          sx={readonlyGreenSx}
                        />
                        <input type="hidden" name="purchaseUsageUnit" value={displayUsageUnit || ""} />
                      </>
                    )}
                    <Box />
                  </Box>

                  {/* Linha B: Qtde compra | Qtde uso (editavel principal; readonly+badge secundario) | Fator */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 0.7fr",
                      gap: 2,
                      mb: 1.5
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label={purchaseQuantityPrompt}
                      name="purchaseQuantity"
                      type="number"
                      // Phase 09-02 D-15: placeholder pixel-perfect fornecedor 2+
                      // (HTML update/tela-item-v1.html linha 335).
                      placeholder={!isPrimary ? "0,0000" : undefined}
                      slotProps={{ htmlInput: { step: "0.0001" } }}
                      value={row.purchaseQuantity}
                      onChange={(event) => updateRow(index, { purchaseQuantity: event.target.value })}
                      sx={editableWhiteSx}
                    />

                    {isPrimary ? (
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantidade de uso"
                        name="purchaseUsageQuantity"
                        type="number"
                        slotProps={{ htmlInput: { step: "0.0001" } }}
                        value={row.usageQuantity}
                        onChange={(event) => updateRow(index, { usageQuantity: event.target.value })}
                        sx={editableWhiteSx}
                      />
                    ) : (
                      <>
                        <TextField
                          fullWidth
                          size="small"
                          label={
                            <>
                              Quantidade de uso
                              <FixadoBadge />
                            </>
                          }
                          value={displayUsageQuantity || ""}
                          slotProps={{
                            input: { readOnly: true },
                            htmlInput: { "aria-readonly": "true" }
                          }}
                          sx={readonlyGreenSx}
                        />
                        <input type="hidden" name="purchaseUsageQuantity" value={displayUsageQuantity || ""} />
                      </>
                    )}

                    <TextField
                      fullWidth
                      size="small"
                      label="Fator de conversao"
                      value={fator !== null ? fator.toFixed(4) : "--"}
                      slotProps={{
                        input: { readOnly: true },
                        htmlInput: { "aria-readonly": "true" }
                      }}
                      helperText="Calculado automaticamente."
                      sx={readonlyGreenSx}
                    />
                  </Box>

                  {/* Linha C: Preco compra | Preco uso (readonly verde) | vazio */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 0.7fr",
                      gap: 2
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Preco de compra"
                      name="purchaseCost"
                      type="number"
                      // Phase 09-02 D-15: placeholder pixel-perfect fornecedor 2+
                      // (HTML update/tela-item-v1.html linha 353).
                      placeholder={!isPrimary ? "R$ 0,00" : undefined}
                      slotProps={{ htmlInput: { step: "0.0001" } }}
                      value={row.purchaseCost}
                      onChange={(event) => updateRow(index, { purchaseCost: event.target.value })}
                      sx={editableWhiteSx}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Preco de uso"
                      value={precoUso !== null ? precoUso.toFixed(4) : "--"}
                      slotProps={{
                        input: { readOnly: true },
                        htmlInput: { "aria-readonly": "true" }
                      }}
                      helperText="Calculado a partir da compra."
                      sx={readonlyGreenSx}
                    />
                    <Box />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {rows.map((row, index) => (
              <Box
                key={`${row.supplierName}-${index}`}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2
                }}
              >
                <Stack spacing={2}>
                  <Autocomplete
                    freeSolo
                    options={supplierOptions}
                    value={row.supplierName}
                    onInputChange={(_event, value) => updateRow(index, { supplierName: value })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Fornecedor"
                        name="purchaseSupplierName"
                      />
                    )}
                  />
                  <input type="hidden" name="purchaseIsPrimary" value={String(row.purchaseIsPrimary)} />

                  <TextField
                    fullWidth
                    select
                    label="Unidade"
                    value={row.purchaseUnit}
                    onChange={(event) => updateRow(index, { purchaseUnit: event.target.value })}
                  >
                    {unitOptions.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </TextField>
                  <input type="hidden" name="purchaseUnit" value={row.purchaseUnit} />
                  <input type="hidden" name="purchaseUsageUnit" value={row.purchaseIsPrimary ? row.usageUnit : primaryUsageUnit} />
                  <input type="hidden" name="purchaseUsageQuantity" value={row.purchaseIsPrimary ? row.usageQuantity : primaryUsageQuantity} />
                  <Box>{purchaseQuantityPrompt}</Box>

                  <TextField
                    fullWidth
                    label="Quantidade"
                    name="purchaseQuantity"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.0001" } }}
                    value={row.purchaseQuantity}
                    onChange={(event) => updateRow(index, { purchaseQuantity: event.target.value })}
                  />

                  <TextField
                    fullWidth
                    label="Preco"
                    name="purchaseCost"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.0001" } }}
                    value={row.purchaseCost}
                    onChange={(event) => updateRow(index, { purchaseCost: event.target.value })}
                  />

                  <input type="hidden" name="purchasePriceUpdatedAt" value={row.priceUpdatedAt} />
                  <DateTimePicker
                    label="Atualizado em"
                    format="DD/MM/YYYY, HH:mm"
                    value={row.priceUpdatedAt ? dayjs(row.priceUpdatedAt) : null}
                    onChange={(value) =>
                      updateRow(index, {
                        priceUpdatedAt: value ? value.toISOString() : ""
                      })
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small"
                      }
                    }}
                  />

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <IconButton
                      aria-label={`Remover fornecedor ${index + 1}`}
                      size="small"
                      onClick={() => removeRow(index)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Phase 09.2 A1: "+ Adicionar fornecedor" no rodape do card (HTML linha 364-371). */}
        <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 0 }}>
          <Button
            type="button"
            variant="text"
            startIcon={<AddIcon />}
            onClick={() =>
              onRowsChange([
                ...rows.map((row, index) => ({
                  ...row,
                  purchaseIsPrimary: index === 0 ? row.purchaseIsPrimary : false
                })),
                buildAdditionalRow(purchaseUnit)
              ])
            }
          >
            Adicionar fornecedor
          </Button>
        </Box>
      </FormSection>
    </LocalizationProvider>
  );
}
