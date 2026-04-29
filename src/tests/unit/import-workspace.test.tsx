import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportWorkspace } from "@/modules/import/ui/import-workspace";
import type { ImportDashboardSnapshot } from "@/modules/import/server/import-execution-presenter";

const emptyDashboard: ImportDashboardSnapshot = {
  activeExecution: null,
  latestResult: null,
  history: []
};

describe("ImportWorkspace", () => {
  it("shows the selected workbook name before submitting the import", () => {
    const { container } = render(<ImportWorkspace initialDashboard={emptyDashboard} feedback={null} />);
    const input = container.querySelector('input[name="workbook"]');
    const operationalInput = container.querySelector('input[name="operationalWorkbook"]');

    expect(input).not.toBeNull();
    expect(operationalInput).not.toBeNull();
    expect(screen.queryByText(/arquivo selecionado:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /importacao operacional de itens/i })).toBeInTheDocument();

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(["dummy workbook payload"], "legado.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })]
      }
    });

    expect(screen.getByText(/arquivo selecionado:/i)).toBeInTheDocument();
    expect(screen.getByText("legado.xlsx")).toBeInTheDocument();

    fireEvent.change(operationalInput as HTMLInputElement, {
      target: {
        files: [new File(["nome;tipo"], "itens-operacionais.csv", { type: "text/csv" })]
      }
    });

    expect(screen.getByText("itens-operacionais.csv")).toBeInTheDocument();
  });
});
