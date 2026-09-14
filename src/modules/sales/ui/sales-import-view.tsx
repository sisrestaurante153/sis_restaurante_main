"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { FormSection } from "@/components/ui/FormSection";
import {
  commitSalesImportAction,
  previewSalesImportAction,
  type SalesImportRowInput
} from "@/modules/sales/server/sales-import-actions";

const BORDER = "#D3D1C7";
const BG = "#F4F4F2";
const AZUL = "#185FA5";

const REQUIRED_FIELDS = [
  { field: "description", label: "Descrição do item" },
  { field: "quantity", label: "Quantidade" }
] as const;

const OPTIONAL_FIELDS = [
  { field: "unitPrice", label: "Valor unitário" },
  { field: "total", label: "Valor total" }
] as const;

const DESCRIPTION_ALIASES = ["descricao", "descrição", "produto", "item", "nome"];
const QUANTITY_ALIASES = ["quantidade", "qtd", "qtde"];
const UNIT_PRICE_ALIASES = ["valor unitario", "valor unitário", "preco unitario", "preço unitário", "vl unitario"];
const TOTAL_ALIASES = ["valor total", "total", "vl total"];

function guessColumn(headers: string[], aliases: string[]): string {
  const normalized = headers.map((h) => ({ raw: h, norm: h.toLowerCase().trim() }));
  const found = normalized.find((h) => aliases.includes(h.norm));
  return found?.raw ?? "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const str = String(value ?? "").trim().replace(/R\$\s?/g, "");
  if (str === "") return 0;
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) return Number(str.replace(/\./g, "").replace(",", "."));
  if (/^\d+(,\d+)?$/.test(str)) return Number(str.replace(",", "."));
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

type PreviewMatch = { description: string; match: { itemId: string; itemName: string; score: number } | null };

