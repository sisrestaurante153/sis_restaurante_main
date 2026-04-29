import { render, screen } from "@testing-library/react";
import { createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";
import {
  DataGridCenteredCell,
  DataGridListingConfig,
  DataGridListingSx,
  DataGridNumericCell,
  DataGridStackedCell
} from "@/components/ui/data-grid-pattern";

describe("data grid pattern", () => {
  it("provides the shared listing geometry and stacked cell contract", () => {
    const theme = createTheme();
    const listingSx =
      typeof DataGridListingSx === "function" ? DataGridListingSx(theme) : DataGridListingSx;

    expect(DataGridListingConfig).toMatchObject({
      autoHeight: true,
      columnHeaderHeight: 56,
      density: "compact",
      disableRowSelectionOnClick: true,
      pageSizeOptions: [10, 25, 50]
    });

    expect(DataGridListingConfig.getRowHeight?.()).toBe(42);

    expect(listingSx).toMatchObject({
      border: "none",
      "& .MuiDataGrid-cell": {
        alignItems: "stretch"
      },
      "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: "-2px"
      }
    });

    render(
      <>
        <DataGridStackedCell
          primary="Arroz integral"
          secondary="Texto secundario muito longo que precisa cortar sem expandir a altura da linha"
        />
        <DataGridCenteredCell>
          <span>Ativa</span>
        </DataGridCenteredCell>
        <DataGridNumericCell>R$ 5,30</DataGridNumericCell>
      </>
    );

    const primary = screen.getByText("Arroz integral");
    const secondary = screen.getByText(
      "Texto secundario muito longo que precisa cortar sem expandir a altura da linha"
    );
    const centered = screen.getByText("Ativa");
    const numeric = screen.getByText("R$ 5,30");

    expect(primary).toBeInTheDocument();
    expect(secondary).toBeInTheDocument();
    expect(secondary).toHaveStyle({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    });
    expect(primary.parentElement).toHaveStyle({
      overflow: "hidden",
      minHeight: "42px",
      height: "100%",
      justifyContent: "flex-start"
    });
    expect(centered.parentElement).toHaveStyle({
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      height: "100%"
    });
    expect(numeric.parentElement).toHaveStyle({
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "flex-start",
      height: "100%"
    });
    expect(numeric).toHaveStyle({
      textAlign: "right",
      fontWeight: "600"
    });
  });
});
