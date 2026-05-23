"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { RefreshCw } from "lucide-react";
import { FormSection } from "@/components/ui/FormSection";
import {
  saveFichaAction,
  type EngineeringFormState
} from "@/modules/engineering/server/engineering-actions";
import {
  ComponentsEditor,
  type ComponentsEditorSummary,
  type QuadroFinalState
} from "@/modules/engineering/ui/components-editor";
import type { FichaStageEditor, StageTypeOption } from "@/modules/engineering/ui/components-editor.types";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";

// Bug 1: useFormStatus desativa o botão enquanto a action está pendente (evita duplo clique).
// Bug 2: isDirty desativa o botão enquanto não há alterações no formulário.
function SubmitButton({ isDirty }: { isDirty: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || !isDirty;
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      disabled={disabled}
      sx={{
        minWidth: 160,
        bgcolor: disabled ? undefined : "#185FA5",
        "&:hover": { bgcolor: disabled ? undefined : "#0C447C" }
      }}
    >
      {pending ? "Salvando..." : "Salvar ficha"}
    </Button>
  );
}

function ReadonlyTextField({
  label,
  value,
  helperText = " "
}: {
  label: string;
  value?: string;
  helperText?: string;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value ?? ""}
      // Phase 09.1 gap #8: readonly fields always show label shrunk on top to match
      // HTML .f label { display: above input, always visible } (update/tela-ficha-tecnica-v2.html:49).
      InputLabelProps={{ shrink: true }}
      slotProps={{ input: { readOnly: true } }}
      helperText={helperText}
    />
  );
}

function formatCurrency(value: string | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value ?? "0"));
}

interface FichaFormProps {
  formId?: string;
  modalityOptions: Array<{
    id: string;
    label: string;
  }>;
  initialValues?: {
    id?: string;
    code?: string;
    itemId?: string;
    itemName: string;
    canonicalItemName?: string;
    displayName?: string;
    itemType: string;
    groupOperational?: string;
    modality?: {
      id: string;
      label: string;
    };
    status: string;
    yieldMode: string;
    yieldUnitCode?: string;
    percentLoss: string | null;
    finalWeight: string | null;
    portions: string | null;
    preparationMode: string;
    notes: string;
    createdAt?: string;
    updatedAt?: string;
    createdAtLabel?: string | null;
    updatedAtLabel?: string | null;
    version?: number;
    usageUnit?: string;
    summary?: ComponentsEditorSummary;
    stages?: Array<{
      id: string;
      name: string;
      stageTypeId?: string;
      stageTypeCode?: string;
      stageTypeLabel?: string;
      outputQuantity: string;
      correctionFactor?: string;
      cookingIndex?: string;
      notes?: string;
      items: Array<{
        itemId: string;
        itemName?: string;
        componentType: string;
        quantityUsed: string;
        quantityGross?: string;
        quantityNet?: string;
        usageUnit: string;
        levelLabel?: string;
        correctionFactor?: string;
        cookingIndex?: string;
        notes?: string;
      }>;
    }>;
  };
  itemOptions: Array<{
    id: string;
    name: string;
    type: string;
    operationalCategory?: string;
    usageUnit: string;
    currentCost?: string;
    finalOutput?: string;
  }>;
  componentOptions?: Array<{
    id: string;
    name: string;
    type: string;
    operationalCategory?: string;
    usageUnit: string;
    currentCost?: string;
    finalOutput?: string;
  }>;
  stageTypeOptions?: StageTypeOption[];
  // Quick 20260424 item 3: opcoes de unidade vindas de master-data listUnits().
  unitOptions?: string[];
  children?: React.ReactNode;
}

