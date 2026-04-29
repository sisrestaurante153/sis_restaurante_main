"use client";

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme, type Theme } from "@mui/material/styles";
import { Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineSeparator } from "@mui/lab";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { EmptyState } from "@/components/ui/EmptyState";

interface AuditTimelineProps {
  entries: Array<{
    id: string;
    entity: string;
    entityLabel: string;
    action: string;
    userName: string;
    createdAt: string;
    beforeSummary: string | null;
    afterSummary: string | null;
    beforeJson?: unknown;
    afterJson?: unknown;
  }>;
}

const AUDIT_LABELS: Record<string, string> = {
  action: "Acao",
  actorName: "Responsavel",
  aliasApplied: "Alias aplicado",
  componentType: "Tipo de componente",
  components: "Componentes",
  conflictId: "Conflito",
  cookingFactorNet: "Fator de coccao liquido",
  cookingFactorGross: "Fator de coccao bruto",
  cookingIndex: "Indice de coccao",
  costReal: "Custo real",
  costs: "Custos",
  createdAt: "Criado em",
  direct: "Custo direto",
  entityLabel: "Registro",
  finalOutput: "Rendimento final",
  inherited: "Custo herdado",
  itemLabel: "Item",
  itemName: "Item",
  itemType: "Tipo",
  mealCmv: "CMV refeicao",
  notes: "Observacoes",
  packaging: "Embalagem",
  packagingCost: "Custo de embalagem",
  path: "Caminho",
  perKg: "Custo por kg",
  perPortion: "Custo por porcao",
  portions: "Porcoes",
  quantity: "Quantidade",
  quantityGross: "Quantidade bruta",
  quantityNet: "Quantidade liquida",
  salePrice: "Preco de venda",
  status: "Status",
  total: "Custo total",
  totalGross: "Peso bruto total",
  totalInputCost: "Custo dos insumos",
  totalNet: "Peso liquido total",
  updatedAt: "Atualizado em",
  usageUnit: "Unidade",
  yieldMode: "Modo de rendimento"
};

const AUDIT_HIDDEN_KEYS = new Set([
  "createdAt",
  "depth",
  "entity",
  "fichaId",
  "id",
  "itemId",
  "lastCalculatedAt",
  "path",
  "updatedAt"
]);

type AuditDetailRow = {
  label: string;
  value: string | string[];
};

function resolveActionLabel(action: string) {
  if (action.includes("updated")) {
    return "atualizada";
  }

  if (action.includes("created")) {
    return "criada";
  }

  if (action.includes("duplicated")) {
    return "duplicada";
  }

  if (action.includes("inactivated")) {
    return "inativada";
  }

  if (action.includes("reconciled") || action.includes("resolved")) {
    return "resolvida";
  }

  return action.replaceAll(".", " ");
}

function resolveEntityLabel(entity: string) {
  const normalized = entity.toLowerCase();

  if (normalized.includes("ficha")) {
    return "Ficha";
  }

  if (normalized.includes("import")) {
    return "Pendencia";
  }

  if (normalized.includes("item")) {
    return "Item";
  }

  return "Auditoria";
}

function buildEventTitle(entry: AuditTimelineProps["entries"][number]) {
  const suffix = resolveActionLabel(entry.action);

  if (entry.entityLabel.startsWith("Ficha") || entry.entityLabel.startsWith("Item") || entry.entityLabel.startsWith("Pendencia")) {
    return `${entry.entityLabel} ${suffix}`;
  }

  return `${resolveEntityLabel(entry.entity)} "${entry.entityLabel}" ${suffix}`;
}

function resolveDotColor(entity: string, theme: Theme) {
  const normalized = entity.toLowerCase();
  const customPalette = (theme.palette as typeof theme.palette & {
    custom?: {
      ficha: string;
      item: string;
      pendencia: string;
      auditoria: string;
    };
  }).custom;

  if (normalized.includes("ficha")) {
    return customPalette?.ficha ?? theme.palette.secondary.main;
  }

  if (normalized.includes("import")) {
    return customPalette?.pendencia ?? theme.palette.warning.main;
  }

  if (normalized.includes("item")) {
    return customPalette?.item ?? theme.palette.primary.main;
  }

  return customPalette?.auditoria ?? theme.palette.info.main;
}

