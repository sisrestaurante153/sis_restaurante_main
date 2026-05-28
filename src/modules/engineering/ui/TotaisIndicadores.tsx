"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FormSection } from "@/components/ui/FormSection";
import type { ComponentsEditorSummary } from "@/modules/engineering/ui/components-editor.types";

interface TotaisIndicadoresProps {
  summary: ComponentsEditorSummary;
  salePriceInput: string;
  variableExpensePercentInput: string;
  onSalePriceChange: (value: string) => void;
  onVariableExpensePercentChange: (value: string) => void;
  onAssemblyEnabledChange?: (value: boolean) => void;
}

// Phase 09.2 B4 tokens: match update/tela-ficha-tecnica-v2.html 1:1.
const TOKENS = {
  surface: "#FFFFFF",
  bg: "#FAFAF9",
  border: "#D3D1C7",
  borderH: "#B8B6AC",
  text: "#2B2A26",
  text2: "#5F5E5A",
  text3: "#888780",
  verde: "#1B6B2C",
  verdeL: "#EAF3DE",
  verdeB: "#C0DD97",
  ambar: "#854F0B",
  ambarL: "#FBEFD6",
  verm: "#A32D2D",
  vermL: "#FADBDB",
  azul: "#185FA5",
  azulL: "#E6F1FB",
  azulB: "#B5D4F4",
  radius: "8px",
  radiusS: "6px"
} as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function parseFiniteMetric(value: string | null | undefined) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetricValue(value: string | null | undefined, formatter: (parsed: number) => string) {
  const parsed = parseFiniteMetric(value);
  if (parsed === null) return value && value.trim() !== "" ? value : "--";
  return formatter(parsed);
}

function formatCurrency(value: string | null | undefined) {
  return formatMetricValue(value, (parsed) => currencyFormatter.format(parsed));
}

function formatPercent(value: string | null | undefined) {
  return formatMetricValue(value, (parsed) => `${(parsed * 100).toFixed(2)} %`);
}

function formatFactorPercent(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return "--";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return `${(parsed * 100).toFixed(0)}`;
}

function resolveFactorColor(value: string | null | undefined) {
  if (!value) return TOKENS.text3;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return TOKENS.text3;
  return parsed * 100 >= 100 ? TOKENS.verde : TOKENS.verm;
}

