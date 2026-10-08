"use client";

import { logoutUser } from "@/lib/server-actions/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function AppShell({
  role,
  user,
  children,
}: {
  role: "TEACHER" | "STUDENT";
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [, setBusy] = useState(false);

  function onLogout() {
    setBusy(true);
    startTransition(async () => {
      try {
        const r = await logoutUser();
        if (r.success) {
          toast.success("Đã đăng xuất");
          router.replace("/login");
          router.refresh();
          return;
        }
        toast.error(r.error || "Đăng xuất không thành công");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="flex min-h-screen bg-background/50">
      <AppSidebar role={role} user={user} onLogout={onLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
