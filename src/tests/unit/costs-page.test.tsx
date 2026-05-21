import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/access/server/session-cookie", () => ({
  SESSION_COOKIE_NAME: "sis_session",
  requireSession: vi.fn(async () => ({
    userId: "user-test",
    restaurantId: "rest-test",
    email: "test@test.com",
    name: "Test User",
    roleCodes: ["admin"],
    subscriptionStatus: "active",
    trialEndsAt: null
  })),
  getCurrentSession: vi.fn(async () => null),
  createUserSession: vi.fn(async () => undefined),
  clearUserSession: vi.fn(async () => undefined)
}));

import CostsPage from "@/app/(app)/custos/page";

vi.mock("@/modules/engineering/server/engineering-repository", () => ({
  getEngineeringRepository: () => ({
    listCostSummaries: async () => [
      {
        fichaId: "ficha-1",
        itemName: "Prato X",
        status: "ativa",
        direct: "0.5000",
        inherited: "0.3000",
        packaging: "0.1000",
        total: "0.9000",
        perKg: "1.8000",
        perPortion: "0.9000",
        finalOutput: "500g por porcao"
      }
    ]
  })
}));

describe("CostsPage", () => {
  it("renders searchable financial cards with cost breakdown and ficha links", async () => {
    render(await CostsPage());

    expect(screen.getByRole("heading", { name: /^custos$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar ficha/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir ficha prato x/i })).toHaveAttribute("href", "/fichas/ficha-1");
    expect(screen.getByText("Prato X")).toBeInTheDocument();
    expect(screen.getByText(/500g por porcao/i)).toBeInTheDocument();
    expect(screen.getByText(/^Direto$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Herdado$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Embalagem$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Total$/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 0,90/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\/porcao/i)).toBeInTheDocument();
  });
});