// HS strip item: label overline + value + optional note.
function HsItem({
  label,
  value,
  unit,
  note,
  valueColor,
  isLast
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <Box
      sx={{
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        position: "relative",
        "&::after": isLast
          ? undefined
          : {
              content: '""',
              position: "absolute",
              right: 0,
              top: "20%",
              bottom: "20%",
              width: "1px",
              background: TOKENS.border
            }
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: TOKENS.text3,
          fontWeight: 500
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <Typography
          component="span"
          sx={{ fontSize: 18, fontWeight: 500, color: valueColor ?? TOKENS.text }}
        >
          {value}
        </Typography>
        {unit ? (
          <Typography component="span" sx={{ fontSize: 11, color: TOKENS.text2 }}>
            {unit}
          </Typography>
        ) : null}
      </Box>
      <Typography component="span" sx={{ fontSize: 10, color: TOKENS.text3 }}>
        {note ?? "\u00A0"}
      </Typography>
    </Box>
  );
}

// HTML .qf-row — label a esquerda, value a direita.
function QfRow({
  label,
  value,
  iconChar,
  iconBg,
  iconColor,
  valueColor,
  valueSmallSuffix,
  highlight,
  highlightColor,
  muted
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  iconChar?: string;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  valueSmallSuffix?: string;
  highlight?: boolean;
  highlightColor?: "ambar" | "verde";
  muted?: boolean;
}) {
  const hiBg =
    highlightColor === "verde" ? TOKENS.verdeL : highlightColor === "ambar" ? TOKENS.ambarL : undefined;
  const hiBorder =
    highlightColor === "verde" ? TOKENS.verde : highlightColor === "ambar" ? TOKENS.ambar : undefined;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: highlight ? "10px 18px 10px 16px" : "8px 18px",
        gap: "12px",
        opacity: muted ? 0.25 : 1,
        transition: "opacity 0.3s ease, background 0.15s ease",
        background: highlight && hiBg ? hiBg : "transparent",
        borderLeft: highlight && hiBorder ? `2px solid ${hiBorder}` : undefined,
        margin: highlight ? "4px 0" : 0
      }}
    >
      <Box
        sx={{
          fontSize: 12,
          color: highlight ? TOKENS.text : TOKENS.text2,
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: highlight ? 500 : 400
        }}
      >
        {iconChar ? (
          <Box
            component="span"
            sx={{
              width: 18,
              height: 18,
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              flexShrink: 0,
              background: iconBg,
              color: iconColor
            }}
          >
            {iconChar}
          </Box>
        ) : null}
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: highlight ? 14 : 13,
          fontWeight: 500,
          color: valueColor ?? TOKENS.text,
          textAlign: "right",
          whiteSpace: "nowrap"
        }}
      >
        {value}
        {valueSmallSuffix ? (
          <Typography component="span" sx={{ fontSize: 10, color: TOKENS.text3, ml: 0.5 }}>
            {valueSmallSuffix}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function QSep() {
  return <Box sx={{ height: "0.5px", background: TOKENS.border, margin: "3px 18px" }} />;
}

// QF card (Custos/Venda) with title + optional header action.
function QfCard({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        background: TOKENS.surface,
        border: `0.5px solid ${TOKENS.border}`,
        borderRadius: TOKENS.radius,
        overflow: "hidden",
        "&:hover": { borderColor: TOKENS.borderH }
      }}
    >
      <Box
        sx={{
          padding: "12px 18px 10px",
          borderBottom: `0.5px solid ${TOKENS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: TOKENS.text2,
            fontWeight: 600
          }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      <Box sx={{ padding: "6px 0" }}>{children}</Box>
    </Box>
  );
}

// Toggle HTML .tgl para Montagem e Descartaveis.
function MontagemToggle({
  active,
  onToggle
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        userSelect: "none"
      }}
    >
      <Typography component="span" sx={{ fontSize: 11, color: TOKENS.text2, fontWeight: 500 }}>
        Montagem e Descartaveis
      </Typography>
      <Box
        sx={{
          position: "relative",
          width: 34,
          height: 18,
          borderRadius: "9px",
          background: active ? TOKENS.azulL : TOKENS.border,
          border: active ? `1px solid ${TOKENS.azul}` : "none",
          transition: "background 0.2s ease",
          flexShrink: 0,
          "&::after": {
            content: '""',
            position: "absolute",
            left: active ? "19px" : "3px",
            top: "3px",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: active ? TOKENS.azul : TOKENS.text3,
            transition: "left 0.2s ease, background 0.2s ease"
          }
        }}
      />
    </Box>
  );
}

function resolveCmvStyle(status: ComponentsEditorSummary["cmvHealthStatus"]) {
  if (status === "Excelente") return { bg: "#D6F0E0", fg: "#0F5A22", border: "#8ECFA8", label: "Excelente" };
  if (status === "Saudavel")  return { bg: TOKENS.verdeL, fg: TOKENS.verde, border: TOKENS.verdeB, label: "Saudável" };
  if (status === "Atencao")   return { bg: TOKENS.ambarL, fg: TOKENS.ambar, border: "#FAC775", label: "Atenção" };
  if (status === "Critico")   return { bg: TOKENS.vermL, fg: TOKENS.verm, border: "#F09595", label: "Crítico" };
  return { bg: "#EEEEEE", fg: TOKENS.text3, border: TOKENS.border, label: "Indefinido" };
}

// Barra horizontal de saude do CMV com 4 faixas, marcador na posicao real e
// linguagem clara para qualquer pessoa — sem jargao tecnico.
function CmvHealthBar({
  status,
  cmvHealthPercent,
  hideHeader
}: {
  status: ComponentsEditorSummary["cmvHealthStatus"];
  cmvHealthPercent?: string | null;
  hideHeader?: boolean;
}) {
  const SCALE_MAX = 60;
  const ZONES = [
    { label: "Excelente",  range: "< 30%",    desc: "Sua margem está ótima",             from: 0,  to: 30,       color: "#D6F0E0", border: "#8ECFA8", fg: "#0F5A22" },
    { label: "Saudável",   range: "30% a 35%", desc: "Operação equilibrada",              from: 30, to: 35,       color: TOKENS.verdeL, border: TOKENS.verdeB, fg: TOKENS.verde },
    { label: "Atenção",    range: "35% a 40%", desc: "Revise preços ou insumos",          from: 35, to: 40,       color: TOKENS.ambarL, border: "#FAC775", fg: TOKENS.ambar },
    { label: "Crítico",    range: "> 40%",    desc: "Produto provavelmente no prejuízo", from: 40, to: SCALE_MAX, color: TOKENS.vermL, border: "#F09595", fg: TOKENS.verm },
  ] as const;

  const ratio = cmvHealthPercent ? parseFloat(cmvHealthPercent) : null;
  const cmvPct = ratio !== null && Number.isFinite(ratio) ? ratio * 100 : null;
  const needlePct = cmvPct !== null ? Math.min(cmvPct, SCALE_MAX) / SCALE_MAX * 100 : null;
  const activeStyle = resolveCmvStyle(status);

  // Texto do tooltip da agulha: explica o que o CMV significa em linguagem simples.
  const needleTooltip = cmvPct !== null
    ? `Seu CMV atual é ${cmvPct.toFixed(2)}% — isso significa que para cada R$ 1,00 vendido, R$ ${(cmvPct / 100).toFixed(2).replace(".", ",")} é custo de insumos`
    : "";

  return (
    <Box sx={{ padding: "14px 20px 16px" }}>
      {!hideHeader && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: "12px", gap: 1 }}>
          <Typography
            component="span"
            sx={{ fontSize: 13, fontWeight: 700, color: TOKENS.text, lineHeight: 1.3 }}
          >
            Como está o CMV da sua ficha?
          </Typography>
          {cmvPct !== null ? (
            <Box
              component="span"
              sx={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px",
                borderRadius: "20px", letterSpacing: "0.03em", flexShrink: 0,
                background: activeStyle.bg, color: activeStyle.fg, border: `1px solid ${activeStyle.border}`
              }}
            >
              {activeStyle.label} · {cmvPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </Box>
          ) : (
            <Typography component="span" sx={{ fontSize: 11, color: TOKENS.text3, flexShrink: 0 }}>
              Informe o preço de venda
            </Typography>
          )}
        </Box>
      )}

      {/* Faixas coloridas + agulha */}
      <Box sx={{ position: "relative", height: 14, display: "flex", gap: "3px", overflow: "visible", mb: "4px" }}>
        {ZONES.map((zone) => (
          <Box
            key={zone.label}
            sx={{
              flex: zone.to - zone.from,
              height: "100%",
              background: zone.color,
              border: `0.5px solid ${zone.border}`,
              borderRadius: "5px",
            }}
          />
        ))}
        {/* Marcador com tooltip explicativo */}
        {needlePct !== null && (
          <Tooltip title={needleTooltip} arrow placement="top">
            <Box
              sx={{
                position: "absolute",
                left: `${needlePct}%`,
                top: "-5px",
                transform: "translateX(-50%)",
                width: "3px",
                height: "24px",
                background: TOKENS.text,
                borderRadius: "2px",
                cursor: "default",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: TOKENS.text,
                }
              }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Nomenclaturas das faixas de porcentagem logo abaixo dos blocos de cores */}
      <Box sx={{ display: "flex", gap: "3px", mb: "6px", mt: "4px" }}>
        {ZONES.map((zone) => (
          <Box key={zone.label} sx={{ flex: zone.to - zone.from, textAlign: "left" }}>
            <Typography component="div" sx={{ fontSize: 9, color: TOKENS.text3, fontWeight: 500 }}>
              {zone.range}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Labels das zonas com descrição de ação */}
      <Box sx={{ display: "flex", gap: "3px" }}>
        {ZONES.map((zone) => (
          <Box key={zone.label} sx={{ flex: zone.to - zone.from, textAlign: "left", px: "2px" }}>
            <Typography component="div" sx={{ fontSize: 10, color: zone.fg, fontWeight: 700, lineHeight: 1.2 }}>
              {zone.label}
            </Typography>
            <Typography component="div" sx={{ fontSize: 9, color: TOKENS.text3, lineHeight: 1.3, mt: "2px" }}>
              {zone.desc}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Legenda em linguagem simples */}
      <Typography component="span" sx={{ fontSize: 9, color: TOKENS.text3, display: "block", mt: "10px", textAlign: "center", letterSpacing: "0.02em" }}>
        Percentual do custo em relação ao preço de venda
      </Typography>
    </Box>
  );
}

// Barra de margem de contribuição com 4 faixas — mesmo design do CmvHealthBar.
// Escala: 0-35% Crítico | 35-50% Atenção | 50-65% Saudável | 65%+ Excelente (cap 80%).
function MargemBar({ mcPercent }: { mcPercent: number | null }) {
  const SCALE_MAX = 80;
  const MC_ZONES = [
    { label: "Crítico",   range: "< 35%",      from: 0,  to: 35,       color: TOKENS.vermL,  border: "#F09595", fg: TOKENS.verm  },
    { label: "Atenção",   range: "35% a 50%",  from: 35, to: 50,       color: TOKENS.ambarL, border: "#FAC775", fg: TOKENS.ambar },
    { label: "Saudável",  range: "50% a 65%",  from: 50, to: 65,       color: TOKENS.verdeL, border: TOKENS.verdeB, fg: TOKENS.verde },
    { label: "Excelente", range: "> 65%",       from: 65, to: SCALE_MAX, color: "#D6F0E0",    border: "#8ECFA8", fg: "#0F5A22"   },
  ] as const;

  const capped = mcPercent !== null ? Math.min(mcPercent, SCALE_MAX) : null;
  const needlePct = capped !== null ? (capped / SCALE_MAX) * 100 : null;
  const activeZone =
    mcPercent === null
      ? null
      : mcPercent < 35
        ? MC_ZONES[0]
        : mcPercent < 50
          ? MC_ZONES[1]
          : mcPercent < 65
            ? MC_ZONES[2]
            : MC_ZONES[3];

  return (
    <Box sx={{ padding: "4px 18px 12px" }}>
      {/* Faixas coloridas + agulha */}
      <Box sx={{ position: "relative", height: 14, display: "flex", gap: "3px", overflow: "visible", mb: "4px" }}>
        {MC_ZONES.map((zone) => (
          <Box
            key={zone.label}
            sx={{
              flex: zone.to - zone.from,
              height: "100%",
              background: zone.color,
              border: `0.5px solid ${zone.border}`,
              borderRadius: "5px"
            }}
          />
        ))}
        {needlePct !== null && (
          <Box
            sx={{
              position: "absolute",
              left: `${needlePct}%`,
              top: "-5px",
              transform: "translateX(-50%)",
              width: "3px",
              height: "24px",
              background: TOKENS.text,
              borderRadius: "2px",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: TOKENS.text
              }
            }}
          />
        )}
      </Box>

      {/* Rótulos de faixa alinhados ao início de cada zona */}
      <Box sx={{ display: "flex", gap: "3px", mb: "4px" }}>
        {MC_ZONES.map((zone) => (
          <Box key={zone.label} sx={{ flex: zone.to - zone.from, textAlign: "left" }}>
            <Typography component="div" sx={{ fontSize: 9, color: TOKENS.text3, fontWeight: 500 }}>
              {zone.range}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Nome das zonas */}
      <Box sx={{ display: "flex", gap: "3px" }}>
        {MC_ZONES.map((zone) => (
          <Box key={zone.label} sx={{ flex: zone.to - zone.from, textAlign: "left" }}>
            <Typography
              component="div"
              sx={{
                fontSize: 10,
                color: activeZone?.label === zone.label ? zone.fg : TOKENS.text3,
                fontWeight: activeZone?.label === zone.label ? 700 : 400,
                lineHeight: 1.2
              }}
            >
              {zone.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {mcPercent !== null && (
        <Typography component="span" sx={{ fontSize: 9, color: TOKENS.text3, display: "block", mt: "6px", textAlign: "center", letterSpacing: "0.02em" }}>
          Margem de contribuição atual: {mcPercent.toFixed(1)}%
        </Typography>
      )}
    </Box>
  );
}

// Cell da Leitura Operacional.
function LoCell({
  label,
  value,
  sub,
  valueColor,
  fullWidth
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueColor?: string;
  fullWidth?: boolean;
}) {
  return (
    <Box
      sx={{
        background: fullWidth ? TOKENS.ambarL : TOKENS.surface,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        gridColumn: fullWidth ? "1 / -1" : undefined
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: TOKENS.text3,
          fontWeight: 500
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{ fontSize: 15, fontWeight: 500, color: valueColor ?? TOKENS.text }}
      >
        {value}
      </Typography>
      {sub ? (
        <Typography component="span" sx={{ fontSize: 11, color: TOKENS.text3 }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

export function TotaisIndicadores({
  summary,
  salePriceInput,
  variableExpensePercentInput,
  onSalePriceChange,
  onVariableExpensePercentChange,
  onAssemblyEnabledChange
}: TotaisIndicadoresProps) {
  const assemblyEnabled = summary.assemblyEnabled ?? false;

  const weightMissing =
    summary.postCookingWeight === "--" ||
    summary.postCookingWeight === "" ||
    !Number.isFinite(Number(summary.postCookingWeight));

  const salePriceValid =
    parseFiniteMetric(salePriceInput) !== null && Number(salePriceInput) > 0;

  const cmvWithoutPackagingLabel = weightMissing
    ? "Calcular peso"
    : formatMetricValue(summary.costWithoutPackagingPerKg, (parsed) => currencyFormatter.format(parsed));
  const cmvWithPackagingLabel = weightMissing
    ? "Calcular peso"
    : formatMetricValue(summary.costWithPackagingPerKg, (parsed) => currencyFormatter.format(parsed));
  const yieldUnitSuffix = `/${summary.yieldUnit ?? "kg"}`;
  const cmvFinalAppliedLabel = weightMissing
    ? "Calcular peso"
    : formatMetricValue(summary.finalAppliedCmv, (parsed) => `${currencyFormatter.format(parsed)} ${yieldUnitSuffix}`);

  const contributionMarginLabel = salePriceValid
    ? formatCurrency(summary.contributionMarginValue)
    : "Informe o valor";
  const operationalMarginLabel = salePriceValid
    ? formatCurrency(summary.operationalMarginContribution)
    : "Informe o valor";

  // Porcentagem para a barra de margem.
  const mcPercentParsed = parseFiniteMetric(summary.contributionMarginPercent);
  const mcPercent = mcPercentParsed !== null ? mcPercentParsed * 100 : null;

  return (
    <FormSection title="Quadro final da ficha">
      {/* STRIP: Pesos e Rendimento — HTML .hs (4 colunas) */}
      <Box sx={{ mb: 0.5 }}>
        <Typography
          component="span"
          sx={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: TOKENS.text2,
            fontWeight: 600,
            mb: 1,
            display: "block"
          }}
        >
          Pesos e Rendimento
        </Typography>
        <Box
          sx={{
            background: TOKENS.surface,
            border: `0.5px solid ${TOKENS.border}`,
            borderRadius: TOKENS.radius,
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
            overflow: "hidden",
            mb: 2
          }}
        >
          <HsItem
            label="Rendimento da Porcao"
            value={summary.postCookingWeight === "--" ? "--" : summary.postCookingWeight}
            note="total"
          />
          <HsItem
            label="Unidade de Rendimento"
            value={summary.yieldUnit ?? "kg"}
          />
          <HsItem
            label="Fator de Correcao (FC)"
            value={formatFactorPercent(summary.cookingFactorGross)}
            unit={summary.cookingFactorGross ? "%" : undefined}
            note="Bruto -> Limpo"
            valueColor={resolveFactorColor(summary.cookingFactorGross)}
          />
          <HsItem
            label="Indice de Coccao (IC)"
            value={formatFactorPercent(summary.cookingFactorNet)}
            unit={summary.cookingFactorNet ? "%" : undefined}
            note="Limpo -> Pos-coccao"
            valueColor={resolveFactorColor(summary.cookingFactorNet)}
            isLast
          />
        </Box>
      </Box>

      {/* QF COLS: Custos e CMV + Venda e Margem */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 2
        }}
      >
        {/* Custos e CMV */}
        <QfCard
          title="Custos e CMV"
          action={
            onAssemblyEnabledChange ? (
              <MontagemToggle
                active={assemblyEnabled}
                onToggle={() => onAssemblyEnabledChange(!assemblyEnabled)}
              />
            ) : null
          }
        >
          <QfRow
            label="Custo total da ficha / insumos"
            iconChar="$"
            iconBg="rgba(201,168,76,.12)"
            iconColor={TOKENS.ambar}
            value={formatCurrency(summary.totalInputCost)}
            valueColor={TOKENS.ambar}
          />
          <QfRow
            label="CMV sem embalagem"
            iconChar={"\u00F7"}
            iconBg="rgba(62,207,142,.1)"
            iconColor={TOKENS.verde}
            value={cmvWithoutPackagingLabel}
            valueSmallSuffix={weightMissing ? undefined : yieldUnitSuffix}
          />
          <QSep />
          <QfRow
            label="Custo de embalagens e descartaveis"
            iconChar="E"
            iconBg="rgba(245,158,11,.1)"
            iconColor={TOKENS.ambar}
            value={formatCurrency(summary.packagingCost)}
            valueColor={TOKENS.ambar}
            muted={!assemblyEnabled}
          />
          <QfRow
            label="CMV com Embalagem"
            value={cmvWithPackagingLabel}
            valueSmallSuffix={weightMissing ? undefined : yieldUnitSuffix}
            highlight
            highlightColor="ambar"
            muted={!assemblyEnabled}
          />
          <QfRow
            label={assemblyEnabled ? "CMV final aplicado (c/ emb.)" : "CMV final aplicado"}
            value={cmvFinalAppliedLabel}
            valueColor={TOKENS.ambar}
            highlight
            highlightColor="ambar"
          />
        </QfCard>

        {/* Venda e Margem */}
        <QfCard
          title="Venda e Margem"
        >
          {/* Preco de venda input */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px 8px",
              gap: "12px"
            }}
          >
            <Typography component="label" htmlFor="qf-sale-price" sx={{ fontSize: 12, color: TOKENS.text2, flex: 1 }}>
              Preco de venda
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                background: TOKENS.bg,
                border: `0.5px solid ${TOKENS.border}`,
                borderRadius: TOKENS.radiusS,
                overflow: "hidden",
                width: 160,
                flexShrink: 0,
                "&:focus-within": { borderColor: TOKENS.azul }
              }}
            >
              <Box
                component="span"
                sx={{
                  padding: "0 8px",
                  fontSize: 11,
                  color: TOKENS.text3,
                  borderRight: `0.5px solid ${TOKENS.border}`,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  background: TOKENS.bg
                }}
              >
                R$
              </Box>
              <Box
                component="input"
                id="qf-sale-price"
                name="salePrice"
                type="text"
                inputMode="decimal"
                step="0.01"
                aria-label="Preco de venda"
                value={salePriceInput}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onSalePriceChange(event.target.value.replace(",", "."))
                }
                onFocus={(event: React.FocusEvent<HTMLInputElement>) => event.target.select()}
                sx={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: TOKENS.text,
                  fontSize: 13,
                  padding: "0 10px",
                  width: "100%",
                  height: 32,
                  fontFamily: "inherit"
                }}
              />
            </Box>
          </Box>

          {/* Despesa variavel input */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 18px",
              gap: "12px"
            }}
          >
            <Typography
              component="label"
              htmlFor="qf-variable-expense"
              sx={{ fontSize: 12, color: TOKENS.text2, flex: 1 }}
            >
              Despesa variavel de venda (%PV)
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                background: TOKENS.bg,
                border: `0.5px solid ${TOKENS.border}`,
                borderRadius: TOKENS.radiusS,
                overflow: "hidden",
                width: 160,
                flexShrink: 0,
                "&:focus-within": { borderColor: TOKENS.azul }
              }}
            >
              <Box
                component="input"
                id="qf-variable-expense"
                name="variableExpensePercent"
                type="text"
                inputMode="decimal"
                step="0.5"
                aria-label="Despesa variavel de venda (%PV)"
                value={variableExpensePercentInput}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onVariableExpensePercentChange(event.target.value.replace(",", "."))
                }
                onFocus={(event: React.FocusEvent<HTMLInputElement>) => event.target.select()}
                sx={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: TOKENS.text,
                  fontSize: 13,
                  padding: "0 10px",
                  width: "100%",
                  height: 32,
                  fontFamily: "inherit"
                }}
              />
              <Box
                component="span"
                sx={{
                  padding: "0 8px",
                  fontSize: 11,
                  color: TOKENS.text3,
                  borderLeft: `0.5px solid ${TOKENS.border}`,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  background: TOKENS.bg
                }}
              >
                %PV
              </Box>
            </Box>
          </Box>

          <QSep />
          <QfRow label="CMV do kg (%PV)" value={formatPercent(summary.cmvPercentOfSale)} />
          <QfRow
            label="Despesa variavel aplicada"
            value={salePriceValid ? formatCurrency(summary.variableExpenseApplied) : "Informe o valor"}
          />
          <QSep />
          <QfRow
            label="Margem de contribuicao (R$)"
            value={contributionMarginLabel}
            valueColor={TOKENS.verde}
            highlight
            highlightColor="verde"
          />
          <QfRow
            label="Margem de contribuicao (%)"
            value={salePriceValid ? formatPercent(summary.contributionMarginPercent) : "Informe o valor"}
            valueColor={TOKENS.verde}
            highlight
            highlightColor="verde"
          />
          <CmvHealthBar
            status={summary.cmvHealthStatus}
            cmvHealthPercent={summary.cmvHealthPercent}
            hideHeader
          />
        </QfCard>
      </Box>

      {/* LEITURA OPERACIONAL */}
      <Box
        sx={{
          background: TOKENS.surface,
          border: `0.5px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radius,
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            padding: "12px 18px 10px",
            borderBottom: `0.5px solid ${TOKENS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: TOKENS.text2,
              fontWeight: 600
            }}
          >
            Leitura Operacional Consolidada
          </Typography>
          <Typography component="span" sx={{ fontSize: 10, color: TOKENS.text3 }}>
            Visao sintetizada para gestao
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
            gap: "1px",
            background: TOKENS.border
          }}
        >
          <LoCell
            label={summary.referencePriceLabel ?? "Preco de Referencia"}
            value={formatCurrency(summary.referencePrice)}
            sub="Preco de venda configurado"
            valueColor={TOKENS.ambar}
          />
          <LoCell
            label="Custo Real da Ficha"
            value={formatCurrency(summary.costReal)}
            sub="Total de insumos"
          />
          <LoCell
            label={summary.variableExpenseAppliedLabel ?? "Despesa variavel aplicada"}
            value={salePriceValid ? formatCurrency(summary.variableExpenseApplied) : "Informe o valor"}
            sub="Sobre o preco de venda"
          />
          <LoCell
            label={summary.operationalMarginContributionLabel ?? "Margem de Contribuicao"}
            value={operationalMarginLabel}
            sub="PV menos custos e despesas variaveis"
            valueColor={TOKENS.verde}
          />
          <LoCell
            label={summary.automaticDiagnosisLabel ?? "Diagnostico automatico"}
            value={summary.automaticDiagnosis ?? "--"}
            fullWidth
          />
        </Box>
      </Box>
    </FormSection>
  );
}
