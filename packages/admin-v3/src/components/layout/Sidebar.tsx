"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquare, CreditCard,
  Package, Activity, FileText, Settings,
} from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { getWorkspacesForRole, type WorkspaceConfig } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, MessageSquare, CreditCard,
  Package, Activity, FileText, Settings,
};

function NavItem({ workspace, current }: { workspace: WorkspaceConfig; current: boolean }) {
  const Icon = ICON_MAP[workspace.icon] ?? LayoutDashboard;
  return (
    <Link
      href={workspace.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        current
          ? "bg-brand-600 text-white"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{workspace.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const { session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const workspaces = getWorkspacesForRole(session.role);

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-slate-950 border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-slate-800">
        <span className="text-base font-bold text-white tracking-tight">myPilotPost</span>
        <span className="ml-2 rounded bg-brand-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        {workspaces.map((ws) => (
          <NavItem
            key={ws.id}
            workspace={ws}
            current={
              ws.href === "/"
                ? pathname === "/"
                : pathname.startsWith(ws.href)
            }
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white uppercase">
            {session.email[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-300">{session.email}</p>
            <p className="text-[10px] text-slate-500 capitalize">{session.role.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
