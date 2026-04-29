import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FichaFlatGrid, GRID_TEMPLATE } from "@/modules/engineering/ui/FichaFlatGrid";
import type {
  ComponentEditorRow,
  ComponentOption,
  StageTypeOption
} from "@/modules/engineering/ui/components-editor.types";

// Minimal stubs consistent with ComponentEditorRow / ComponentOption / StageTypeOption
const itemOptions: ComponentOption[] = [
  {
    id: "item-1",
    name: "Arroz branco",
    type: "insumo",
    operationalCategory: "Graos",
    usageUnit: "kg",
    currentCost: "2.5800"
  },
  {
    id: "item-2",
    name: "Feijoada",
    type: "insumo",
    operationalCategory: "Pratos",
    usageUnit: "kg",
    currentCost: "24.2800"
  }
];

const stageTypeOptions: StageTypeOption[] = [
  { id: "stg-limpeza", code: "limpeza_pre_preparo", label: "Limpeza / Pre-Preparo" },
  { id: "stg-coccao", code: "coccao_preparo", label: "Coccao / Preparo" },
  { id: "stg-montagem", code: "montagem", label: "Montagem" }
];

const baseRow: ComponentEditorRow = {
  itemId: "item-1",
  componentType: "ingrediente",
  quantityUsed: "0.1500",
  usageUnit: "kg",
  levelLabel: "N1",
  notes: ""
};

const coccaoFinalRow: ComponentEditorRow = {
  itemId: "item-2",
  componentType: "ingrediente",
  quantityUsed: "1.0000",
  usageUnit: "kg",
  levelLabel: "N1",
  notes: "",
  stageTypeId: "stg-coccao",
  stageTypeCode: "coccao_preparo",
  stageTypeLabel: "Coccao / Preparo",
  outputWeight: "",
  isCoccaoFinal: true
};

function renderGrid(rows: ComponentEditorRow[], hasCoccaoFinal: boolean) {
  return render(
    <FichaFlatGrid
      rows={rows}
      itemOptions={itemOptions}
      stageTypeOptions={stageTypeOptions}
      onUpdateRow={() => {}}
      onRemoveRow={() => {}}
      onReorderRows={() => {}}
      onAddRow={() => {}}
      onAddCoccaoFinal={() => {}}
      hasCoccaoFinal={hasCoccaoFinal}
    />
  );
}

