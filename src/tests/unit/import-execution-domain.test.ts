import { describe, expect, it } from "vitest";
import { ImportacaoStatus } from "@/generated/prisma/client";
import {
  InvalidImportExecutionTransitionError,
  assertCanCreateImportExecution,
  buildFriendlyImportFailureSummary,
  buildFriendlyImportSuccessSummary,
  getNextImportExecutionStatus,
  isImportExecutionActive
} from "@/modules/import/domain/import-execution";

describe("import execution domain", () => {
  it("marks only pending and processing executions as active", () => {
    expect(isImportExecutionActive(ImportacaoStatus.pendente)).toBe(true);
    expect(isImportExecutionActive(ImportacaoStatus.processando)).toBe(true);
    expect(isImportExecutionActive(ImportacaoStatus.concluida)).toBe(false);
    expect(isImportExecutionActive(ImportacaoStatus.concluida_com_conflitos)).toBe(false);
    expect(isImportExecutionActive(ImportacaoStatus.falha)).toBe(false);
  });

  it("prevents a new execution when another one is already active", () => {
    expect(
      () =>
        assertCanCreateImportExecution({
          id: "execucao-ativa",
          status: ImportacaoStatus.processando,
          origemArquivo: "legado.xlsx"
        })
    ).toThrow(/execucao-ativa/i);
  });

  it("allows the expected status transitions", () => {
    expect(getNextImportExecutionStatus(ImportacaoStatus.pendente, "start_processing")).toBe(
      ImportacaoStatus.processando
    );
    expect(getNextImportExecutionStatus(ImportacaoStatus.processando, "complete")).toBe(
      ImportacaoStatus.concluida
    );
    expect(getNextImportExecutionStatus(ImportacaoStatus.processando, "complete_with_conflicts")).toBe(
      ImportacaoStatus.concluida_com_conflitos
    );
    expect(getNextImportExecutionStatus(ImportacaoStatus.processando, "fail")).toBe(
      ImportacaoStatus.falha
    );
  });

  it("rejects invalid status transitions", () => {
    expect(() => getNextImportExecutionStatus(ImportacaoStatus.concluida, "start_processing")).toThrow(
      InvalidImportExecutionTransitionError
    );
    expect(() => getNextImportExecutionStatus(ImportacaoStatus.pendente, "complete")).toThrow(
      InvalidImportExecutionTransitionError
    );
  });

  it("builds a friendly success summary with conflicts CTA", () => {
    const summary = buildFriendlyImportSuccessSummary({
      arquivo: "fichas.xlsx",
      itemsProcessados: 175,
      fichasProcessadas: 149,
      conflitos: 12
    });

    expect(summary.whatHappened).toMatch(/importacao foi concluida/i);
    expect(summary.impact).toMatch(/12 pendencias/i);
    expect(summary.whatToDoNow).toMatch(/pendencias/i);
    expect(summary.nextAction?.href).toBe("/importacao/pendencias");
  });

  it("builds a friendly parser failure summary without exposing raw internals", () => {
    const summary = buildFriendlyImportFailureSummary({
      arquivo: "fichas.xlsx",
      failureCode: "parser_python",
      technicalMessage: "Traceback: openpyxl failed"
    });

    expect(summary.whatHappened).toMatch(/nao conseguiu ler o arquivo/i);
    expect(summary.impact).toMatch(/nenhum dado novo foi aplicado/i);
    expect(summary.whatToDoNow).toMatch(/revise o arquivo/i);
    expect(summary.technicalDetails?.message).toBe("Traceback: openpyxl failed");
  });
});
