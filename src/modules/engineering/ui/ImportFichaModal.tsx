"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Grow from "@mui/material/Grow";
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, CheckCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Normalization helpers (exported so ficha-form can use the same logic)
// ---------------------------------------------------------------------------
function stripAccents(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function normalizeName(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  let text = String(value).trim();
  text = text.replace(/\s+/g, " ");
  text = stripAccents(text).toLowerCase();
  text = text.replace(/&/g, " e ");
  text = text.replace(/[^a-z0-9]+/g, " ");
  return text.trim().replace(/\s+/g, " ");
}

function normalizeHeader(value: unknown): string {
  return normalizeName(value);
}

const UNIT_ALIASES: Record<string, string> = {
  kg: "kg",
  quilo: "kg",
  quilograma: "kg",
  g: "g",
  grama: "g",
  gramas: "g",
  l: "l",
  lt: "l",
  litro: "l",
  ml: "ml",
  mililitro: "ml",
  un: "un",
  und: "un",
  unid: "un",
  unidade: "un",
  unidades: "un",
  porcao: "un",
  porcoes: "un",
  maco: "maço",
  maço: "maço",
};

function normalizeUnit(value: unknown): string {
  const normalized = normalizeName(value);
  if (!normalized) return "kg";
  return UNIT_ALIASES[normalized] ?? normalized;
}

// ---------------------------------------------------------------------------
// FIX: SUMMARY_MARKERS are now SKIPPED (continue) instead of stopping the
// loop (break). Previously a "Peso Total Bruto" row appearing mid-table (e.g.
// as a sub-total right after "Sal refinado") would stop all subsequent
// ingredient processing. The new stop condition uses 5+ consecutive empty rows.
// ---------------------------------------------------------------------------
const SUMMARY_MARKERS = new Set([
  "peso total bruto",
  "peso total limpo",
  "peso pos coccao",
  "fator coccao da receita bruto",
  "fator coccao da receita limpo",
]);

function isCoccaoFinalRow(name: string): boolean {
  const n = name.trim();
  return (
    n === "coccao" ||
    n === "cocção" ||
    n === "coccão" ||
    n.includes("pos coccao") ||
    n.includes("pós cocção") ||
    n.includes("coccao final") ||
    n.includes("cocção final") ||
    n.includes("coccão final") ||
    n.includes("preparo final") ||
    n.includes("coccao/preparo final") ||
    n.includes("cocção/preparo final")
  );
}

function extractLabelValue(rows: unknown[][], label: string): unknown {
  const wanted = normalizeHeader(label);
  for (const row of rows) {
    if (!row) continue;
    for (let index = 0; index < row.length - 1; index++) {
      if (normalizeHeader(row[index]) === wanted) {
        return row[index + 1];
      }
    }
  }
  return null;
}

// Returns `count` consecutive values that follow the matching label cell.
function extractLabelValues(rows: unknown[][], label: string, count: number): unknown[] {
  const wanted = normalizeHeader(label);
  for (const row of rows) {
    if (!row) continue;
    for (let index = 0; index < row.length; index++) {
      if (normalizeHeader(row[index]) === wanted) {
        return Array.from({ length: count }, (_, i) => row[index + 1 + i]);
      }
    }
  }
  return [];
}

// Strips a leading number from a cell value when the unit is written as
// "90 unid" — takes only the text part for alias lookup.
function extractUnitFromCell(raw: unknown): string {
  const text = normalizeName(raw);
  const unitOnly = text.replace(/^[\d\s,.]+/, "").trim();
  return UNIT_ALIASES[unitOnly] ?? (unitOnly || "kg");
}

// Tries several label variants for the "Rendimento" row and returns the
// post-cooking weight (column after the label) and its unit (column after that).
// Returns null if the row is absent or the weight value is not a valid number.
function extractPostCookingData(rows: unknown[][]): { outputWeight: string; unit: string } | null {
  const RENDIMENTO_LABELS = [
    "rendimento em porcoes",
    "rendimento em porcao",
    "rendimento em procoes",
    "rendimento",
  ];

  for (const label of RENDIMENTO_LABELS) {
    const vals = extractLabelValues(rows, label, 2);
    if (!vals.length) continue;

    const [weightRaw, unitRaw] = vals;
    const weightNum = parseFloat(String(weightRaw ?? "").replace(",", "."));
    if (!isNaN(weightNum) && weightNum > 0) {
      return {
        outputWeight: weightNum.toFixed(4),
        unit: extractUnitFromCell(unitRaw),
      };
    }
    // label found but weight invalid → stop trying other variants
    break;
  }
  return null;
}

function findIngredientHeader(rows: unknown[][]): { index: number; columns: Record<string, number> } {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!row) continue;
    const normalized = row.map(val => normalizeHeader(val));
    const ingIdx = normalized.findIndex(val => val && val.includes("ingrediente"));
    if (ingIdx !== -1) {
      const columns: Record<string, number> = {};
      normalized.forEach((val, idx) => {
        if (val) {
          columns[val] = idx;
        }
      });
      columns["ingredientes"] = ingIdx;
      return { index, columns };
    }
  }
  throw new Error("Tabela de ingredientes (cabeçalho 'Ingredientes') não foi encontrada nesta aba.");
}

