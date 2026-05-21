/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, expect, it, vi } from "vitest";

const importacao_status = {
  pendente: "pendente",
  processando: "processando",
  concluida: "concluida",
  concluida_com_conflitos: "concluida_com_conflitos",
  falha: "falha",
  cancelada: "cancelada"
} as const;

vi.mock("@/generated/prisma/client", () => ({ importacao_status }));

const {
  isImportExecutionActive,
  isImportExecutionCancellable,
  assertCanCreateImportExecution,
  getNextImportExecutionStatus,
  buildFriendlyImportSuccessSummary,
  buildFriendlyImportFailureSummary,
  ActiveImportExecutionError
} = await import("@/modules/import/domain/import-execution");

type Status = typeof importacao_status[keyof typeof importacao_status];

describe("isImportExecutionActive", () => {
  it("pendente é ativo", () => expect(isImportExecutionActive(importacao_status.pendente as any)).toBe(true));
  it("processando é ativo", () => expect(isImportExecutionActive(importacao_status.processando as any)).toBe(true));
  it("concluida não é ativo", () => expect(isImportExecutionActive(importacao_status.concluida as any)).toBe(false));
  it("falha não é ativo", () => expect(isImportExecutionActive(importacao_status.falha as any)).toBe(false));
  it("cancelada não é ativo", () => expect(isImportExecutionActive(importacao_status.cancelada as any)).toBe(false));
});

describe("isImportExecutionCancellable", () => {
  it("pendente pode ser cancelado", () => expect(isImportExecutionCancellable(importacao_status.pendente as any)).toBe(true));
  it("processando pode ser cancelado", () => expect(isImportExecutionCancellable(importacao_status.processando as any)).toBe(true));
  it("concluida não pode ser cancelado", () => expect(isImportExecutionCancellable(importacao_status.concluida as any)).toBe(false));
});

describe("assertCanCreateImportExecution", () => {
  it("não lança quando não há execução ativa", () => {
    expect(() => assertCanCreateImportExecution(null)).not.toThrow();
  });

  it("lança ActiveImportExecutionError quando há execução pendente", () => {
    expect(() =>
      assertCanCreateImportExecution({ id: "exec-1", status: importacao_status.pendente as any, origemArquivo: "planilha.xlsx" })
    ).toThrow(ActiveImportExecutionError);
  });

  it("lança ActiveImportExecutionError quando há execução processando", () => {
    expect(() =>
      assertCanCreateImportExecution({ id: "exec-1", status: importacao_status.processando as any, origemArquivo: "planilha.xlsx" })
    ).toThrow(ActiveImportExecutionError);
  });

  it("não lança quando execução está concluída", () => {
    expect(() =>
      assertCanCreateImportExecution({ id: "exec-1", status: importacao_status.concluida as any, origemArquivo: "planilha.xlsx" })
    ).not.toThrow();
  });
});

describe("getNextImportExecutionStatus — máquina de estados", () => {
  it("pendente + start_processing → processando", () => {
    expect(getNextImportExecutionStatus(importacao_status.pendente as any, "start_processing")).toBe(importacao_status.processando);
  });

  it("processando + complete → concluida", () => {
    expect(getNextImportExecutionStatus(importacao_status.processando as any, "complete")).toBe(importacao_status.concluida);
  });

  it("processando + complete_with_conflicts → concluida_com_conflitos", () => {
    expect(getNextImportExecutionStatus(importacao_status.processando as any, "complete_with_conflicts")).toBe(importacao_status.concluida_com_conflitos);
  });

  it("processando + fail → falha", () => {
    expect(getNextImportExecutionStatus(importacao_status.processando as any, "fail")).toBe(importacao_status.falha);
  });

  it("pendente + cancel → cancelada", () => {
    expect(getNextImportExecutionStatus(importacao_status.pendente as any, "cancel")).toBe(importacao_status.cancelada);
  });

  it("processando + cancel → cancelada", () => {
    expect(getNextImportExecutionStatus(importacao_status.processando as any, "cancel")).toBe(importacao_status.cancelada);
  });

  it("transição inválida lança erro", () => {
    expect(() =>
      getNextImportExecutionStatus(importacao_status.concluida as any, "start_processing")
    ).toThrow();
  });

  it("não pode cancelar após concluída", () => {
    expect(() =>
      getNextImportExecutionStatus(importacao_status.concluida as any, "cancel")
    ).toThrow();
  });
});

describe("buildFriendlyImportSuccessSummary", () => {
  it("sem conflitos: headline simples", () => {
    const summary = buildFriendlyImportSuccessSummary({
      arquivo: "planilha.xlsx",
      itemsProcessados: 50,
      fichasProcessadas: 10,
      conflitos: 0
    });
    expect(summary.headline).toMatch(/concluida/i);
    expect(summary.nextAction).toBeNull();
  });

  it("com conflitos: indica pendências e link", () => {
    const summary = buildFriendlyImportSuccessSummary({
      arquivo: "planilha.xlsx",
      itemsProcessados: 50,
      fichasProcessadas: 10,
      conflitos: 3
    });
    expect(summary.headline).toMatch(/pendencias/i);
    expect(summary.nextAction?.href).toBe("/importacao/pendencias");
    expect(summary.impact).toContain("3");
  });

  it("inclui contagem de itens e fichas no impact", () => {
    const summary = buildFriendlyImportSuccessSummary({
      arquivo: "planilha.xlsx",
      itemsProcessados: 42,
      fichasProcessadas: 7,
      conflitos: 0
    });
    expect(summary.impact).toContain("42");
    expect(summary.impact).toContain("7");
  });
});

describe("buildFriendlyImportFailureSummary", () => {
  it("parser_python: mensagem específica", () => {
    const summary = buildFriendlyImportFailureSummary({ arquivo: "a.xlsx", failureCode: "parser_python" });
    expect(summary.headline).toMatch(/ler o arquivo/i);
    expect(summary.technicalDetails?.code).toBe("parser_python");
  });

  it("prisma_load: mensagem específica", () => {
    const summary = buildFriendlyImportFailureSummary({ arquivo: "a.xlsx", failureCode: "prisma_load" });
    expect(summary.headline).toMatch(/carga nao foi aplicada/i);
  });

  it("storage: mensagem específica", () => {
    const summary = buildFriendlyImportFailureSummary({ arquivo: "a.xlsx", failureCode: "storage" });
    expect(summary.headline).toMatch(/arquivos da importacao/i);
  });

  it("unknown: mensagem genérica", () => {
    const summary = buildFriendlyImportFailureSummary({ arquivo: "a.xlsx", failureCode: "unknown" });
    expect(summary.technicalDetails?.code).toBe("unknown");
  });

  it("inclui technicalMessage quando fornecido", () => {
    const summary = buildFriendlyImportFailureSummary({
      arquivo: "a.xlsx",
      failureCode: "unknown",
      technicalMessage: "Connection refused"
    });
    expect(summary.technicalDetails?.message).toBe("Connection refused");
  });
});
