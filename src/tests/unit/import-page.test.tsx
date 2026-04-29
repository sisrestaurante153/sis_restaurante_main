import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImportPage from "@/app/(app)/importacao/page";

vi.mock("@/modules/access/server/authorization", () => ({
  requirePermission: async () => ({
    userId: "user-admin",
    name: "Administrador Bootstrap",
    email: "admin@sis-restaurante.local",
    roleCodes: ["admin"]
  })
}));

vi.mock("@/modules/import/server/import-repository", () => ({
  getImportRepository: () => ({
    getActiveImportExecution: async () => ({
      id: "execucao-ativa",
      originalFileName: "legado-em-processamento.xlsx",
      originalFilePath: "/tmp/legado-em-processamento.xlsx",
      fileHash: "hash-ativa",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSizeBytes: 2048,
      status: "processando",
      currentStage: "parser_python",
      operationalSummary: {
        itemsImported: 12
      },
      friendlySummary: null,
      technicalDetails: {
        worker: "import-worker-1"
      },
      artifacts: {
        originalFilePath: "/tmp/legado-em-processamento.xlsx"
      },
      requestedByUserId: "user-admin",
      requestedByName: "Administrador Bootstrap",
      requestedByEmail: "admin@sis-restaurante.local",
      createdAt: new Date("2026-03-22T20:00:00.000Z"),
      startedAt: new Date("2026-03-22T20:00:05.000Z"),
      finishedAt: null,
      conflictCount: 0
    }),
    listImportExecutions: async () => [
      {
        id: "execucao-1",
        originalFileName: "legado-finalizado.xlsx",
        originalFilePath: "/tmp/legado-finalizado.xlsx",
        fileHash: "hash-final",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSizeBytes: 4096,
        status: "concluida_com_conflitos",
        currentStage: "concluida",
        operationalSummary: {
          itemsImported: 175,
          recipesImported: 149
        },
        friendlySummary: {
          headline: "Importacao concluida com pendencias",
          whatHappened: "A carga foi aplicada.",
          impact: "Existem 3 pendencias em aberto.",
          whatToDoNow: "Abra a reconciliacao manual.",
          nextAction: {
            label: "Abrir pendencias",
            href: "/importacao/pendencias?execucao=execucao-1"
          }
        },
        technicalDetails: {
          reportPath: "/tmp/report.json"
        },
        artifacts: {
          reportPath: "/tmp/report.json",
          originalFilePath: "/tmp/legado-finalizado.xlsx"
        },
        requestedByUserId: "user-admin",
        requestedByName: "Administrador Bootstrap",
        requestedByEmail: "admin@sis-restaurante.local",
        createdAt: new Date("2026-03-22T19:00:00.000Z"),
        startedAt: new Date("2026-03-22T19:00:10.000Z"),
        finishedAt: new Date("2026-03-22T19:02:00.000Z"),
        conflictCount: 3
      }
    ]
  })
}));

describe("ImportPage", () => {
  it("renders the protected import workspace with blocked upload, active execution and history", async () => {
    render(await ImportPage({}));

    expect(screen.getByRole("heading", { name: /area de importacao/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nova importacao/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /execucao ativa/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resultado operacional/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /historico de execucoes/i })).toBeInTheDocument();
    expect(
      screen.getByText(/aguarde a conclusao da execucao ativa antes de enviar outro arquivo/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/parser_python/i)).toBeInTheDocument();
    expect(screen.getByText(/importacao concluida com pendencias/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir pendencias/i })).toHaveAttribute(
      "href",
      "/importacao/pendencias?execucao=execucao-1"
    );
  });
});