function humanizeKey(key: string) {
  if (AUDIT_LABELS[key]) {
    return AUDIT_LABELS[key];
  }

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

function stringifyAuditScalar(value: unknown) {
  if (value == null || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return String(value);
}

function summarizeAuditObject(value: Record<string, unknown>) {
  const title =
    stringifyAuditScalar(value.itemName ?? value.name ?? value.entityLabel ?? value.aliasApplied ?? value.status ?? value.itemType)
      .trim();
  const supportingKeys = ["quantity", "quantityNet", "quantityGross", "usageUnit", "total", "perKg", "status"];
  const supporting = supportingKeys
    .map((key) => {
      const fieldValue = value[key];

      if (fieldValue == null || fieldValue === "") {
        return null;
      }

      return `${humanizeKey(key)}: ${stringifyAuditScalar(fieldValue)}`;
    })
    .filter((piece): piece is string => piece != null);

  if (title && supporting.length > 0) {
    return `${title} • ${supporting.join(" • ")}`;
  }

  if (title) {
    return title;
  }

  return Object.entries(value)
    .filter(([key, fieldValue]) => !AUDIT_HIDDEN_KEYS.has(key) && fieldValue != null && fieldValue !== "")
    .slice(0, 4)
    .map(([key, fieldValue]) => `${humanizeKey(key)}: ${stringifyAuditScalar(fieldValue)}`)
    .join(" • ");
}

function flattenAuditValue(
  value: unknown,
  label: string,
  rows: AuditDetailRow[],
  parentKey?: string
) {
  if (value == null || value === "") {
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }

    if (value.every((item) => item != null && typeof item === "object" && !Array.isArray(item))) {
      const summarized = value
        .map((item) => summarizeAuditObject(item as Record<string, unknown>))
        .filter((item) => item.length > 0);

      if (summarized.length > 0) {
        rows.push({ label, value: summarized });
      }

      return;
    }

    rows.push({ label, value: value.map((item) => stringifyAuditScalar(item)) });
    return;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, fieldValue]) => !AUDIT_HIDDEN_KEYS.has(key) && fieldValue != null && fieldValue !== ""
    );

    if (entries.length === 0) {
      return;
    }

    for (const [key, fieldValue] of entries) {
      const nextLabel = parentKey === "costs" ? `${label} / ${humanizeKey(key)}` : humanizeKey(key);
      flattenAuditValue(fieldValue, nextLabel, rows, key);
    }

    return;
  }

  rows.push({ label, value: stringifyAuditScalar(value) });
}

function extractAuditRows(value: unknown, summary: string | null) {
  const rows: AuditDetailRow[] = [];

  if (value != null && typeof value === "object") {
    flattenAuditValue(value, "Detalhes", rows);
  }

  if (rows.length > 0) {
    return rows;
  }

  if (summary) {
    return [{ label: "Resumo", value: summary }];
  }

  return [];
}

