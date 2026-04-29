import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuditPage from "@/app/(app)/auditoria/page";

vi.mock("@/modules/audit/server/audit-repository", () => ({
  getAuditRepository: () => ({
    listRecentActivity: async () =>
      Array.from({ length: 11 }, (_, index) => ({
        id: `audit-${index + 1}`,
        entity: "ficha_tecnica",
        entityLabel: index === 0 ? 'Ficha "Prato X"' : `Ficha "Prato ${index + 1}"`,
        action: "ficha.updated",
        userName: "Admin Bootstrap",
        createdAt: "2026-03-20T14:32:00.000Z",
        beforeSummary:
          index === 0
            ? '{"costs":{"perKg":"14.2857"},"components":[{"itemName":"Tomate E2E","quantity":"300.0000"}]}'
            : `R$ ${(index + 1).toFixed(2)}`,
        afterSummary:
          index === 0
            ? '{"costs":{"perKg":"14.8257"},"components":[{"itemName":"Tomate E2E","quantity":"301.0000"}]}'
            : `R$ ${(index + 1.1).toFixed(2)}`,
        beforeJson:
          index === 0
            ? {
                costs: { perKg: "14.2857" },
                components: [{ itemName: "Tomate E2E", quantity: "300.0000" }]
              }
            : null,
        afterJson:
          index === 0
            ? {
                costs: { perKg: "14.8257" },
                components: [{ itemName: "Tomate E2E", quantity: "301.0000" }]
              }
            : null
      }))
  })
}));

describe("AuditPage", () => {
  it("renders filters and timeline entries for operational history", async () => {
    render(await AuditPage());

    expect(screen.getByRole("heading", { name: /^auditoria$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por entidade/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/data inicial/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/data final/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ficha "prato x" atualizada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/por admin bootstrap/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Antes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Depois").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Custos / Custo por kg").length).toBeGreaterThan(0);
    expect(screen.getByText("14.2857")).toBeInTheDocument();
    expect(screen.getByText("14.8257")).toBeInTheDocument();
    expect(screen.getAllByText("Componentes").length).toBeGreaterThan(0);
    expect(screen.getByText(/Tomate E2E • Quantidade: 300.0000/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomate E2E • Quantidade: 301.0000/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 2.00/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 2.10/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /carregar mais/i })).toBeInTheDocument();
  });
});
