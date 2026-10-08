import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/server-actions/auth";
import type { ReactNode } from "react";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("STUDENT");
  return (
    <AppShell
      role="STUDENT"
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </AppShell>
  );
}
