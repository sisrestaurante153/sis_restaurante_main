import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { DataGridProps } from "@mui/x-data-grid";

type DataGridStackedCellProps = {
  primary: ReactNode;
  secondary?: ReactNode;
};

type DataGridCenteredCellProps = {
  children: ReactNode;
};

type DataGridNumericCellProps = {
  children: ReactNode;
};

export const DataGridListingConfig = {
  autoHeight: true,
  columnHeaderHeight: 56,
  density: "compact",
  disableRowSelectionOnClick: true,
  getRowHeight: () => 42,
  pageSizeOptions: [10, 25, 50]
} satisfies Pick<
  DataGridProps,
  "autoHeight" | "columnHeaderHeight" | "density" | "disableRowSelectionOnClick" | "getRowHeight" | "pageSizeOptions"
>;

export const DataGridListingSx: SxProps<Theme> = (theme) => ({
  border: "none",
  "& .MuiDataGrid-columnHeaders": {
    bgcolor: "action.hover",
    borderBottom: "1px solid",
    borderColor: "divider"
  },
  "& .MuiDataGrid-cell": {
    alignItems: "stretch",
    py: 0.5
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "-2px"
  }
});

export function DataGridStackedCell({ primary, secondary }: DataGridStackedCellProps) {
  return (
    <Stack sx={{ minWidth: 0, height: "100%", minHeight: 42, justifyContent: "flex-start", overflow: "hidden" }}>
      <Typography fontWeight={500} noWrap>
        {primary}
      </Typography>
      {secondary != null ? (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {secondary}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function DataGridCenteredCell({ children }: DataGridCenteredCellProps) {
  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      {children}
    </Box>
  );
}

export function DataGridNumericCell({ children }: DataGridNumericCellProps) {
  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
      <Typography textAlign="right" fontWeight={600}>
        {children}
      </Typography>
    </Box>
  );
}
