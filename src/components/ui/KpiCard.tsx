import type { ReactNode } from "react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { appTheme } from "@/theme/theme";

type StandardColor = "primary" | "secondary" | "success" | "warning" | "error" | "info";
type SemanticColor = keyof typeof appTheme.palette.custom | StandardColor;

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  color?: SemanticColor;
  helperText?: ReactNode;
}

function resolveColor(color: SemanticColor) {
  const customColors = appTheme.palette.custom;

  if (Object.hasOwn(customColors, color)) {
    return customColors[color as keyof typeof customColors];
  }

  return appTheme.palette[color as StandardColor].main;
}

export function KpiCard({
  label,
  value,
  icon,
  color = "primary",
  helperText
}: KpiCardProps) {
  const accentColor = resolveColor(color);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha(accentColor, 0.12),
                color: accentColor
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="h3">{value}</Typography>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          </Stack>
          {helperText ? (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
