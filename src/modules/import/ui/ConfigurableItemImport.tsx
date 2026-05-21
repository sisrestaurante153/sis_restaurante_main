"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, ArrowRight, CheckCircle2, AlertCircle, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  preloadImportItemsAction,
  saveImportedItemAction,
  finalizeImportRecalculationAction
} from "@/modules/import/server/import-actions";

interface ColumnMapping {
  systemField: string;
  label: string;
  mappedColumn: string;
  required: boolean;
  defaultOptions?: { value: string; label: string }[];
}

const ITEM_TYPE_OPTIONS = [
  { value: "insumo", label: "Insumo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "pre_preparo", label: "Pré-preparo" },
  { value: "intermediario", label: "Intermediário" },
  { value: "produto_pronto", label: "Produto Pronto" },
  { value: "prato", label: "Prato" },
  { value: "porcao", label: "Porção" },
  { value: "marmita", label: "Marmita" },
  { value: "combo", label: "Combo" },
  { value: "apoio", label: "Apoio" },
];

const FIELD_ALIASES: Record<string, string[]> = {
  internalCode: ["Código Interno", "Codigo Interno", "Código", "Codigo", "Cod.", "Cod", "internalCode"],
  itemName: ["Nome do Item", "Nome", "Descrição", "Descricao", "Item", "Produto", "itemName"],
  type: ["Tipo", "Categoria", "type"],
  operationalCategory: ["Seção", "Secao", "Categoria Operacional", "Grupo", "operationalCategory"],
  supplierName: ["Fornecedor", "Fornec.", "supplierName"],
  purchaseUnit: ["Unidade de Compra", "Unid. Compra", "Unid Compra", "Un. Compra", "purchaseUnit"],
  purchaseQuantity: ["Quantidade de Compra", "Qtde Compra", "Qtd Compra", "Qtde Embalagem", "purchaseQuantity"],
  purchaseCost: ["Preço de Compra", "Preco de Compra", "Preço", "Preco", "Custo", "purchaseCost"],
  usageUnit: ["Unidade de Uso", "Unid. de Uso", "Unid Uso", "Un. Uso", "Unidade Uso", "usageUnit"],
  usageQuantity: ["Quantidade de Uso", "Qtde de Uso", "Qtd de Uso", "Qtde Uso", "Qtd Uso", "usageQuantity"],
};

const TARGET_FIELDS: Omit<ColumnMapping, "mappedColumn">[] = [
  { systemField: "internalCode", label: "Código Interno", required: false },
  { systemField: "itemName", label: "Nome do Item", required: true },
  { systemField: "type", label: "Tipo", required: true, defaultOptions: ITEM_TYPE_OPTIONS },
  { systemField: "operationalCategory", label: "Seção", required: false },
  { systemField: "supplierName", label: "Fornecedor", required: false },
  { systemField: "purchaseUnit", label: "Unidade de Compra", required: true },
  { systemField: "purchaseQuantity", label: "Quantidade de Compra", required: true },
  { systemField: "purchaseCost", label: "Preço de Compra", required: true },
  { systemField: "usageUnit", label: "Unidade de Uso", required: false },
  { systemField: "usageQuantity", label: "Quantidade de Uso", required: false },
];

type ImportProgress = {
  current: number;
  total: number;
  currentItemName: string;
  phase: "salvando" | "recalculando" | "concluido";
  errors: { itemName: string; error: string }[];
};

export function ConfigurableItemImport() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [aborted, setAborted] = useState(false);

  const getValue = useCallback(
    (row: Record<string, unknown>, field: string): unknown => {
      const columnName = mapping[field];
      if (columnName && row[columnName] !== undefined) return row[columnName];
      return defaultValues[field] ?? "";
    },
    [mapping, defaultValues]
  );

  const handleImport = async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    setAborted(false);

    // Filtra linhas válidas (nome + tipo obrigatórios)
    const validRows = allRows.filter((row) => {
      const name = getValue(row, "itemName");
      const type = getValue(row, "type");
      return name && type;
    });

    const prog: ImportProgress = {
      current: 0,
      total: validRows.length,
      currentItemName: "Carregando itens existentes...",
      phase: "salvando",
      errors: []
    };
    setProgress(prog);

    // 1. Pre-carrega mapa de itens existentes (1 query)
    const existingItems = await preloadImportItemsAction();
    const existingItemMap = new Map(
      existingItems.map((item) => [item.name.trim().toLowerCase(), item])
    );

    const processedNames: string[] = [];
    const errors: { itemName: string; error: string }[] = [];

    // 2. Processa item a item
    for (let i = 0; i < validRows.length; i++) {
      if (aborted) break;

      const row = validRows[i];
      const itemName = String(getValue(row, "itemName")).trim();

      setProgress((p) => p ? { ...p, current: i + 1, currentItemName: itemName } : p);

      const existingItem = existingItemMap.get(itemName.toLowerCase());

      const result = await saveImportedItemAction({
        name: itemName,
        type: String(getValue(row, "type") || "insumo"),
        internalCode: String(getValue(row, "internalCode") || ""),
        operationalCategory: String(getValue(row, "operationalCategory") || ""),
        supplierName: String(getValue(row, "supplierName") || ""),
        purchaseUnit: String(getValue(row, "purchaseUnit") || "un"),
        purchaseQuantity: String(getValue(row, "purchaseQuantity") || "1"),
        purchaseCost: String(getValue(row, "purchaseCost") || "0"),
        usageUnit: String(getValue(row, "usageUnit") || getValue(row, "purchaseUnit") || "un"),
        usageQuantity: String(getValue(row, "usageQuantity") || "1"),
        updatedAt: String(getValue(row, "updatedAt") || new Date().toISOString()),
        existingItemId: existingItem?.id,
        existingItemCode: existingItem?.code,
        existingItemCategory: existingItem?.category
      });

      if (result.ok) {
        processedNames.push(itemName);
      } else {
        errors.push({ itemName, error: result.error ?? "Erro desconhecido" });
      }

      setProgress((p) => p ? { ...p, errors } : p);
    }

    // 3. Recalcula custos em lote
    if (processedNames.length > 0) {
      setProgress((p) => p ? { ...p, phase: "recalculando", currentItemName: "Recalculando custos..." } : p);
      await finalizeImportRecalculationAction(processedNames);
    }

    setProgress((p) => p ? { ...p, phase: "concluido" } : p);

    // Redireciona após breve pausa para o usuário ver o resultado
    setTimeout(() => {
      window.location.href = `/importacao?success=1`;
    }, 1500);
  };

  const handleCancel = () => {
    setAborted(true);
    setIsProcessing(false);
    setProgress(null);
    setStep(2);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      if (data.length > 0) {
        const fileHeaders = data[0].map((h) => String(h).trim());
        setHeaders(fileHeaders);

        const newMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach((field) => {
          const aliases = (FIELD_ALIASES[field.systemField] ?? [field.label, field.systemField])
            .map((a) => a.toLowerCase());
          const matched = fileHeaders.find((h) => aliases.includes(h.toLowerCase()));
          if (matched) newMapping[field.systemField] = matched;
        });
        setMapping(newMapping);

        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
        setAllRows(rows);
        setPreviewData(rows.slice(0, 5));
        setStep(2);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  }, []);

  const handleMappingChange = (systemField: string, column: string) => {
    setMapping((prev) => ({ ...prev, [systemField]: column }));
    setDefaultValues((prev) => { const next = { ...prev }; delete next[systemField]; return next; });
  };

  const handleDefaultValueChange = (systemField: string, value: string) => {
    setDefaultValues((prev) => ({ ...prev, [systemField]: value }));
    setMapping((prev) => { const next = { ...prev }; delete next[systemField]; return next; });
  };

  const isFieldFilled = (f: Omit<ColumnMapping, "mappedColumn">) =>
    !!mapping[f.systemField] || !!defaultValues[f.systemField];

  const isMappingValid = TARGET_FIELDS.filter((f) => f.required).every(isFieldFilled);

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s, idx) => (
            <>
              <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
              {idx < 2 && <div key={`line-${s}`} className={`h-px w-12 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </>
          ))}
        </div>
        <Badge variant="outline" className="px-4 py-1 text-sm">
          {step === 1 && "Upload do arquivo"}
          {step === 2 && "Mapeamento de colunas"}
          {step === 3 && "Revisão e Importação"}
        </Badge>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Importar Planilha de Itens</h2>
            <p className="text-sm text-muted-foreground mb-8">Selecione um arquivo .xlsx ou .csv para iniciar o mapeamento.</p>
            <input type="file" id="file-upload" className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
            <label htmlFor="file-upload">
              <Button size="lg" className="px-8 cursor-pointer" asChild><span>Selecionar Arquivo</span></Button>
            </label>
            <p className="mt-4 text-sm text-muted-foreground">Arraste e solte ou clique para selecionar</p>
          </div>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Mapeamento de Colunas (De/Para)</h3>
                <p className="text-sm text-muted-foreground">Indique qual coluna da sua planilha corresponde a cada campo do sistema.</p>
              </div>
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 font-semibold text-sm border-b pb-2 px-2">
                  <span>Campo do Sistema</span>
                  <span>Coluna da Planilha</span>
                </div>
                {TARGET_FIELDS.map((field) => (
                  <div key={field.systemField} className="grid grid-cols-2 gap-4 items-start p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col pt-2">
                      <span className="font-medium text-sm">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Select value={mapping[field.systemField] || ""} onValueChange={(val) => handleMappingChange(field.systemField, val)}>
                        <SelectTrigger className={!isFieldFilled(field) && field.required ? "border-destructive/50" : ""}>
                          <SelectValue placeholder="Selecione a coluna..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {field.defaultOptions && !mapping[field.systemField] && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">ou valor fixo:</span>
                          <Select value={defaultValues[field.systemField] || ""} onValueChange={(val) => handleDefaultValueChange(field.systemField, val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Definir padrão..." /></SelectTrigger>
                            <SelectContent>
                              {field.defaultOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Status do Arquivo
                </h3>
              </div>
              <div className="px-6 pb-6 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arquivo:</span>
                  <span className="font-medium truncate max-w-[150px]">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas:</span>
                  <span className="font-medium">{allRows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Colunas detectadas:</span>
                  <span className="font-medium">{headers.length}</span>
                </div>
                <div className="pt-4">
                  {!isMappingValid ? (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription className="text-xs">Preencha todos os campos obrigatórios (*) para prosseguir.</AlertDescription>
                    </Alert>
                  ) : (
                    <Button className="w-full" onClick={() => setStep(3)}>
                      Revisar Dados <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>Trocar arquivo</Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 pb-2">
              <h3 className="text-lg font-semibold">Prévia da Importação</h3>
              <p className="text-sm text-muted-foreground">Mostrando as primeiras 5 linhas com base no mapeamento selecionado.</p>
            </div>
            <div className="px-6 pb-6">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {TARGET_FIELDS.map((f) => <TableHead key={f.systemField} className="whitespace-nowrap">{f.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {TARGET_FIELDS.map((f) => (
                          <TableCell key={f.systemField} className="text-xs">
                            {String(getValue(row, f.systemField) ?? "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          {/* Barra de progresso */}
          {isProcessing && progress && (
            <div className={`rounded-xl border px-6 py-4 space-y-3 ${progress.phase === "concluido" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium flex items-center gap-2 ${progress.phase === "concluido" ? "text-green-800" : "text-blue-800"}`}>
                  {progress.phase === "concluido" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {progress.phase === "concluido"
                    ? `Concluído! ${progress.current - progress.errors.length} itens importados.`
                    : progress.phase === "recalculando"
                    ? "Recalculando custos..."
                    : `Salvando item ${progress.current} de ${progress.total}`}
                </span>
                {progress.phase !== "concluido" && progress.total > 0 && (
                  <span className="text-blue-600 text-xs font-mono">{progressPercent}%</span>
                )}
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-200 ${progress.phase === "concluido" ? "bg-green-500 w-full" : "bg-blue-600"}`}
                  style={progress.phase !== "concluido" ? { width: `${progressPercent}%` } : undefined}
                />
              </div>

              {/* Nome do item atual */}
              {progress.phase !== "concluido" && progress.currentItemName && (
                <p className="text-sm text-blue-700 truncate font-mono">
                  → {progress.currentItemName}
                </p>
              )}

              {/* Erros acumulados */}
              {progress.errors.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {progress.errors.length} item(s) com erro e serão pulados
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Tudo pronto para importar?</h3>
              <p className="text-sm text-muted-foreground">
                {allRows.length} linhas detectadas. Esta ação atualizará o cadastro de itens.
              </p>
            </div>
            <div className="flex gap-4 items-center">
              {!isProcessing && (
                <Button variant="outline" onClick={() => setStep(2)}>Voltar ao Mapeamento</Button>
              )}
              {isProcessing && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
              <Button
                disabled={isProcessing}
                onClick={handleImport}
                className="px-8 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
                ) : (
                  "Iniciar Importação"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
