import { getAuditRepository } from "@/modules/audit/server/audit-repository";
import { AuditTimeline } from "@/modules/audit/ui/audit-timeline";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AuditPage() {
  const entries = await getAuditRepository().listRecentActivity();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Auditoria" }
        ]}
        title="Auditoria"
        description="Linha do tempo operacional."
      />
      <AuditTimeline entries={entries} />
    </>
  );
}
