"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PageFeedbackSnackbar } from "@/components/ui/PageFeedbackSnackbar";
import type {
  ImportDashboardSnapshot,
  ImportExecutionSnapshot
} from "@/modules/import/server/import-execution-presenter";
import {
  cancelImportExecutionAction,
  createImportExecutionAction,
  createOperationalItemImportAction
} from "@/modules/import/server/import-actions";
import { withBasePath } from "@/modules/platform/lib/base-path";

interface ImportWorkspaceProps {
  initialDashboard: ImportDashboardSnapshot;
  feedback: {
    severity: "success" | "warning" | "error" | "info";
    message: string;
  } | null;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatStatus(status: string) {
  const labelMap: Record<string, string> = {
    pendente: "Pendente",
    processando: "Processando",
    concluida: "Concluída",
    concluida_com_conflitos: "Concluída com conflitos",
    falha: "Falha",
    cancelada: "Cancelada"
  };

  return labelMap[status] ?? status;
}

function getArtifactDownloadHref(executionId: string, artifact: string) {
  return withBasePath(`/api/importacao/download?executionId=${executionId}&artifact=${artifact}`);
}

function buildArtifactLinks(execution: ImportExecutionSnapshot) {
  return [
    {
      key: "original",
      label: "Arquivo original",
      href: getArtifactDownloadHref(execution.id, "original"),
      available: Boolean(execution.originalFilePath)
    },
    {
      key: "report",
      label: "report.json",
      href: getArtifactDownloadHref(execution.id, "report"),
      available: typeof execution.artifacts?.reportPath === "string"
    },
    {
      key: "reportMarkdown",
      label: "report.md",
      href: getArtifactDownloadHref(execution.id, "reportMarkdown"),
      available: typeof execution.artifacts?.reportMarkdownPath === "string"
    },
    {
      key: "loadResult",
      label: "load-result.json",
      href: getArtifactDownloadHref(execution.id, "loadResult"),
      available: typeof execution.artifacts?.loadResultPath === "string"
    }
  ].filter((entry) => entry.available);
}

export function ImportWorkspace({ initialDashboard, feedback }: ImportWorkspaceProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedWorkbookName, setSelectedWorkbookName] = useState<string | null>(null);
  const [selectedOperationalWorkbookName, setSelectedOperationalWorkbookName] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboard.activeExecution) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(withBasePath("/api/importacao/dashboard"), {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const nextDashboard = (await response.json()) as ImportDashboardSnapshot;
      setDashboard(nextDashboard);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [dashboard.activeExecution]);

  const filteredHistory = useMemo(() => {
    return dashboard.history.filter((execution) => {
      const matchesStatus = statusFilter === "todos" ? true : execution.status === statusFilter;
      const matchesDate = dateFilter
        ? execution.createdAt.startsWith(dateFilter)
        : true;

      return matchesStatus && matchesDate;
    });
  }, [dashboard.history, dateFilter, statusFilter]);

  const uploadBlocked = Boolean(dashboard.activeExecution);
  const latestResult = dashboard.latestResult;

  const cardStyle = {
    background: "#fff",
    border: "0.5px solid #D3D1C7",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "none"
  };

  const sectionHeaderStyle = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "#888780",
    textTransform: "uppercase" as const,
    mb: 0.5,
    fontFamily: "Manrope, sans-serif"
  };

  return (
    <Stack spacing={3}>
      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography sx={sectionHeaderStyle}>
              Nova importação
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "Manrope, sans-serif" }}>
              Envie um único arquivo <code>.xlsx</code> do legado. O processamento segue de forma assíncrona no worker interno.
            </Typography>
            {uploadBlocked ? (
              <Alert severity="warning">
                Aguarde a conclusão da execução ativa antes de enviar outro arquivo.
              </Alert>
            ) : (
              <Alert severity="info">
                O arquivo original será preservado com hash e metadata para auditoria e reprocessamento.
              </Alert>
            )}
            <Box component="form" action={createImportExecutionAction}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <Button component="label" variant="outlined" disabled={uploadBlocked}>
                  Selecionar .xlsx
                  <input
                    hidden
                    type="file"
                    name="workbook"
                    accept=".xlsx"
                    onChange={(event) => {
                      const nextFile = event.currentTarget.files?.[0] ?? null;
                      setSelectedWorkbookName(nextFile?.name ?? null);
                    }}
                  />
                </Button>
                <Button type="submit" variant="contained" disabled={uploadBlocked}>
                  Iniciar importação
                </Button>
              </Stack>
              {selectedWorkbookName ? (
                <Typography sx={{ mt: 1.5 }} variant="body2" color="text.secondary">
                  Arquivo selecionado: <strong>{selectedWorkbookName}</strong>
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography sx={sectionHeaderStyle}>
              Importação operacional de itens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "Manrope, sans-serif" }}>
              Atualize apenas a estrutura operacional dos itens via <code>.csv</code>, com histórico, rastreabilidade e mapeamento automático das colunas conhecidas.
            </Typography>
            <Alert severity="info">
              Esta trilha não importa fichas técnicas legadas. Ela serve para manutenção recorrente do cadastro operacional.
            </Alert>
            <Box component="form" action={createOperationalItemImportAction}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <Button component="label" variant="outlined">
                  Selecionar .csv
                  <input
                    hidden
                    type="file"
                    name="operationalWorkbook"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const nextFile = event.currentTarget.files?.[0] ?? null;
                      setSelectedOperationalWorkbookName(nextFile?.name ?? null);
                    }}
                  />
                </Button>
                <Button type="submit" variant="contained">
                  Atualizar itens
                </Button>
              </Stack>
              {selectedOperationalWorkbookName ? (
                <Typography sx={{ mt: 1.5 }} variant="body2" color="text.secondary">
                  Arquivo selecionado: <strong>{selectedOperationalWorkbookName}</strong>
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography sx={sectionHeaderStyle}>
              Importação configurável de itens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "Manrope, sans-serif" }}>
              Envie sua planilha em qualquer formato e escolha manualmente o mapeamento de colunas (De/Para).
            </Typography>
            <Alert severity="info">
              Ideal para quando a planilha não segue o padrão automático ou vem de fontes externas variadas.
            </Alert>
            <Box>
              <Button component={Link} href="/importacao/itens" variant="contained">
                Abrir importador configurável
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>


      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography sx={sectionHeaderStyle}>
              Execução ativa
            </Typography>
            {dashboard.activeExecution ? (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip label={formatStatus(dashboard.activeExecution.status)} color="warning" />
                  <Chip label={dashboard.activeExecution.currentStage} variant="outlined" />
                </Stack>
                <Typography variant="body2">
                  Arquivo em processamento: <strong>{dashboard.activeExecution.originalFileName}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Início: {formatDateTime(dashboard.activeExecution.startedAt)}
                </Typography>
                <Alert severity="info">
                  O status desta execução será atualizado automaticamente enquanto o worker interno estiver processando a fila.
                </Alert>
                <Box
                  component="form"
                  action={cancelImportExecutionAction}
                  sx={{ pt: 0.5 }}
                >
                  <input type="hidden" name="executionId" value={dashboard.activeExecution.id} />
                  <Button
                    type="submit"
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={(event) => {
                      if (!window.confirm("Cancelar esta importação? Itens já processados podem ter sido salvos parcialmente.")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Cancelar importação
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Alert severity="success">Nenhuma importação ativa neste momento.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography sx={sectionHeaderStyle}>
              Resultado operacional
            </Typography>
            {latestResult ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip label={formatStatus(latestResult.status)} color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {latestResult.originalFileName}
                  </Typography>
                </Stack>
                {latestResult.friendlySummary ? (
                  <Stack spacing={1.5}>
                    <Typography variant="h5">{latestResult.friendlySummary.headline}</Typography>
                    <Box>
                      <Typography variant="subtitle2">O que aconteceu</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {latestResult.friendlySummary.whatHappened}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Impacto</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {latestResult.friendlySummary.impact}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">O que fazer agora</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {latestResult.friendlySummary.whatToDoNow}
                      </Typography>
                    </Box>
                    {latestResult.friendlySummary.nextAction ? (
                      <Button
                        component={Link}
                        href={latestResult.friendlySummary.nextAction.href}
                        variant="outlined"
                      >
                        {latestResult.friendlySummary.nextAction.label}
                      </Button>
                    ) : null}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Esta execução ainda não possui resumo amigável publicado.
                  </Typography>
                )}

                {buildArtifactLinks(latestResult).length > 0 ? (
                  <>
                    <Divider />
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                      {buildArtifactLinks(latestResult).map((artifact) => (
                        <Button
                          key={artifact.key}
                          component={Link}
                          href={artifact.href}
                          variant="text"
                        >
                          {artifact.label}
                        </Button>
                      ))}
                    </Stack>
                  </>
                ) : null}

                {latestResult.technicalDetails ? (
                  <Accordion disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                      <Typography variant="subtitle2">Detalhes tecnicos</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: "grey.100",
                          overflowX: "auto",
                          fontSize: "0.78rem"
                        }}
                      >
                        {JSON.stringify(latestResult.technicalDetails, null, 2)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ) : null}
              </Stack>
            ) : (
              <Alert severity="info">Nenhuma execução concluída registrada ainda.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography sx={sectionHeaderStyle}>
              Histórico de execuções
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                sx={{ minWidth: 220 }}
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="processando">Processando</option>
                <option value="concluida">Concluída</option>
                <option value="concluida_com_conflitos">Concluída com conflitos</option>
                <option value="falha">Falha</option>
              </TextField>
              <TextField
                label="Data"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ maxWidth: 220 }}
              />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>Arquivo</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>Início</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>Fim</TableCell>
                  <TableCell sx={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>Pendências</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((execution) => (
                  <TableRow key={execution.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "Manrope, sans-serif" }}>
                          {execution.originalFileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {execution.requestedByName ?? "Sistema"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{formatStatus(execution.status)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{formatDateTime(execution.startedAt ?? execution.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{formatDateTime(execution.finishedAt)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{execution.conflictCount}</TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Alert severity="info">Nenhuma execução encontrada com os filtros atuais.</Alert>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>

      <PageFeedbackSnackbar message={feedback?.message} severity={feedback?.severity} />
    </Stack>
  );
}
