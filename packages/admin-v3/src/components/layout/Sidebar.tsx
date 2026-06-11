"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { getWorkspacesForRole } from "@/lib/roles";
import {
  LayoutDashboard, Users, MessageSquare, CreditCard,
  ShoppingBag, Wrench, FileText, Settings, LogOut, Zap,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  today:      LayoutDashboard,
  customers:  Users,
  support:    MessageSquare,
  billing:    CreditCard,
  commercial: ShoppingBag,
  operations: Wrench,
  content:    FileText,
  config:     Settings,
};

const LABELS: Record<string, string> = {
  today:      "Today",
  customers:  "Customers",
  support:    "Support",
  billing:    "Billing",
  commercial: "Commercial",
  operations: "Platform Ops",
  content:    "Content",
  config:     "Config",
};

export function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useSession();
  const workspaces = session ? getWorkspacesForRole(session.role) : [];

  const isActive = (wsId: string) => {
    const path = wsId === "today" ? "/" : `/${wsId}/`;
    if (path === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(`/${wsId}`);
  };

  return (
    <aside className="flex h-screen w-[200px] shrink-0 flex-col bg-os-surface border-r border-os-border">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-os-border">
        <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-1 truncate">myPilotPost</p>
          <p className="text-2xs text-brand-400 truncate font-medium uppercase tracking-wider">Admin OS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <div className="space-y-0.5">
          {workspaces.map(ws => {
            const Icon = ICONS[ws.id] ?? LayoutDashboard;
            const active = isActive(ws.id);
            return (
              <Link
                key={ws.id}
                href={ws.id === "today" ? "/" : `/${ws.id}/`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-500/15 text-brand-200"
                    : "text-ink-2 hover:text-ink-1 hover:bg-os-raised"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-400" : "text-ink-3")} />
                <span className="truncate">{LABELS[ws.id] ?? ws.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-os-border p-3">
        {session && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-300">{session.email?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-1 truncate">{session.email}</p>
              <p className="text-2xs text-ink-3 capitalize">{session.role?.replace("_", " ")}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs text-ink-3 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