export function SalesImportView() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<PreviewMatch[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skippedCount: number } | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    (async () => {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const wb = isCsv
        ? XLSX.read(await file.text(), { type: "string" })
        : XLSX.read(await file.arrayBuffer(), { type: "array" });

      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      if (data.length === 0) return;

      const fileHeaders = Array.from(data[0], (h) => String(h ?? "").trim()).filter((h) => h !== "");
      setHeaders(fileHeaders);

      setMapping({
        description: guessColumn(fileHeaders, DESCRIPTION_ALIASES),
        quantity: guessColumn(fileHeaders, QUANTITY_ALIASES),
        unitPrice: guessColumn(fileHeaders, UNIT_PRICE_ALIASES),
        total: guessColumn(fileHeaders, TOTAL_ALIASES)
      });

      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<string, unknown>[];
      setRawRows(rows);
      setStep(2);
    })();
  }, []);

  const parsedRows = useMemo<SalesImportRowInput[]>(() => {
    if (!mapping.description || !mapping.quantity) return [];
    return rawRows
      .map((row) => {
        const description = String(row[mapping.description] ?? "").trim();
        const quantity = toNumber(row[mapping.quantity]);
        let unitPrice = mapping.unitPrice ? toNumber(row[mapping.unitPrice]) : 0;
        let total = mapping.total ? toNumber(row[mapping.total]) : 0;
        if (!total && unitPrice) total = unitPrice * quantity;
        if (!unitPrice && total && quantity) unitPrice = total / quantity;
        return { description, quantity, unitPrice, total };
      })
      .filter((row) => row.description !== "" && row.quantity > 0);
  }, [rawRows, mapping]);

  const isMappingValid = Boolean(mapping.description && mapping.quantity) && (Boolean(mapping.unitPrice) || Boolean(mapping.total));

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await previewSalesImportAction(parsedRows);
      setPreview(result.matches);
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const commitResult = await commitSalesImportAction({
        rows: parsedRows,
        date: saleDate,
        origin: "importado_planilha"
      });
      setResult({ inserted: commitResult.inserted, skippedCount: commitResult.skipped.length });
    } finally {
      setIsImporting(false);
    }
  };

  const resolvedMatches = preview?.filter((m) => m.match !== null) ?? [];
  const unresolvedMatches = preview?.filter((m) => m.match === null) ?? [];

  if (result) {
    return (
      <FormSection title="Importação concluída" description="Resultado da importação de vendas.">
        <Alert severity="success" sx={{ mb: 2 }}>
          {result.inserted} venda{result.inserted === 1 ? "" : "s"} importada{result.inserted === 1 ? "" : "s"} com sucesso.
        </Alert>
        {result.skippedCount > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {result.skippedCount} descrição{result.skippedCount === 1 ? "" : "ões"} da planilha não teve correspondência no
            catálogo e não {result.skippedCount === 1 ? "foi importada" : "foram importadas"}.
          </Alert>
        ) : null}
        <Button
          variant="contained"
          onClick={() => router.push("/vendas" as never)}
          sx={{ backgroundColor: AZUL, "&:hover": { backgroundColor: "#0C447C" } }}
        >
          Voltar para Vendas
        </Button>
      </FormSection>
    );
  }

  return (
    <Stack spacing={3}>
      {step === 1 && (
        <FormSection
          title="Importar relatório de vendas"
          description="Selecione um arquivo .csv ou .xlsx exportado do seu sistema de PDV."
        >
          <Box
            sx={{
              border: `1.5px dashed ${BORDER}`,
              borderRadius: 2,
              p: 5,
              textAlign: "center",
              bgcolor: BG
            }}
          >
            <UploadFileOutlinedIcon sx={{ fontSize: 40, color: "#888780", mb: 1 }} />
            <Typography sx={{ fontSize: 14, color: "#5F5E5A", mb: 2 }}>
              Arraste o arquivo aqui ou clique para selecionar
            </Typography>
            <input type="file" id="sales-file-upload" accept=".csv,.xlsx" hidden onChange={handleFileUpload} />
            <label htmlFor="sales-file-upload">
              <Button
                component="span"
                variant="contained"
                sx={{ backgroundColor: AZUL, "&:hover": { backgroundColor: "#0C447C" } }}
              >
                Selecionar arquivo
              </Button>
            </label>
          </Box>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection
          title="Mapeamento de colunas"
          description={`Arquivo: ${fileName} — ${rawRows.length} linhas detectadas.`}
        >
          <Stack spacing={2.5}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {REQUIRED_FIELDS.map((f) => (
                <TextField
                  key={f.field}
                  select
                  size="small"
                  label={`${f.label} *`}
                  value={mapping[f.field] ?? ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [f.field]: e.target.value }))}
                >
                  {headers.map((h) => (
                    <MenuItem key={h} value={h}>
                      {h}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
              {OPTIONAL_FIELDS.map((f) => (
                <TextField
                  key={f.field}
                  select
                  size="small"
                  label={f.label}
                  value={mapping[f.field] ?? ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [f.field]: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Não mapeada</em>
                  </MenuItem>
                  {headers.map((h) => (
                    <MenuItem key={h} value={h}>
                      {h}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
              <TextField
                size="small"
                label="Data da venda"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "#888780" }}>
              Informe Valor unitário ou Valor total (o outro é calculado automaticamente). Todas as vendas importadas serão
              gravadas na data selecionada acima.
            </Typography>
            {!isMappingValid ? (
              <Alert severity="warning">
                Selecione a coluna de descrição, quantidade e ao menos um valor (unitário ou total).
              </Alert>
            ) : null}
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setStep(1)}>
                Trocar arquivo
              </Button>
              <Button
                variant="contained"
                disabled={!isMappingValid || isAnalyzing || parsedRows.length === 0}
                onClick={handleAnalyze}
                sx={{ backgroundColor: AZUL, "&:hover": { backgroundColor: "#0C447C" } }}
              >
                {isAnalyzing ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : `Analisar ${parsedRows.length} linhas`}
              </Button>
            </Stack>
          </Stack>
        </FormSection>
      )}

      {step === 3 && preview && (
        <FormSection
          title="Revisão da importação"
          description="Itens com correspondência no catálogo serão importados; os demais ficam de fora."
        >
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5}>
              <Chip label={`${resolvedMatches.length} identificados`} color="success" size="small" variant="outlined" />
              <Chip label={`${unresolvedMatches.length} sem correspondência`} color="warning" size="small" variant="outlined" />
              <Chip label={`Data: ${new Date(`${saleDate}T00:00:00`).toLocaleDateString("pt-BR")}`} size="small" />
            </Stack>

            {resolvedMatches.length > 0 && (
              <Box sx={{ overflowX: "auto", border: `0.5px solid ${BORDER}`, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { bgcolor: BG, fontSize: 11.5, fontWeight: 600, color: "#5F5E5A" } }}>
                      <TableCell>Descrição na planilha</TableCell>
                      <TableCell>Item no catálogo</TableCell>
                      <TableCell align="right">Confiança</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resolvedMatches.map((m) => (
                      <TableRow key={m.description} sx={{ "& td": { fontSize: 12.5 } }}>
                        <TableCell>{m.description}</TableCell>
                        <TableCell>{m.match?.itemName}</TableCell>
                        <TableCell align="right">{Math.round((m.match?.score ?? 0) * 100)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {unresolvedMatches.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#854F0B", mb: 1 }}>
                  Sem correspondência (não serão importadas):
                </Typography>
                <Box sx={{ overflowX: "auto", border: "0.5px solid #F0C36D", borderRadius: 2, bgcolor: "#FDF6E8" }}>
                  <Table size="small">
                    <TableBody>
                      {unresolvedMatches.map((m) => (
                        <TableRow key={m.description} sx={{ "& td": { fontSize: 12.5, borderBottom: "0.5px solid #EEDCAE" } }}>
                          <TableCell>{m.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={() => setStep(2)} disabled={isImporting}>
                Voltar ao mapeamento
              </Button>
              <Button
                variant="contained"
                disabled={isImporting || resolvedMatches.length === 0}
                onClick={handleImport}
                sx={{ backgroundColor: "#1B6B2C", "&:hover": { backgroundColor: "#14501F" } }}
              >
                {isImporting ? (
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                ) : (
                  `Importar ${resolvedMatches.length} vendas`
                )}
              </Button>
            </Stack>
          </Stack>
        </FormSection>
      )}
    </Stack>
  );
}
