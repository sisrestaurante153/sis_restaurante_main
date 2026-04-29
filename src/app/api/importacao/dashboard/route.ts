import { requirePermission } from "@/modules/access/server/authorization";
import { buildImportDashboardSnapshot } from "@/modules/import/server/import-execution-presenter";
import { getImportRepository } from "@/modules/import/server/import-repository";

export async function GET() {
  await requirePermission("import.run");

  const repository = getImportRepository();
  const [activeExecution, history] = await Promise.all([
    repository.getActiveImportExecution(),
    repository.listImportExecutions({ limit: 20 })
  ]);

  return Response.json(
    buildImportDashboardSnapshot({
      activeExecution,
      history
    })
  );
}