// ---------------------------------------------------------------------------
// Private types for raw Excel parsing
// ---------------------------------------------------------------------------
interface ExcelIngredient {
  rawName: string;
  normalizedName: string;
  grossWeight: string;
  netWeight: string;
  unit: string;
  fc: string;
  ic: string;
}

interface ExcelPackaging {
  rawName: string;
  normalizedName: string;
  quantity: string;
  unit: string;
}

function parseIngredientRows(
  rows: unknown[][],
  headerIndex: number,
  columns: Record<string, number>
): { ingredients: ExcelIngredient[]; packaging: ExcelPackaging[]; coccaoFinalRowData: { outputWeight: string; unit: string } | null } {
  const ingredients: ExcelIngredient[] = [];
  const packaging: ExcelPackaging[] = [];
  let coccaoFinalRowData: { outputWeight: string; unit: string } | null = null;
  let inPackagingSection = false;
  let packagingColumns: Record<string, number> | null = null;
  let consecutiveEmpty = 0;

  for (let idx = headerIndex + 1; idx < rows.length; idx++) {
    const row = rows[idx];
    if (!row) continue;

    const ingredientNameVal = row[columns["ingredientes"] ?? 0];
    const normalizedName = normalizeName(ingredientNameVal);

    // FIX: skip summary/total rows instead of breaking — a mid-table total row
    // would previously stop all processing of subsequent ingredients.
    // Also skip rows with "rendimento" to avoid adding it as an unmatched ingredient.
    if (SUMMARY_MARKERS.has(normalizedName) || normalizedName.includes("rendimento")) {
      continue;
    }

    const isPackagingMarker = row.some(val =>
      typeof val === "string" && normalizeName(val).includes("embalagens somente restaurante delivery")
    );

    if (isPackagingMarker) {
      inPackagingSection = true;
      continue;
    }

    if (inPackagingSection) {
      const normalizedRow = row.map(val => normalizeHeader(val));
      if (normalizedRow.includes("tipo") && normalizedRow.includes("qt") && normalizedRow.includes("ct unit")) {
        packagingColumns = {};
        normalizedRow.forEach((val, colIdx) => {
          if (val) {
            (packagingColumns as Record<string, number>)[val] = colIdx;
          }
        });
        continue;
      }

      if (!packagingColumns) {
        continue;
      }

      const packagingName = row[packagingColumns["tipo"] ?? -1];
      if (!packagingName || packagingName === "Total" || packagingName === "#N/A") {
        continue;
      }

      const qty = row[packagingColumns["qt"] ?? -1];

      packaging.push({
        rawName: String(packagingName).trim(),
        normalizedName: normalizeName(packagingName),
        quantity: qty !== undefined && qty !== null ? String(qty) : "1.0000",
        unit: "un",
      });
      continue;
    }

    if (!ingredientNameVal) {
      consecutiveEmpty++;
      // FIX: 100 consecutive empty rows signal end-of-table without relying on
      // SUMMARY_MARKERS (which may appear in the middle of the spreadsheet).
      if (consecutiveEmpty >= 100) break;
      continue;
    }
    consecutiveEmpty = 0;

    const grossWeight = columns["peso bruto"] !== undefined ? row[columns["peso bruto"]] : null;
    const netWeight = columns["peso limpo"] !== undefined ? row[columns["peso limpo"]] : null;
    const unit = columns["un"] !== undefined ? row[columns["un"]] : null;
    const fc = columns["fc"] !== undefined ? row[columns["fc"]] : null;
    const ic = columns["ic"] !== undefined ? row[columns["ic"]] : null;

    if (isCoccaoFinalRow(normalizedName)) {
      const weightVal = netWeight || grossWeight || "";
      const weightNum = parseFloat(String(weightVal).replace(",", "."));
      if (!isNaN(weightNum) && weightNum > 0) {
        coccaoFinalRowData = {
          outputWeight: weightNum.toFixed(4),
          unit: normalizeUnit(unit) || "kg"
        };
      }
      continue;
    }

    ingredients.push({
      rawName: String(ingredientNameVal).trim(),
      normalizedName,
      grossWeight: grossWeight !== undefined && grossWeight !== null ? String(grossWeight) : "",
      netWeight: netWeight !== undefined && netWeight !== null ? String(netWeight) : "",
      unit: normalizeUnit(unit),
      fc: fc !== undefined && fc !== null ? String(fc) : "",
      ic: ic !== undefined && ic !== null ? String(ic) : "",
    });
  }

  return { ingredients, packaging, coccaoFinalRowData };
}

