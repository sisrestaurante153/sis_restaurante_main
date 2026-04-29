import { describe, expect, it } from "vitest";
import {
  normalizeAliasValue,
  parseResolveConflictFormData
} from "@/modules/import/domain/reconciliation";

describe("reconciliation helpers", () => {
  it("normalizes aliases the same way as import staging", () => {
    expect(normalizeAliasValue("  Batata Lavada  Graúda  ")).toBe(
      "batata lavada grauda"
    );
  });

  it("rejects empty alias values", () => {
    expect(() => normalizeAliasValue("   ")).toThrow(
      "Alias nao pode ficar vazio."
    );
  });

  it("parses a valid manual conflict resolution payload", () => {
    const formData = new FormData();
    formData.set("conflictId", "conf-123");
    formData.set("targetItemId", "item-456");
    formData.set("executionId", "exec-789");
    formData.set("alias", "Tomate Italiano");
    formData.set("applyToExecutionName", "on");

    const result = parseResolveConflictFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conflictId).toBe("conf-123");
      expect(result.data.targetItemId).toBe("item-456");
      expect(result.data.executionId).toBe("exec-789");
      expect(result.data.alias).toBe("Tomate Italiano");
      expect(result.data.applyToExecutionName).toBe(true);
    }
  });

  it("rejects manual conflict resolutions without target item", () => {
    const formData = new FormData();
    formData.set("conflictId", "conf-123");
    formData.set("targetItemId", "");
    formData.set("alias", "Tomate Italiano");

    const result = parseResolveConflictFormData(formData);

    expect(result.success).toBe(false);
  });
});
