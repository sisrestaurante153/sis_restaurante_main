"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, ArrowRight, CheckCircle2, AlertCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { createMappedItemImportAction } from "@/modules/import/server/import-actions";

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

export function ConfigurableItemImport() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("mappingJson", JSON.stringify(mapping));
    formData.append("defaultValuesJson", JSON.stringify(defaultValues));
    formData.append("file", file);
    await createMappedItemImportAction(formData);
    // Servidor chama redirect() ao concluir — linha abaixo só executa em erros capturados antes do redirect
    setIsProcessing(false);
  };

  const handleCancel = () => {
    setIsProcessing(false);
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
        const fileHeaders = data[0].map(h => String(h).trim());
        setHeaders(fileHeaders);
        
        // Initial auto-mapping
        const newMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach(field => {
          const matched = fileHeaders.find(h => 
            h.toLowerCase() === field.label.toLowerCase() || 
            h.toLowerCase() === field.systemField.toLowerCase()
          );
          if (matched) newMapping[field.systemField] = matched;
        });
        setMapping(newMapping);

        // Preview first 5 rows
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        setPreviewData(rows.slice(0, 5));
        setStep(2);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  }, []);

  const handleMappingChange = (systemField: string, column: string) => {
    setMapping(prev => ({ ...prev, [systemField]: column }));
    setDefaultValues(prev => { const next = { ...prev }; delete next[systemField]; return next; });
  };

  const handleDefaultValueChange = (systemField: string, value: string) => {
    setDefaultValues(prev => ({ ...prev, [systemField]: value }));
    setMapping(prev => { const next = { ...prev }; delete next[systemField]; return next; });
  };

  const isFieldFilled = (f: Omit<ColumnMapping, "mappedColumn">) =>
    !!mapping[f.systemField] || !!defaultValues[f.systemField];

  const isMappingValid = TARGET_FIELDS.filter(f => f.required).every(isFieldFilled);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
          <div className={`h-px w-12 bg-muted ${step >= 2 ? "bg-primary" : ""}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
          <div className={`h-px w-12 bg-muted ${step >= 3 ? "bg-primary" : ""}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
        </div>
        <Badge variant="outline" className="px-4 py-1 text-sm">
          {step === 1 && "Upload do arquivo"}
          {step === 2 && "Mapeamento de colunas"}
          {step === 3 && "Revisão e Importação"}
        </Badge>
      </div>

      {step === 1 && (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Importar Planilha de Itens</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Selecione um arquivo .xlsx ou .csv para iniciar o mapeamento.
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.csv"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button size="lg" className="px-8 cursor-pointer" asChild>
                <span>Selecionar Arquivo</span>
              </Button>
            </label>
            <p className="mt-4 text-sm text-muted-foreground">Arraste e solte ou clique para selecionar</p>
          </div>
        </Card>
      )}

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
                      <Select
                        value={mapping[field.systemField] || ""}
                        onValueChange={(val) => handleMappingChange(field.systemField, val)}
                      >
                        <SelectTrigger className={!isFieldFilled(field) && field.required ? "border-destructive/50" : ""}>
                          <SelectValue placeholder="Selecione a coluna..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.defaultOptions && !mapping[field.systemField] && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">ou valor fixo:</span>
                          <Select
                            value={defaultValues[field.systemField] || ""}
                            onValueChange={(val) => handleDefaultValueChange(field.systemField, val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Definir padrão..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.defaultOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
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
                  <span className="text-muted-foreground">Colunas detectadas:</span>
                  <span className="font-medium">{headers.length}</span>
                </div>
                <div className="pt-4">
                  {!isMappingValid ? (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription className="text-xs">
                        Preencha todos os campos obrigatórios (*) para prosseguir.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button className="w-full" onClick={() => setStep(3)}>
                      Revisar Dados
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
              Trocar arquivo
            </Button>
          </div>
        </div>
      )}

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
                      {TARGET_FIELDS.map(f => (
                        <TableHead key={f.systemField} className="whitespace-nowrap">
                          {f.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx}>
                        {TARGET_FIELDS.map(f => (
                          <TableCell key={f.systemField} className="text-xs">
                            {row[mapping[f.systemField]]?.toString() || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Tudo pronto para importar?</h3>
              <p className="text-sm text-muted-foreground">
                Certifique-se de que os dados acima estão corretos. Esta ação atualizará o cadastro de itens.
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
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

