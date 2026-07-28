"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { FormSection } from "@/components/ui/FormSection";
import { saveItemAction, type CatalogFormState } from "@/modules/catalog/server/catalog-actions";
import { PurchasesEditor, type PurchaseRow } from "@/modules/catalog/ui/purchases-editor";

interface ItemFormProps {
  formId?: string;
  typeOptions?: Array<{
    value: string;
    label: string;
  }>;
  operationalCategoryOptions?: string[];
  unitOptions?: string[];
  supplierOptions?: string[];
  // Preseta o campo Tipo em cadastros novos vindos de uma tela dedicada
  // (ex.: /pre-preparo -> /itens/novo?type=pre_preparo), sem exigir o objeto
  // initialValues completo (usado apenas na edicao de item existente).
  defaultType?: string;
  initialValues?: {
    id?: string;
    code: string;
    name: string;
    description: string;
    type: string;
    operationalCategory: string;
    active: boolean;
    purchases: PurchaseRow[];
  };
  children?: React.ReactNode;
}

const defaultItemTypes = [
  "insumo",
  "pre_preparo",
  "intermediario",
  "produto_pronto",
  "prato",
  "porcao",
  "marmita",
  "combo",
  "embalagem",
  "apoio"
];

const defaultOperationalCategoryOptions = [
  "Graos",
  "Proteinas",
  "Hortifruti",
  "Laticinios",
  "Mercearia",
  "Embalagens",
  "Operacional"
];

const defaultUnitOptions = ["kg", "g", "l", "ml", "un", "maco"];

