import { requirePermission } from "@/modules/access/server/authorization";
import { getAuditRepository } from "@/modules/audit/server/audit-repository";
import { AuditTimeline } from "@/modules/audit/ui/audit-timeline";
import { PageHeader } from "@/modules/platform/ui/page-header";

export default async function HistoricoPage() {
  const actor = await requirePermission("ficha.read");
  const isSuperAdmin = actor.roleCodes.includes("super-admin");
  const entries = await getAuditRepository().listHistorico({
    restaurantId: actor.restaurantId,
    roleCodes: actor.roleCodes
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Histórico" }
        ]}
        title="Histórico"
        description={
          isSuperAdmin
            ? "Todas as movimentações de TODOS os restaurantes — criação, edição e status de itens e fichas técnicas."
            : "Todas as movimentações do seu restaurante — criação, edição e status de itens e fichas técnicas."
        }
        size="compact"
      />
      <AuditTimeline entries={entries} />
    </>
  );
}