// ---------------------------------------------------------------------------
// Public exported types
// ---------------------------------------------------------------------------
export interface ItemOptionForMatch {
  id: string;
  name: string;
  type: string;
  usageUnit: string;
}

export interface MatchedIngredient {
  rawName: string;
  normalizedName: string;
  itemId: string;
  itemType: string;
  itemUsageUnit: string;
  matched: boolean;
  grossWeight: string;
  netWeight: string;
  unit: string;
  fc: string;
  ic: string;
}

export interface MatchedPackagingItem {
  rawName: string;
  normalizedName: string;
  itemId: string;
  itemType: string;
  itemUsageUnit: string;
  matched: boolean;
  quantity: string;
  unit: string;
}

export interface MatchedCoccaoFinal {
  outputWeight: string;
  unit: string;
}

export interface MatchedImportData {
  productName: string;
  yieldValue: string;
  ingredients: MatchedIngredient[];
  packaging: MatchedPackagingItem[];
  coccaoFinal: MatchedCoccaoFinal | null;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
type Step = "idle" | "processing" | "review";

interface ImportFichaModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: MatchedImportData) => void;
  itemOptions: ItemOptionForMatch[];
}

export function ImportFichaModal({ open, onClose, onImport, itemOptions }: ImportFichaModalProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 1, name: "" });
  const [matchedData, setMatchedData] = useState<MatchedImportData | null>(null);

  function resetState() {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setFileName("");
    setError(null);
    setStep("idle");
    setProgress({ current: 0, total: 1, name: "" });
    setMatchedData(null);
  }

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setError("Não foi possível ler os dados do arquivo.");
            return;
          }
          const wb = XLSX.read(data, { type: "array" });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          if (wb.SheetNames.length > 0) {
            setSelectedSheet(wb.SheetNames[0]);
          }
        } catch (err: unknown) {
          setError("Erro ao interpretar o arquivo Excel. Verifique se o arquivo não está corrompido.");
          console.error(err);
        }
      };
      reader.onerror = () => {
        setError("Erro na leitura do arquivo.");
      };
      reader.readAsArrayBuffer(file);
    } catch (err: unknown) {
      setError("Erro ao ler o arquivo.");
      console.error(err);
    }
  };

  const handleConfirm = async () => {
    if (!workbook || !selectedSheet) return;

    setError(null);
    setStep("processing");
    setProgress({ current: 0, total: 1, name: "Analisando planilha..." });

    // Yield one frame so the loading UI renders before synchronous parsing begins
    await new Promise<void>(r => setTimeout(r, 30));

    try {
      const worksheet = workbook.Sheets[selectedSheet];
      if (!worksheet) {
        throw new Error(`Aba "${selectedSheet}" não encontrada no arquivo.`);
      }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });

      const productName = String(
        extractLabelValue(rows, "Produto") ||
        extractLabelValue(rows, "Nome do Produto") ||
        extractLabelValue(rows, "Nome") ||
        selectedSheet
      ).trim();

      const yieldVal =
        extractLabelValue(rows, "Rendimento em proções") ||
        extractLabelValue(rows, "Rendimento em porções") ||
        extractLabelValue(rows, "Rendimento") ||
        "1.0000";

      let yieldValueStr = "1.0000";
      if (yieldVal !== null && yieldVal !== undefined) {
        const num = parseFloat(String(yieldVal).replace(",", "."));
        if (!isNaN(num) && num > 0) {
          yieldValueStr = num.toFixed(4);
        }
      }

      const { index: headerIndex, columns } = findIngredientHeader(rows);
      const { ingredients, packaging, coccaoFinalRowData } = parseIngredientRows(rows, headerIndex, columns);

      const coccaoFinal = extractPostCookingData(rows) || coccaoFinalRowData;

      const total = ingredients.length + packaging.length || 1;

      // -----------------------------------------------------------------------
      // Async match loop — yields to the UI every 10 items so the browser stays
      // responsive and the progress text updates are visible.
      // -----------------------------------------------------------------------
      const matchedIngredients: MatchedIngredient[] = [];
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        setProgress({ current: i + 1, total, name: ing.rawName });
        if (i % 10 === 0) {
          await new Promise<void>(r => setTimeout(r, 0));
        }
        const match = itemOptions.find(opt => normalizeName(opt.name) === ing.normalizedName);
        matchedIngredients.push({
          rawName: ing.rawName,
          normalizedName: ing.normalizedName,
          itemId: match?.id ?? "",
          itemType: match?.type ?? "",
          itemUsageUnit: match?.usageUnit ?? "",
          matched: !!match,
          grossWeight: ing.grossWeight,
          netWeight: ing.netWeight,
          unit: ing.unit || (match?.usageUnit ?? "kg"),
          fc: ing.fc,
          ic: ing.ic,
        });
      }

      const matchedPackaging: MatchedPackagingItem[] = [];
      for (let i = 0; i < packaging.length; i++) {
        const pkg = packaging[i];
        setProgress({ current: ingredients.length + i + 1, total, name: pkg.rawName });
        if (i % 10 === 0) {
          await new Promise<void>(r => setTimeout(r, 0));
        }
        const match = itemOptions.find(opt => normalizeName(opt.name) === pkg.normalizedName);
        matchedPackaging.push({
          rawName: pkg.rawName,
          normalizedName: pkg.normalizedName,
          itemId: match?.id ?? "",
          itemType: match?.type ?? "",
          itemUsageUnit: match?.usageUnit ?? "",
          matched: !!match,
          quantity: pkg.quantity,
          unit: pkg.unit || (match?.usageUnit ?? "un"),
        });
      }

      setMatchedData({
        productName,
        yieldValue: yieldValueStr,
        ingredients: matchedIngredients,
        packaging: matchedPackaging,
        coccaoFinal,
      });
      setStep("review");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Erro ao processar a planilha. Verifique a formatação da aba.");
      setStep("idle");
    }
  };

  const handleImportConfirm = () => {
    if (!matchedData) return;
    onImport(matchedData);
    handleClose();
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const progressPct = Math.round((progress.current / Math.max(progress.total, 1)) * 100);

  const unmatchedCount =
    (matchedData?.ingredients.filter(i => !i.matched).length ?? 0) +
    (matchedData?.packaging.filter(p => !p.matched).length ?? 0);
  const totalCount =
    (matchedData?.ingredients.length ?? 0) + (matchedData?.packaging.length ?? 0);

  return (
    <Dialog
      open={open}
      onClose={step === "processing" ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      slots={{ transition: Grow }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <FileSpreadsheet size={22} style={{ color: "#1B6B2C", flexShrink: 0 }} />
        <Typography variant="h6" fontWeight={700}>
          {step === "review" ? "Resultado da importação" : "Importar Ficha de Planilha"}
        </Typography>
      </DialogTitle>

      {/* ------------------------------------------------------------------ */}
      {/* STEP: idle — file picker + sheet selector                           */}
      {/* ------------------------------------------------------------------ */}
      {step === "idle" && (
        <>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecione um arquivo Excel contendo as fichas técnicas. O sistema lerá as abas e preencherá automaticamente as informações da ficha correspondente.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Button
                component="label"
                variant="contained"
                startIcon={<Upload size={16} />}
                sx={{
                  backgroundColor: "#185FA5",
                  "&:hover": { backgroundColor: "#0C447C" }
                }}
              >
                Selecionar Arquivo .xlsx
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </Button>
              {fileName && (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: "text.primary" }}>
                  Arquivo: {fileName}
                </Typography>
              )}
            </Box>

            {sheetNames.length > 0 && (
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel id="select-sheet-label">Selecione a Aba (Receita)</InputLabel>
                <Select
                  labelId="select-sheet-label"
                  value={selectedSheet}
                  label="Selecione a Aba (Receita)"
                  onChange={(e) => setSelectedSheet(e.target.value)}
                >
                  {sheetNames.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button variant="outlined" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={!workbook || !selectedSheet}
              onClick={handleConfirm}
              startIcon={<CheckCircle2 size={16} />}
              sx={{
                backgroundColor: "#1B6B2C",
                "&:hover": { backgroundColor: "#124B1E" },
                "&.Mui-disabled": { backgroundColor: "#E2E8F0" }
              }}
            >
              Preencher Ficha
            </Button>
          </DialogActions>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP: processing — async match with per-ingredient progress          */}
      {/* ------------------------------------------------------------------ */}
      {step === "processing" && (
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "#5F5E5A", fontWeight: 500 }}>
              {progress.current === 0
                ? "Analisando planilha..."
                : `Processando ingrediente ${progress.current} de ${progress.total}`}
            </Typography>

            {progress.name && progress.current > 0 && (
              <Typography
                variant="body2"
                sx={{
                  mb: 2,
                  color: "#185FA5",
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {progress.name}
              </Typography>
            )}

            <LinearProgress
              variant={progress.current === 0 ? "indeterminate" : "determinate"}
              value={progressPct}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "#E8E6DC",
                "& .MuiLinearProgress-bar": { bgcolor: "#185FA5", borderRadius: 3 }
              }}
            />

            <Typography variant="caption" sx={{ mt: 1, display: "block", color: "#888780" }}>
              Por favor, aguarde. Isso pode levar alguns segundos para fichas com muitos ingredientes.
            </Typography>
          </Box>
        </DialogContent>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP: review — summary of matched / unmatched items                 */}
      {/* ------------------------------------------------------------------ */}
      {step === "review" && matchedData && (
        <>
          <DialogContent>
            {/* Summary header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 2,
                p: "10px 14px",
                borderRadius: "8px",
                bgcolor: unmatchedCount === 0 ? "#EAF3DE" : "#FFF8E6",
                border: `0.5px solid ${unmatchedCount === 0 ? "#B5D9A4" : "#F5C842"}`
              }}
            >
              {unmatchedCount === 0 ? (
                <CheckCheck size={18} style={{ color: "#1B6B2C", flexShrink: 0 }} />
              ) : (
                <AlertCircle size={18} style={{ color: "#854F0B", flexShrink: 0 }} />
              )}
              <Typography variant="body2" fontWeight={600} sx={{ color: unmatchedCount === 0 ? "#1B6B2C" : "#854F0B" }}>
                {unmatchedCount === 0
                  ? `${totalCount} ingrediente${totalCount !== 1 ? "s" : ""} encontrado${totalCount !== 1 ? "s" : ""} no catálogo`
                  : `${totalCount - unmatchedCount} de ${totalCount} encontrado${totalCount - unmatchedCount !== 1 ? "s" : ""} — ${unmatchedCount} não localizado${unmatchedCount !== 1 ? "s" : ""}`}
              </Typography>
            </Box>

            {/* Ingredient list */}
            <Box
              sx={{
                maxHeight: 300,
                overflowY: "auto",
                border: "0.5px solid #D3D1C7",
                borderRadius: "8px",
                "& > *:not(:last-child)": { borderBottom: "0.5px solid #ECEAE0" }
              }}
            >
              {[...matchedData.ingredients, ...matchedData.packaging].map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: "6px",
                    bgcolor: item.matched ? "transparent" : "#FFF5F5"
                  }}
                >
                  {item.matched ? (
                    <CheckCircle2 size={14} style={{ color: "#1B6B2C", flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={14} style={{ color: "#A32D2D", flexShrink: 0 }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 12,
                      color: item.matched ? "#2C2C2A" : "#A32D2D",
                      fontWeight: item.matched ? 400 : 600,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.rawName}
                  </Typography>
                  {!item.matched && (
                    <Typography variant="caption" sx={{ fontSize: 10, color: "#A32D2D", flexShrink: 0 }}>
                      não encontrado
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {matchedData.coccaoFinal && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 1.5,
                  p: "8px 12px",
                  borderRadius: "6px",
                  bgcolor: "#EAF3DE",
                  border: "0.5px solid #B5D9A4"
                }}
              >
                <CheckCircle2 size={13} style={{ color: "#1B6B2C", flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: "#1B6B2C", fontWeight: 600 }}>
                  Coccão Final detectada:
                </Typography>
                <Typography variant="caption" sx={{ color: "#27500A" }}>
                  {matchedData.coccaoFinal.outputWeight.replace(".", ",")} {matchedData.coccaoFinal.unit}
                </Typography>
              </Box>
            )}

            {unmatchedCount > 0 && (
              <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "#5F5E5A" }}>
                Itens não encontrados serão adicionados em vermelho na ficha. Você pode selecionar o item correto manualmente após importar.
              </Typography>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button variant="outlined" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleImportConfirm}
              startIcon={<CheckCheck size={16} />}
              sx={{
                backgroundColor: "#1B6B2C",
                "&:hover": { backgroundColor: "#124B1E" }
              }}
            >
              {unmatchedCount === 0 ? "Importar" : "Importar mesmo assim"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
