import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        px: 3,
        py: 6,
        textAlign: "center"
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Box
          sx={(theme) => ({
            display: "grid",
            placeItems: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: theme.palette.action.hover,
            color: "text.secondary"
          })}
        >
          {icon}
        </Box>
        <Box sx={{ maxWidth: 440 }}>
          <Typography variant="h4">{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        </Box>
        {action}
      </Stack>
    </Box>
  );
}
