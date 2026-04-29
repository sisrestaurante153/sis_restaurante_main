import { describe, expect, it } from "vitest";
import {
  buildBackupFilename,
  parseBackupRetentionDays
} from "@/modules/platform/domain/backup-policy";

describe("backup policy", () => {
  it("builds deterministic UTC backup filenames", () => {
    expect(buildBackupFilename(new Date("2026-03-16T12:34:56.000Z"))).toBe(
      "sis-restaurante-20260316T123456Z.dump"
    );
  });

  it("uses fallback retention when input is empty", () => {
    expect(parseBackupRetentionDays(undefined)).toBe(7);
  });

  it("rejects non-positive retention", () => {
    expect(() => parseBackupRetentionDays("0")).toThrow(
      "BACKUP_RETENTION_DAYS deve ser maior que zero."
    );
  });
});
