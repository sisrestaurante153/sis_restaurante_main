import type { ReactNode } from "react";
import Box from "@mui/material/Box";

interface WorkspaceLayoutProps {
  main: ReactNode;
  aside?: ReactNode;
  mainLabel?: string;
  asideLabel?: string;
  className?: string;
}

export function WorkspaceLayout({
  main,
  aside,
  mainLabel = "conteudo principal",
  asideLabel = "painel contextual",
  className
}: WorkspaceLayoutProps) {
  return (
    <Box className={className}>
      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: aside
            ? {
                xs: "minmax(0, 1fr)",
                xl: "minmax(0, 1.45fr) minmax(280px, 360px)"
              }
            : "minmax(0, 1fr)"
        }}
      >
        <Box role="region" aria-label={mainLabel} sx={{ minWidth: 0 }}>
          {main}
        </Box>
        {aside ? (
          <Box role="complementary" aria-label={asideLabel}>
            {aside}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