export function FichaForm({
  formId = "ficha-form",
  modalityOptions,
  initialValues,
  itemOptions,
  componentOptions,
  stageTypeOptions,
  unitOptions,
  children
}: FichaFormProps) {
  const [state, formAction] = useActionState(saveFichaAction, {
    status: "idle"
  } satisfies EngineeringFormState);

  // Bug 2: começa sujo em fichas novas (sem id), limpo em fichas existentes.
  const [isDirty, setIsDirty] = useState(!initialValues?.id);

  const errorAlertRef = useRef<HTMLDivElement>(null);
  const stagesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const fieldOrder = ["displayName", "modalityId", "groupOperational", "code", "status", "preparationMode", "notes"];
    const firstField = fieldOrder.find((f) => state.errors?.[f]?.length);
    if (firstField) {
      const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    } else if (state.errors?.["stages"]?.length || state.errors?.["stagesJson"]?.length) {
      // Bug 5: erros em stages precisam rolar até a seção de componentes
      stagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      errorAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setCode(`${randomNum}`);
  }

  // PDFV2-FICHA-07: estado controlado do Modalidade. O input continua como
  // name="modalityId" no form submit, apenas o valor se torna controlado.
  const [modalityId, setModalityId] = useState<string>(
    initialValues?.modality?.id ?? modalityOptions[0]?.id ?? ""
  );

  // Phase 09.2 B3: state do Quadro Final lifted para que ele seja renderizado
  // DEPOIS de Finalizacao (ordem nova pedida pelo cliente). ComponentsEditor
  // publica o state via callback e consome os controladores de volta.
  const initialSummary = initialValues?.summary;
  const [salePriceInput, setSalePriceInput] = useState(
    initialSummary?.salePrice && initialSummary.salePrice !== "--"
      ? initialSummary.salePrice
      : ""
  );
  const [variableExpensePercentInput, setVariableExpensePercentInput] = useState(
    initialSummary?.variableExpensePercent && initialSummary.variableExpensePercent !== "--"
      ? initialSummary.variableExpensePercent
      : ""
  );
  const [assemblyEnabled, setAssemblyEnabled] = useState(
    initialSummary?.assemblyEnabled ?? false
  );
  const [quadroFinalSummary, setQuadroFinalSummary] =
    useState<ComponentsEditorSummary | null>(null);
  const handleQuadroFinalChange = (state: QuadroFinalState) => {
    setQuadroFinalSummary(state.summary);
  };
  const availableComponentOptions = componentOptions ?? itemOptions;
  const linkedItem = itemOptions.find((item) => item.id === initialValues?.itemId) ?? null;
  const itemType = initialValues?.itemType ?? linkedItem?.type ?? "pre_preparo";
  const yieldUnitCode = initialValues?.yieldUnitCode ?? initialValues?.usageUnit ?? linkedItem?.usageUnit ?? "kg";

  // Bug 5: controlled state evita reset dos campos quando useActionState retorna erro.
  const [displayName, setDisplayName] = useState(
    initialValues?.displayName ?? initialValues?.itemName ?? linkedItem?.name ?? ""
  );
  const [groupOperational, setGroupOperational] = useState(
    initialValues?.groupOperational ?? linkedItem?.operationalCategory ?? "Sem grupo"
  );
  const [statusValue, setStatusValue] = useState(initialValues?.status ?? "rascunho");

  const formSummary: ComponentsEditorSummary = useMemo(
    () =>
      initialValues?.summary ?? {
        totalGross: "0.0000",
        totalNet: "0.0000",
        postCookingWeight: initialValues?.finalWeight ?? "--",
        cookingFactorGross: null,
        cookingFactorNet: null,
        totalInputCost: "0.0000",
        costWithoutPackagingPerKg: null,
        cmvPerKg: "--",
        packagingCost: "0.0000",
        salePrice: "--",
        variableExpensePercent: "--",
        contributionMarginValue: "--",
        contributionMarginPercent: "--",
        mealCmv: "--",
        packagingShareOnCmv: "--",
        costReal: "0.0000",
        preparationModePreview: initialValues?.preparationMode ?? ""
      },
    [initialValues]
  );

  const editorStages = useMemo<FichaStageEditor[] | undefined>(
    () =>
      initialValues?.stages?.map((stage) => ({
        id: stage.id,
        name: stage.name,
        stageTypeId: stage.stageTypeId,
        stageTypeCode: stage.stageTypeCode,
        stageTypeLabel: stage.stageTypeLabel,
        outputQuantity: stage.outputQuantity,
        correctionFactor: stage.correctionFactor,
        cookingIndex: stage.cookingIndex,
        notes: stage.notes,
        items: stage.items.map((item) => ({
          itemId: item.itemId,
          componentType:
            item.componentType === "embalagem"
              ? "embalagem"
              : item.componentType === "apoio"
                ? "apoio"
                : "ingrediente",
          quantityUsed: item.quantityUsed,
          usageUnit: item.usageUnit,
          levelLabel: item.levelLabel,
          notes: item.notes
        }))
      })),
    [initialValues?.stages]
  );

  function getFieldError(field: string) {
    return state.errors?.[field]?.[0];
  }

  const createdAtLabel = initialValues?.createdAt
    ? (initialValues.createdAtLabel ?? new Date(initialValues.createdAt).toLocaleString("pt-BR"))
    : new Date().toLocaleString("pt-BR");
  const updatedAtLabel = initialValues?.updatedAt
    ? (initialValues.updatedAtLabel ?? new Date(initialValues.updatedAt).toLocaleString("pt-BR"))
    : new Date().toLocaleString("pt-BR");

  return (
    <Stack
      component="form"
      id={formId}
      action={formAction}
      spacing={4}
      noValidate
      onChange={() => setIsDirty(true)}
    >
      <input type="hidden" name="id" value={initialValues?.id ?? ""} />
      <input type="hidden" name="itemId" value={initialValues?.itemId ?? ""} />
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="yieldMode" value={initialValues?.yieldMode ?? "peso_final"} />
      <input type="hidden" name="percentLoss" value={initialValues?.percentLoss ?? ""} />

      {state.message ? <Alert ref={errorAlertRef} severity="error">{state.message}</Alert> : null}

      <input type="hidden" name="portions" value={initialValues?.portions ?? "1.0000"} />
      <input type="hidden" name="yieldUnitCode" value={yieldUnitCode} />

      <FormSection title="Identificacao">
        {/*
          Phase 09-03 (D-01..D-03): Box sx CSS grid pixel-perfect 1:1 com
          update/tela-ficha-tecnica-v2.html linhas 60-61, 253-268.
          Padrao Phase 8 D-09 (item-form.tsx:118-203). Grid literal
          greppavel no source (nao depende de CSS resolvido pelo MUI no jsdom).
        */}
        {/* Row 1 (.g-id1): Cod. 110px | Produto 1fr | Data criacao 150px | Data ultima alteracao 175px */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: '110px 1fr 150px 175px',
            gap: 1.5,
            mb: 1.5
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Cod."
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={Boolean(getFieldError("code"))}
            helperText={getFieldError("code") ?? " "}
            slotProps={{
              input: {
                endAdornment: (
                  <button
                    type="button"
                    onClick={generateNewCode}
                    className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    title="Gerar novo codigo"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                )
              }
            }}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Produto"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={Boolean(getFieldError("displayName"))}
            helperText={getFieldError("displayName") ?? " "}
          />
          <ReadonlyTextField label="Data de criacao" value={createdAtLabel} />
          <ReadonlyTextField label="Data e hora da ultima alteracao" value={updatedAtLabel} />
        </Box>

        {/* Row 2 (.g-id2): Modalidade 1fr | Grupo operacional 1fr | Status 120px | Custo atual 1fr */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: '1fr 1fr 120px 1fr',
            gap: 1.5
          }}
        >
          <TextField
            required
            fullWidth
            size="small"
            select
            label="Modalidade"
            name="modalityId"
            value={modalityId}
            onChange={(event) => setModalityId(event.target.value)}
            error={Boolean(getFieldError("modalityId"))}
            helperText={getFieldError("modalityId") ?? " "}
          >
            <MenuItem value="" disabled sx={{ display: 'none' }}>
              Selecione
            </MenuItem>
            {modalityOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            required
            fullWidth
            size="small"
            label="Grupo operacional"
            name="groupOperational"
            value={groupOperational}
            onChange={(e) => setGroupOperational(e.target.value)}
            error={Boolean(getFieldError("groupOperational"))}
            helperText={getFieldError("groupOperational") ?? " "}
          />

          <TextField
            required
            fullWidth
            size="small"
            select
            label="Status"
            name="status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            error={Boolean(getFieldError("status"))}
            helperText={getFieldError("status") ?? " "}
          >
            <MenuItem value="rascunho">Rascunho</MenuItem>
            <MenuItem value="ativa">Ativa</MenuItem>
            <MenuItem value="inativa">Inativa</MenuItem>
            <MenuItem value="arquivada">Arquivada</MenuItem>
          </TextField>

          {/* Phase 09.2 v5 align-residual: usa TextField readOnly com label flutuante
              nativa do MUI. Isso garante alinhamento pixel-perfect com Modalidade/Grupo/Status
              (mesmo componente, mesmas metricas de altura/label/helperText). Background e cor
              customizados via slotProps. */}
          <TextField
            fullWidth
            size="small"
            label="Custo atual da ficha"
            value={`R$ ${formatCurrency(quadroFinalSummary?.costReal ?? formSummary.costReal ?? linkedItem?.currentCost).replace(/R\$\s?/, "")}`}
            InputLabelProps={{ shrink: true }}
            slotProps={{
              input: {
                readOnly: true,
                sx: {
                  background: "#E6F1FB",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D3D1C7" }
                }
              },
              htmlInput: {
                style: { color: "#185FA5", fontWeight: 600, fontSize: 16 }
              }
            }}
            helperText=" "
          />
        </Box>
      </FormSection>

      {/* Bug 5: ref usado para rolar até aqui quando há erros de stages */}
      <div ref={stagesSectionRef} />
      {/* Phase 09.2 B3: ComponentsEditor SEM Quadro Final (hideQuadroFinal).
          Estado do Quadro Final fica lifted para que a ordem na UI seja:
          Identificacao -> ComponentsEditor -> Finalizacao -> Quadro Final. */}
      <ComponentsEditor
        itemOptions={availableComponentOptions}
        stageTypeOptions={stageTypeOptions}
        unitOptions={unitOptions}
        initialStages={editorStages}
        summary={formSummary}
        errors={state.errors}
        hideQuadroFinal
        onQuadroFinalChange={handleQuadroFinalChange}
        salePriceInput={salePriceInput}
        variableExpensePercentInput={variableExpensePercentInput}
        assemblyEnabled={assemblyEnabled}
        onSalePriceChange={setSalePriceInput}
        onVariableExpensePercentChange={setVariableExpensePercentInput}
        onAssemblyEnabledChange={setAssemblyEnabled}
      />

      {/* Phase 09-04 D-08: Finalizacao Box sx grid 1fr 1fr (HTML .g-fin linha 119);
          ambos campos opcionais com placeholders pixel-perfect (HTML linhas 428-431).
          preparationMode sem required (Zod relaxado em 09-01 D-10 para default("")). */}
      <FormSection title="Finalizacao">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            label={
              <>
                Modo de preparo{" "}
                <Box component="span" sx={{ color: '#888780', fontSize: 10, fontWeight: 400, ml: 0.5 }}>
                  (opcional)
                </Box>
              </>
            }
            name="preparationMode"
            placeholder="Descreva o passo a passo do preparo para o operador de cozinha..."
            defaultValue={initialValues?.preparationMode ?? ""}
            error={Boolean(getFieldError("preparationMode"))}
            helperText={getFieldError("preparationMode") ?? " "}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            label={
              <>
                Observacoes da ficha{" "}
                <Box component="span" sx={{ color: '#888780', fontSize: 10, fontWeight: 400, ml: 0.5 }}>
                  (opcional)
                </Box>
              </>
            }
            name="notes"
            placeholder="Observacoes gerais, alertas ou informacoes complementares..."
            defaultValue={initialValues?.notes ?? ""}
            error={Boolean(getFieldError("notes"))}
            helperText={getFieldError("notes") ?? " "}
          />
        </Box>
      </FormSection>

      <TotaisIndicadores
        summary={{ ...(quadroFinalSummary ?? formSummary), yieldUnit: yieldUnitCode }}
        salePriceInput={salePriceInput}
        variableExpensePercentInput={variableExpensePercentInput}
        onSalePriceChange={setSalePriceInput}
        onVariableExpensePercentChange={setVariableExpensePercentInput}
        onAssemblyEnabledChange={setAssemblyEnabled}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
        <SubmitButton isDirty={isDirty} />
      </Box>

      {children}
    </Stack>
  );
}