function AuditDetailBlock({
  label,
  rows,
  tone
}: {
  label: string;
  rows: AuditDetailRow[];
  tone: "before" | "after";
}) {
  const theme = useTheme();
  const paletteColor = tone === "before" ? theme.palette.error.main : theme.palette.success.main;

  return (
    <Stack
      spacing={1}
      sx={{
        minWidth: 0,
        flex: 1,
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(paletteColor, 0.28),
        bgcolor: alpha(paletteColor, 0.06)
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </Typography>
      <Stack spacing={1}>
        {rows.map((row, index) => (
          <Box key={`${label}-${row.label}-${index}`} sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
              {row.label}
            </Typography>
            {Array.isArray(row.value) ? (
              <Stack spacing={0.5}>
                {row.value.slice(0, 4).map((item, itemIndex) => (
                  <Typography
                    key={`${row.label}-${itemIndex}`}
                    variant="body2"
                    sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
                  >
                    {item}
                  </Typography>
                ))}
                {row.value.length > 4 ? (
                  <Typography variant="caption" color="text.secondary">
                    +{row.value.length - 4} registro(s)
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                {row.value}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const createdAt = dayjs(entry.createdAt);
      const matchesQuery =
        !normalizedQuery ||
        `${entry.entityLabel} ${entry.action} ${entry.userName}`.toLowerCase().includes(normalizedQuery);
      const matchesStart = !startDate || createdAt.isAfter(startDate.startOf("day")) || createdAt.isSame(startDate.startOf("day"));
      const matchesEnd = !endDate || createdAt.isBefore(endDate.endOf("day")) || createdAt.isSame(endDate.endOf("day"));

      return matchesQuery && matchesStart && matchesEnd;
    });
  }, [endDate, entries, query, startDate]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            fullWidth
            label="Filtrar por entidade"
            placeholder="Filtrar por entidade..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />

          <DatePicker label="Data inicial" value={startDate} onChange={setStartDate} />
          <DatePicker label="Data final" value={endDate} onChange={setEndDate} />
        </Stack>

        {visibleEntries.length === 0 ? (
          <Paper>
            <EmptyState
              icon={<HistoryRoundedIcon sx={{ fontSize: 36 }} />}
              title="Nenhum evento encontrado"
              description="Ajuste os filtros para localizar outra janela da linha do tempo operacional."
            />
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Timeline
              position="right"
              sx={{
                my: 0,
                px: 0,
                "& .MuiTimelineItem-root:before": {
                  display: "none"
                }
              }}
            >
              {visibleEntries.map((entry, index) => (
                <TimelineItem key={entry.id}>
                  <TimelineSeparator>
                    <TimelineDot sx={{ bgcolor: resolveDotColor(entry.entity, theme), boxShadow: "none" }} />
                    {index < visibleEntries.length - 1 ? <TimelineConnector /> : null}
                  </TimelineSeparator>
                  <TimelineContent sx={{ py: 1.5, px: { xs: 1, sm: 2 }, minWidth: 0 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" spacing={2} flexWrap="wrap" useFlexGap>
                        <Typography variant="body1" fontWeight={500}>
                          {buildEventTitle(entry)}
                        </Typography>
                        <Tooltip title={dayjs(entry.createdAt).format("DD/MM/YYYY HH:mm:ss")}>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(entry.createdAt).format("HH:mm")} - {dayjs(entry.createdAt).format("DD/MM/YYYY")}
                          </Typography>
                        </Tooltip>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        por {entry.userName}
                      </Typography>

                      {(() => {
                        const beforeRows = extractAuditRows(entry.beforeJson, entry.beforeSummary);
                        const afterRows = extractAuditRows(entry.afterJson, entry.afterSummary);
                        const useBlockLayout = beforeRows.length > 0 || afterRows.length > 0;

                        if (!entry.beforeSummary && !entry.afterSummary && beforeRows.length === 0 && afterRows.length === 0) {
                          return null;
                        }

                        if (useBlockLayout) {
                          return (
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                              {beforeRows.length > 0 ? <AuditDetailBlock label="Antes" rows={beforeRows} tone="before" /> : null}
                              {afterRows.length > 0 ? <AuditDetailBlock label="Depois" rows={afterRows} tone="after" /> : null}
                            </Stack>
                          );
                        }

                        if (entry.beforeSummary && entry.afterSummary) {
                          return (
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography
                                variant="body2"
                                sx={{ textDecoration: "line-through", color: "error.main" }}
                              >
                                {entry.beforeSummary}
                              </Typography>
                              <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                              <Typography variant="body2" fontWeight={600} color="success.main">
                                {entry.afterSummary}
                              </Typography>
                            </Stack>
                          );
                        }

                        if (entry.afterSummary) {
                          return (
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {entry.afterSummary}
                            </Typography>
                          );
                        }

                        return (
                          <Typography variant="body2" sx={{ textDecoration: "line-through", color: "error.main" }}>
                            {entry.beforeSummary}
                          </Typography>
                        );
                      })()}

                      <Divider sx={{ pt: 0.5 }} />
                    </Stack>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>

            {filteredEntries.length > visibleCount ? (
              <Box sx={{ pt: 1, textAlign: "center" }}>
                <Button variant="text" onClick={() => setVisibleCount((current) => current + 10)}>
                  Carregar mais
                </Button>
              </Box>
            ) : null}
          </Paper>
        )}
      </Stack>
    </LocalizationProvider>
  );
}
