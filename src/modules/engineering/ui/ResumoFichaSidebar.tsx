import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface ResumoFichaSidebarProps {
  perKg: string;
  costReal: string;
  perPortion: string | null;
  total: string;
  lastCalculatedAt: string;
}

function formatCurrency(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

function formatRelativeDate(value: string) {
  const target = new Date(value).getTime();
  const diffMs = target - Date.now();
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "always" });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }

  return rtf.format(Math.round(diffMs / day), "day");
}

function SummaryPair({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption">{label}</Typography>
      <Typography variant={highlight ? "h3" : "body1"} fontWeight={600} color={highlight ? "custom.custo" : "text.primary"}>
        {value}
      </Typography>
    </Stack>
  );
}

export function ResumoFichaSidebar({
  perKg,
  costReal,
  perPortion,
  total,
  lastCalculatedAt
}: ResumoFichaSidebarProps) {
  return (
    <Card sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography variant="h4">Resumo de custos</Typography>
          <Stack
            direction={{ xs: "row", lg: "column" }}
            flexWrap="wrap"
            useFlexGap
            spacing={2.5}
          >
            <SummaryPair label="Custo por kg" value={formatCurrency(perKg)} />
            <SummaryPair label="Custo real" value={formatCurrency(costReal)} />
            <SummaryPair label="Custo por porcao" value={formatCurrency(perPortion)} />
            <SummaryPair label="Ultimo calculo" value={formatRelativeDate(lastCalculatedAt)} />
            <SummaryPair label="Total atual" value={formatCurrency(total)} highlight />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
