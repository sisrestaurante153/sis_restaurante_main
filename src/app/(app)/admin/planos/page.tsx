import { requirePermission } from "@/modules/access/server/authorization";
import { PlanManager } from "@/modules/billing/ui/plan-manager";

export default async function AdminPlanosPage() {
  await requirePermission("platform.manage");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie os planos, preços e limites da plataforma.</p>
      </header>
      
      <PlanManager />
    </div>
  );
}