export function ItemForm({
  formId = "item-form",
  typeOptions,
  operationalCategoryOptions,
  unitOptions,
  supplierOptions,
  defaultType,
  initialValues,
  children
}: ItemFormProps) {
  const [state, formAction] = useActionState(saveItemAction, {
    status: "idle"
  } satisfies CatalogFormState);
  const resolvedTypeOptions =
    typeOptions ??
    defaultItemTypes.map((itemType) => ({
      value: itemType,
      label: itemType.replaceAll("_", " ")
    }));
  const resolvedOperationalCategoryOptions =
    operationalCategoryOptions ?? defaultOperationalCategoryOptions;
  const resolvedUnitOptions = unitOptions ?? defaultUnitOptions;

  const defaultPurchaseUnit = initialValues?.purchases?.[0]?.purchaseUnit ?? "kg";
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>(
    initialValues?.purchases?.length
      ? initialValues.purchases
      : [
          {
            supplierName: "",
            purchaseUnit: defaultPurchaseUnit,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "0.0000",
            priceUpdatedAt: new Date().toISOString().slice(0, 10),
            usageUnit: defaultPurchaseUnit,
            usageQuantity: "1.0000",
            usageIsFixedFromPrimary: false
          }
        ]
  );

  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    const fieldOrder = ["name", "code", "type", "operationalCategory", "description"];
    const firstField = fieldOrder.find((f) => state.errors?.[f]?.length);
    if (firstField) {
      const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    } else {
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.status, state.message, state.errors]);

  const [code, setCode] = useState(() => {
    if (initialValues?.code) return initialValues.code;
    if (!initialValues?.id) {
      return `${Math.floor(100000 + Math.random() * 900000)}`;
    }
    return "";
  });

  function generateNewCode() {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
    setCode(`${randomNum}`);
  }

  function getFieldError(field: string) {
    return state.errors?.[field]?.[0];
  }

  const primaryPurchaseUnit =
    purchaseRows.find((row) => row.purchaseIsPrimary)?.purchaseUnit ?? defaultPurchaseUnit;

  return (
    <Stack component="form" id={formId} action={formAction} spacing={4} noValidate>
      <input type="hidden" name="id" value={initialValues?.id ?? ""} />

      {state.message ? <Alert ref={alertRef} severity="error">{state.message}</Alert> : null}

      {/* BLOCO 1: IDENTIFICACAO — 5 campos. update/tela-item-v1.html linhas 178-220 */}
      {/* Phase 09-02 D-13: FormSection sem description; card-label bate 1:1 com HTML linha 56. */}
      <FormSection title="Identificacao">
        {/* Row 1: Codigo 140px | Nome 1fr | Status 160px */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 160px",
            gap: 1.75,
            mb: 1.75
          }}
        >
          <TextField
            required
            fullWidth
            size="small"
            label="Codigo"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={Boolean(getFieldError("code"))}
            helperText={getFieldError("code") ?? " "}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Gerar novo código"
                      edge="end"
                      onClick={generateNewCode}
                      size="small"
                      title="Gerar código aleatório"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Nome do item"
            name="name"
            defaultValue={initialValues?.name ?? ""}
            error={Boolean(getFieldError("name"))}
            helperText={getFieldError("name") ?? " "}
          />
          <TextField
            fullWidth
            select
            size="small"
            label="Status"
            name="active"
            defaultValue={initialValues?.active === false ? "false" : "true"}
          >
            <MenuItem value="true">Ativo</MenuItem>
            <MenuItem value="false">Inativo</MenuItem>
          </TextField>
        </Box>

        {/* Row 2: Tipo 1fr | Categoria operacional 1fr */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.75
          }}
        >
          <TextField
            fullWidth
            select
            size="small"
            label="Tipo"
            name="type"
            defaultValue={initialValues?.type ?? defaultType ?? "insumo"}
            error={Boolean(getFieldError("type"))}
            helperText={getFieldError("type") ?? " "}
          >
            {resolvedTypeOptions.map((itemType) => (
              <MenuItem key={itemType.value} value={itemType.value}>
                {itemType.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            fullWidth
            select
            size="small"
            label="Categoria operacional (Secao)"
            name="operationalCategory"
            defaultValue={initialValues?.operationalCategory ?? ""}
            // Phase 09.1 gap #6: ensure label always floats at top even when DB value
            // doesn't match any static option (prevents label collapsing into placeholder).
            InputLabelProps={{ shrink: true }}
            error={Boolean(getFieldError("operationalCategory"))}
            helperText={getFieldError("operationalCategory") ?? " "}
          >
            <MenuItem value="" disabled sx={{ display: 'none' }}>
              Selecione a categoria
            </MenuItem>
            {resolvedOperationalCategoryOptions.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </FormSection>

      {/* BLOCO 2: DETALHAMENTO DE COMPRAS / FORNECEDOR */}
      <PurchasesEditor
        rows={purchaseRows}
        onRowsChange={setPurchaseRows}
        supplierOptions={supplierOptions}
        unitOptions={resolvedUnitOptions}
        purchaseUnit={primaryPurchaseUnit}
        errorMessage={getFieldError("purchases") ?? getFieldError("purchasesJson")}
        // Quick 20260421 T1: propaga erros aninhados purchases.N.campo para
        // que a UI liste per-fornecedor qual campo reprovou no Zod.
        rowErrors={state.errors}
      />

      {/* BLOCO 3: OBSERVACOES — update/tela-item-v1.html linhas 374-381 */}
      <FormSection title="Observacoes">
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          label={
            <>
              Descricao operacional{" "}
              <Box
                component="span"
                sx={{ color: "#888780", fontWeight: 400, fontSize: 10, ml: 0.5 }}
              >
                (opcional)
              </Box>
            </>
          }
          name="description"
          placeholder="Ex.: Arroz marca Albaruska, grao longo, tipo 1. Preferir embalagem 5kg."
          defaultValue={initialValues?.description ?? ""}
          error={Boolean(getFieldError("description"))}
          helperText={getFieldError("description") ?? " "}
        />
      </FormSection>

      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
        <Button type="submit" variant="contained" size="large" sx={{ minWidth: 160, bgcolor: "#185FA5", "&:hover": { bgcolor: "#0C447C" } }}>
          Salvar item
        </Button>
      </Box>

      {children}
    </Stack>
  );
}
