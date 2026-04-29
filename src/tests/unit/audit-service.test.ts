import { beforeEach, describe, expect, it } from "vitest";
import { createAuditService } from "@/modules/audit/server/audit-service";
import { resetDemoStore } from "@/modules/platform/server/demo-data";

describe("audit service", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("records before and after payloads for mutations", async () => {
    const auditService = createAuditService({
      mode: "demo"
    });

    const entry = await auditService.record({
      actorId: "user-admin",
      actorName: "Administrador Bootstrap",
      entity: "item",
      entityId: "item-molho",
      entityLabel: "Molho Base de Tomate",
      action: "item.updated",
      before: {
        total: "24.6000"
      },
      after: {
        total: "25.1000"
      }
    });

    expect(entry.beforeJson).toEqual({ total: "24.6000" });
    expect(entry.afterJson).toEqual({ total: "25.1000" });

    const activity = await auditService.listRecent();
    expect(activity[0]?.id).toBe(entry.id);
    expect(activity[0]?.action).toBe("item.updated");
  });
});
