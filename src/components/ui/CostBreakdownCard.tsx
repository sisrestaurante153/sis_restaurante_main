import NextLink from "next/link";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import CardActionArea from "@mui/material/CardActionArea";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/StatusChip";

interface BreakdownRow {
  label: string;
  value: string;
}

interface CostBreakdownCardProps {
  title: string;
  total: string;
  rows: BreakdownRow[];
  status?: string;
  outputLabel?: string;
  unitLabel?: string;
  href?: string;
}

export function CostBreakdownCard({
  title,
  total,
  rows,
  status,
  outputLabel,
  unitLabel,
  href
}: CostBreakdownCardProps) {
  const content = (
    <CardContent sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          {status ? <StatusChip status={status} /> : <span />}
          {href ? <LaunchRoundedIcon sx={{ fontSize: 18, color: "text.disabled" }} /> : null}
        </Stack>

        <Typography variant="h4">{title}</Typography>

        {outputLabel ? (
          <Typography variant="caption" color="text.secondary">
            {outputLabel}
          </Typography>
        ) : null}

        <Stack spacing={0.75} sx={{ pt: 0.5 }}>
          {rows.map((row) => (
            <Stack key={`${row.label}-${row.value}`} direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography variant="body2">{row.value}</Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 0.5 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
          <Typography variant="body2" fontWeight={600}>
            Total
          </Typography>
          <Typography variant="h3" sx={{ color: "custom.custo" }}>
            {total}
          </Typography>
        </Stack>

        {unitLabel ? (
          <Typography variant="caption" color="text.secondary">
            {unitLabel}
          </Typography>
        ) : null}
      </Stack>
    </CardContent>
  );

  return (
    <Card
      sx={{
        height: "100%",
        transition: (theme) => theme.transitions.create(["border-color", "transform"], { duration: 180 }),
        "&:hover": href
          ? {
              borderColor: "primary.light",
              transform: "translateY(-2px)"
            }
          : undefined
      }}
    >
      {href ? (
        <NextLink
          href={href as never}
          aria-label={`Abrir ficha ${title}`}
          style={{ display: "block", height: "100%", color: "inherit", textDecoration: "none" }}
        >
          <CardActionArea sx={{ height: "100%" }}>{content}</CardActionArea>
        </NextLink>
      ) : (
        content
      )}
    </Card>
  );
}
