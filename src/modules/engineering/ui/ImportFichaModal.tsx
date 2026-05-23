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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Grow from "@mui/material/Grow";
import { FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";

// Normalization helpers matching Python 1:1
function stripAccents(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
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
  unidade: "un",
  unidades: "un",
  maco: "maço",
  maço: "maço",
};

function normalizeUnit(value: unknown): string {
  const normalized = normalizeName(value);
  if (!normalized) return "kg"; // default fallback
  return UNIT_ALIASES[normalized] ?? normalized;
}

const SUMMARY_MARKERS = new Set([
  "peso total bruto",
  "peso total limpo",
  "peso pos coccao",
  "fator coccao da receita bruto",
  "fator coccao da receita limpo",
]);

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
) {
  const ingredients: ExcelIngredient[] = [];
  const packaging: ExcelPackaging[] = [];
  let inPackagingSection = false;
  let packagingColumns: Record<string, number> | null = null;

  for (let idx = headerIndex + 1; idx < rows.length; idx++) {
    const row = rows[idx];
    if (!row) continue;

    const ingredientNameVal = row[columns["ingredientes"] ?? 0];
    const normalizedName = normalizeName(ingredientNameVal);

    if (SUMMARY_MARKERS.has(normalizedName)) {
      break;
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
            packagingColumns![val] = colIdx;
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
      continue;
    }

    const grossWeight = columns["peso bruto"] !== undefined ? row[columns["peso bruto"]] : null;
    const netWeight = columns["peso limpo"] !== undefined ? row[columns["peso limpo"]] : null;
    const unit = columns["un"] !== undefined ? row[columns["un"]] : null;
    const fc = columns["fc"] !== undefined ? row[columns["fc"]] : null;
    const ic = columns["ic"] !== undefined ? row[columns["ic"]] : null;

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

  return { ingredients, packaging };
}

export interface ImportedFichaData {
  productName: string;
  yieldValue: string;
  ingredients: ExcelIngredient[];
  packaging: ExcelPackaging[];
}

interface ImportFichaModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ImportedFichaData) => void;
}

export function ImportFichaModal({ open, onClose, onImport }: ImportFichaModalProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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

  const handleConfirm = () => {
    if (!workbook || !selectedSheet) return;

    try {
      const worksheet = workbook.Sheets[selectedSheet];
      if (!worksheet) {
        setError(`Aba "${selectedSheet}" não encontrada no arquivo.`);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });

      const productName = String(
        extractLabelValue(rows, "Produto") ||
        extractLabelValue(rows, "Nome do Produto") ||
        extractLabelValue(rows, "Nome") ||
        selectedSheet
      ).trim();

      const yieldVal = extractLabelValue(rows, "Rendimento em proções") ||
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
      const { ingredients, packaging } = parseIngredientRows(rows, headerIndex, columns);

      onImport({
        productName,
        yieldValue: yieldValueStr,
        ingredients,
        packaging
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Erro ao processar a planilha. Verifique a formatação da aba.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Grow}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <FileSpreadsheet className="text-emerald-600 w-6 h-6" />
        <Typography variant="h6" fontWeight={700}>
          Importar Ficha de Planilha
        </Typography>
      </DialogTitle>
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
            startIcon={<Upload />}
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
        <Button variant="outlined" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!workbook || !selectedSheet}
          onClick={handleConfirm}
          startIcon={<CheckCircle2 className="w-4 h-4" />}
          sx={{
            backgroundColor: "#1B6B2C",
            "&:hover": { backgroundColor: "#124B1E" },
            "&.Mui-disabled": { backgroundColor: "#E2E8F0" }
          }}
        >
          Preencher Ficha
        </Button>
      </DialogActions>
    </Dialog>
  );
}