describe("FichaFlatGrid — SPEC-FICHA-FIDELIDADE (HTML tela-ficha-tecnica-v2.html)", () => {
  it("GRID_TEMPLATE bate contrato atual (Quick 20260424: +Cod. 72px, Qtde 110px)", () => {
    // Contrato original bate HTML tela-ficha-tecnica-v2.html (60px em Unidade).
    // 2026-04-20: Unidade passou para 80px por ressalva do cliente.
    // 2026-04-24: nova coluna Cod. 72px entre drag e Item; Qtde bumped 80->110px
    // (zero cortado reportado pelo cliente). Coccao Final agora alinha ao mesmo template.
    expect(GRID_TEMPLATE).toBe("22px 72px 1fr 110px 80px 240px 90px 90px 96px 28px");
    // Sanity check: render nao quebra com o GRID_TEMPLATE atual
    const { container } = renderGrid([baseRow], false);
    expect(container.querySelectorAll('[role="row"]').length).toBeGreaterThanOrEqual(1);
  });

  it("com Coccao Final: row label visivel, botao Adicionar Coccao Final NAO aparece", () => {
    renderGrid([baseRow, coccaoFinalRow], true);
    expect(screen.getByText(/Coccao \/ Preparo Final/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Adicionar Coccao Final/i })
    ).not.toBeInTheDocument();
  });

  it("sem Coccao Final: botao Adicionar visivel, row label ausente", () => {
    renderGrid([baseRow], false);
    expect(screen.queryByText(/Coccao \/ Preparo Final/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Adicionar Coccao Final/i })
    ).toBeInTheDocument();
  });

  it("Quick 20260424 item 5.1: bloco Coccao Final usa o mesmo GRID_TEMPLATE das linhas", () => {
    // CF_GRID_TEMPLATE foi removido — Coccao Final agora alinha pixel-perfect
    // ao GRID_TEMPLATE das linhas regulares (slots Cod/Qtde/Unidade/Custo unit
    // ficam vazios; Etapa+Peso no subgrid central; IC ocupa Custo insumo).
    renderGrid([baseRow, coccaoFinalRow], true);
    expect(screen.getByText(/Coccao \/ Preparo Final/i)).toBeInTheDocument();
  });

  it("Quick fase2 #7: linha com stageCode renderiza Chip compacto (nao TextField select)", () => {
    // Apos a selecao do tipo, o seletor encolhe para um Chip compacto colorido
    // ("LIMPEZA"/"COCCAO") em vez do TextField outlined com label "Tipo de etapa".
    // Bloco Coccao Final continua com seu proprio TextField "Tipo de etapa" readOnly,
    // por isso este teste roda SEM Coccao Final (hasCoccaoFinal=false, sem coccaoFinalRow).
    const limpezaRow: ComponentEditorRow = {
      ...baseRow,
      stageTypeId: "stg-limpeza",
      stageTypeCode: "limpeza_pre_preparo",
      stageTypeLabel: "Limpeza / Pre-Preparo",
      outputWeight: "0.1300"
    };
    renderGrid([limpezaRow], false);
    // Chip uppercase "LIMPEZA" presente
    expect(screen.getByText("LIMPEZA")).toBeInTheDocument();
    // TextField select "Tipo de etapa" NAO aparece nas linhas regulares —
    // o Chip recebe role="button" (nao "combobox" como o TextField select).
    // O elemento que tem accessible name "Tipo de etapa..." deve ser um button (chip),
    // jamais um combobox/textbox de TextField.
    const stageTypeAccessible = screen.queryByLabelText(/Tipo de etapa/i);
    expect(stageTypeAccessible).not.toBeNull();
    expect(stageTypeAccessible!.getAttribute("role")).toBe("button");
    // Campo Peso (label "Peso Limpo" para stage limpeza_pre_preparo) continua presente.
    // (Tooltip da coluna FC/IC tambem reusa "peso limpo" no title; filtra por role textbox.)
    expect(screen.getByRole("textbox", { name: /Peso Limpo/i })).toBeInTheDocument();
  });

  it("Quick fase2 #7: chip do tipo de etapa tem cor por categoria (limpeza azul, coccao ambar)", () => {
    // Cores re-usam tokens hex ja em uso na ficha:
    //   limpeza: #E6F1FB (bg) / #185FA5 (fg)  -> rgb(230, 241, 251)
    //   coccao : #FFFDF5 (bg) / #854F0B (fg)  -> rgb(255, 253, 245)
    // jsdom nao resolve sx -> CSS classes confiavelmente; o chip recebe inline
    // style adicional com backgroundColor para que o teste consiga validar.
    const limpezaRow: ComponentEditorRow = {
      ...baseRow,
      stageTypeId: "stg-limpeza",
      stageTypeCode: "limpeza_pre_preparo",
      stageTypeLabel: "Limpeza / Pre-Preparo"
    };
    const { unmount } = renderGrid([limpezaRow], false);
    const limpezaLabel = screen.getByText("LIMPEZA");
    // Sobe ate o root do MuiChip (que e quem carrega o inline style com backgroundColor).
    const limpezaChip = limpezaLabel.closest(".MuiChip-root") as HTMLElement | null;
    expect(limpezaChip).not.toBeNull();
    expect(limpezaChip!.style.backgroundColor).toBe("rgb(230, 241, 251)");
    unmount();

    const coccaoRow: ComponentEditorRow = {
      ...baseRow,
      stageTypeId: "stg-coccao",
      stageTypeCode: "coccao_preparo",
      stageTypeLabel: "Coccao / Preparo"
    };
    renderGrid([coccaoRow], false);
    const coccaoLabel = screen.getByText("COCCAO");
    const coccaoChip = coccaoLabel.closest(".MuiChip-root") as HTMLElement | null;
    expect(coccaoChip).not.toBeNull();
    expect(coccaoChip!.style.backgroundColor).toBe("rgb(255, 253, 245)");
  });
});
