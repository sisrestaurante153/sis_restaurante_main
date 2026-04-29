import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportWorkspace } from "@/modules/import/ui/import-workspace";
import type {
  ImportDashboardSnapshot,
  ImportExecutionSnapshot
} from "@/modules/import/server/import-execution-presenter";

function buildExecution(overrides: Partial<ImportExecutionSnapshot> = {}): ImportExecutionSnapshot {
  return {
    id: "exec-1",
    originalFileName: "legado.xlsx",
    originalFilePath: "/tmp/legado.xlsx",
    fileHash: "hash",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSizeBytes: 1024,
    status: "processando",
    currentStage: "normalizacao",
    operationalSummary: null,
    friendlySummary: null,
    technicalDetails: null,
    artifacts: {
      reportPath: "/tmp/report.json"
    },
    requestedByUserId: "user-1",
    requestedByName: "Operador",
    requestedByEmail: "operador@example.com",
    createdAt: "2026-03-23T10:00:00.000Z",
    startedAt: "2026-03-23T10:00:10.000Z",
    finishedAt: null,
    conflictCount: 0,
    ...overrides
  };
}

describe("Import API paths", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_BASE_PATH = "/sisfichas";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    vi.restoreAllMocks();
  });

  it("prefixes artifact downloads and dashboard polling with the configured base path", async () => {
    const execution = buildExecution({
      status: "concluida",
      currentStage: "concluida",
      finishedAt: "2026-03-23T10:01:00.000Z"
    });
    const dashboard: ImportDashboardSnapshot = {
      activeExecution: execution,
      latestResult: execution,
      history: [execution]
    };

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => dashboard
    } as Response);

    render(<ImportWorkspace initialDashboard={dashboard} feedback={null} />);

    expect(screen.getByRole("link", { name: /arquivo original/i })).toHaveAttribute(
      "href",
      "/sisfichas/api/importacao/download?executionId=exec-1&artifact=original"
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(fetchMock).toHaveBeenCalledWith("/sisfichas/api/importacao/dashboard", {
      cache: "no-store"
    });
  });
});
