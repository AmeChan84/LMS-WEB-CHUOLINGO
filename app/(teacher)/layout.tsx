import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/server-actions/auth";
import type { ReactNode } from "react";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("TEACHER");
  return (
    <AppShell
      role="TEACHER"
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </AppShell>
  );
}
