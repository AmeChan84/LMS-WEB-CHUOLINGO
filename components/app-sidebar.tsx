"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  LibraryBig,
  Sparkles,
  FileCheck2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  BookUser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  NavLinkItem,
  NavItem,
  SidebarContext,
} from "@/components/nav";

const TEACHER_NAV: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "My Classes", icon: GraduationCap },
  { href: "/teacher/lessons", label: "Lesson Library", icon: LibraryBig },
  {
    href: "/teacher/ai/generator",
    label: "AI Homework Generator",
    icon: Sparkles,
    badge: "AI",
  },
  { href: "/teacher/assignments", label: "Assignments", icon: FileCheck2 },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/teacher/dashboard" || href === "/student/dashboard")
    return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({
  role,
  user,
  onLogout,
}: {
  role: "TEACHER" | "STUDENT";
  user?: { name: string; email: string };
  onLogout: () => void;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    function handle() {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setOpen(false);
    }
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const nav = React.useMemo(() => {
    if (role === "TEACHER") return TEACHER_NAV;
    return [
      {
        href: "/student/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/student/classes/join",
        label: "Tham gia lớp học",
        icon: BookUser,
      },
      {
        href: "/student/classes",
        label: "Lớp của tôi",
        icon: GraduationCap,
      },
      {
        href: "/student/assignments",
        label: "Bài tập",
        icon: FileCheck2,
      },
      {
        href: "/student/settings",
        label: "Cài đặt",
        icon: Settings,
      },
    ] as NavItem[];
  }, [role]);

  const ctx = React.useMemo(
    () => ({ open, setOpen, isMobile }),
    [open, isMobile]
  );

  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className="flex h-16 items-center justify-between gap-2 px-4 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
            <GraduationCap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="truncate text-sm font-semibold tracking-tight">
              Chuolingo{" "}
              <span className="ai-gradient-text">LMS</span>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {role === "TEACHER" ? "Giáo viên" : "Học sinh"}
        </div>
        {nav.map((item) => (
          <div key={item.href} className={collapsed ? "justify-center flex" : ""}>
            <NavLinkItem
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={() => setOpen(false)}
            />
          </div>
        ))}
      </nav>

      {/* footer user + logout */}
      <div className="border-t border-border/60 p-3 space-y-2">
        <div
          className={cn(
            "rounded-xl border border-border/70 bg-muted/30 p-3",
            collapsed && "justify-center flex"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
              {(user?.name || "U").split(" ").slice(-1)[0].charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {user?.name || "Người dùng"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {user?.email || ""}
                </div>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive",
            collapsed && "justify-center text-destructive"
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4.5 w-4.5" style={{ height: "1.125rem", width: "1.125rem" }} />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  const widthCls = collapsed
    ? "w-[76px]"
    : "w-64";

  return (
    <SidebarContext.Provider value={ctx}>
      {isMobile && (
        <>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-72 !max-w-none p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigation</SheetDescription>
              {SidebarInner}
            </SheetContent>
          </Sheet>
          <div className="sticky top-0 z-30 lg:hidden">
            <MobileHeader
              user={user}
              onOpenSidebar={() => setOpen(true)}
              role={role}
            />
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex sticky top-0 h-screen flex-shrink-0 border-r border-border/60 bg-sidebar transition-[width] duration-200",
          widthCls
        )}
      >
        {SidebarInner}
      </aside>
    </SidebarContext.Provider>
  );
}

function MobileHeader({
  user,
  onOpenSidebar,
  role,
}: {
  user?: { name: string; email: string };
  onOpenSidebar: () => void;
  role: "TEACHER" | "STUDENT";
}) {
  return (
    <div className="flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <GraduationCap className="h-4 w-4" />
        </div>
        <span className="font-semibold">
          Chuolingo{" "}
          <span className="ai-gradient-text">LMS</span>
        </span>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
        {(user?.name || "U").split(" ").slice(-1)[0].charAt(0).toUpperCase()}
      </div>
      <span className="sr-only">{role}</span>
    </div>
  );
}
