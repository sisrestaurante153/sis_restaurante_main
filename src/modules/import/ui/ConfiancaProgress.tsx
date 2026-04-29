import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

interface ConfiancaProgressProps {
  value: string;
}

function normalizeToPercent(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed <= 1 ? parsed * 100 : parsed;
}

export function ConfiancaProgress({ value }: ConfiancaProgressProps) {
  const percent = Math.max(0, Math.min(100, normalizeToPercent(value)));
  const color = percent > 80 ? "success" : percent >= 50 ? "warning" : "error";

  return (
    <Box sx={{ minWidth: 110 }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={color}
        sx={{ height: 8, borderRadius: 999 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {Math.round(percent)}%
      </Typography>
    </Box>
  );
}
