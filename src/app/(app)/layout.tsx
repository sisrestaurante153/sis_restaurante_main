import type { ReactNode } from "react";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { AppShell } from "@/components/layout/AppShell";

type AppLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AppLayout({ children }: AppLayoutProps) {
  const [session, pendingConflicts] = await Promise.all([
    requireSession(),
    getImportRepository().listPendingConflicts()
  ]);

  return (
    <AppShell
      currentUser={{
        name: session.name,
        email: session.email,
        roleCodes: session.roleCodes
      }}
      pendingCounts={{
        "/importacao": pendingConflicts.length
      }}
    >
      {children}
    </AppShell>
  );
}
