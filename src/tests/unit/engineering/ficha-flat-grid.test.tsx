import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@mui/material/Tooltip", () => ({
  default: ({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) => (
    <span data-testid="tooltip" data-title={String(title)}>{children}</span>
  )
}));

vi.mock("@mui/material/Autocomplete", () => ({
  default: ({ value, getOptionLabel, renderInput }: {
    value: { name: string } | null;
    getOptionLabel: (opt: { name: string }) => string;
    renderInput: (params: object) => React.ReactNode;
  }) => (
    <div>
      {renderInput({ inputProps: { value: value ? getOptionLabel(value) : "" } })}
    </div>
  )
}));

vi.mock("@/modules/engineering/ui/ficha-flat-rows", () => ({
  MONTAGEM_CODE: "montagem"
}));

import { FichaFlatGrid } from "@/modules/engineering/ui/FichaFlatGrid";
import type { ComponentEditorRow, ComponentOption, StageTypeOption } from "@/modules/engineering/ui/components-editor.types";

const STAGE_TYPES: StageTypeOption[] = [
  { id: "st-1", code: "montagem", label: "Montagem" },
  { id: "st-2", code: "limpeza_pre_preparo", label: "Limpeza" },
  { id: "st-3", code: "coccao_preparo", label: "Coccao" }
];

const ITEM_OPTIONS: ComponentOption[] = [
  {
    id: "item-arroz",
    code: "INS-001",
    name: "Arroz",
    type: "insumo",
    operationalCategory: "Graos",
    usageUnit: "kg",
    currentCost: "5.20",
    finalOutput: "1.0"
  }
];

function makeRow(overrides: Partial<ComponentEditorRow> = {}): ComponentEditorRow {
  return {
    itemId: "item-arroz",
    componentType: "ingrediente",
    quantityUsed: "1.000",
    usageUnit: "kg",
    stageTypeCode: "montagem",
    stageTypeLabel: "Montagem",
    outputWeight: "",
    notes: "",
    isCoccaoFinal: false,
    ...overrides
  };
}

function renderGrid(
  rows: ComponentEditorRow[],
  onReorderRows?: (from: number, to: number) => void
) {
  return render(
    <FichaFlatGrid
      rows={rows}
      itemOptions={ITEM_OPTIONS}
      stageTypeOptions={STAGE_TYPES}
      onUpdateRow={vi.fn()}
      onRemoveRow={vi.fn()}
      onReorderRows={onReorderRows}
      onAddRow={vi.fn()}
      onAddCoccaoFinal={vi.fn()}
      hasCoccaoFinal={false}
    />
  );
}

describe("FichaFlatGrid — estrutura de cabeçalho", () => {
  it("renderiza os cabeçalhos de coluna esperados", () => {
    renderGrid([]);
    expect(screen.getByRole("columnheader", { name: /cod\./i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /item/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /qtde usada/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /unidade/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /custo unit\./i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /custo insumo/i })).toBeInTheDocument();
  });

  it("exibe mensagem de lista vazia quando não há ingredientes", () => {
    renderGrid([]);
    expect(screen.getByText(/nenhum ingrediente adicionado/i)).toBeInTheDocument();
  });
});

describe("FichaFlatGrid — drag-and-drop restrito ao handle", () => {
  it("a linha (role=row) NÃO tem atributo draggable quando onReorderRows é fornecido", () => {
    const { container } = renderGrid([makeRow()], vi.fn());
    // O role=row é o Box externo; ele não deve ser draggable — apenas o wrapper do handle.
    const rows = container.querySelectorAll("[role='row']");
    // O primeiro role=row é o cabeçalho; o segundo é a linha de dados.
    const dataRow = rows[1] as HTMLElement;
    expect(dataRow.getAttribute("draggable")).toBeNull();
  });

  it("o wrapper do DragHandle tem draggable=true quando onReorderRows é fornecido", () => {
    const { container } = renderGrid([makeRow()], vi.fn());
    const draggables = container.querySelectorAll("[draggable='true']");
    expect(draggables.length).toBeGreaterThanOrEqual(1);
  });

  it("nenhum elemento tem draggable quando onReorderRows não é fornecido", () => {
    const { container } = renderGrid([makeRow()]);
    const draggables = container.querySelectorAll("[draggable='true']");
    expect(draggables.length).toBe(0);
  });
});

describe("FichaFlatGrid — renderização de linha", () => {
  it("exibe o código do item no campo Cod.", () => {
    renderGrid([makeRow()]);
    expect(screen.getByDisplayValue("INS-001")).toBeInTheDocument();
  });

  it("renderiza o botão Adicionar Itens", () => {
    renderGrid([]);
    expect(screen.getByRole("button", { name: /adicionar itens/i })).toBeInTheDocument();
  });
});
