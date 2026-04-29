"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";

interface StickyActionBarProps {
  children: ReactNode;
}

export function StickyActionBar({ children }: StickyActionBarProps) {
  return (
    <Box
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        px: 2,
        pb: 2
      }}
    >
      <Paper elevation={1} sx={{ borderRadius: 2.5, p: 2 }}>
        <Stack direction="row" spacing={1.5}>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
