import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  external?: boolean;
};

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
};

import { createContext, useContext } from "react";

export const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}

export function NavLinkItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="h-4.5 w-4.5" style={{ height: "1.125rem", width: "1.125rem" }} />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {item.badge}
        </span>
      )}
    </>
  );
  const baseCls =
    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all";
  const stateCls = active
    ? "bg-primary/10 text-primary font-medium shadow-sm"
    : "text-muted-foreground hover:bg-muted hover:text-foreground";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={`${baseCls} ${stateCls}`}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }
  return (
    <Link
      href={item.href}
      className={`${baseCls} ${stateCls}`}
      onClick={onNavigate}
      prefetch
    >
      {content}
    </Link>
  );
}
