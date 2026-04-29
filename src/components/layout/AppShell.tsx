import type { ReactNode } from "react";
import { AppShellClient } from "@/components/layout/AppShellClient";

interface AppShellProps {
  currentUser: {
    name: string;
    email: string;
    roleCodes: string[];
  };
  children: ReactNode;
  pendingCounts?: Partial<Record<string, number>>;
}

export function AppShell({ currentUser, children, pendingCounts }: AppShellProps) {
  return (
    <AppShellClient currentUser={currentUser} pendingCounts={pendingCounts}>
      {children}
    </AppShellClient>
  );
}
