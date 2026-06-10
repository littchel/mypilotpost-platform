"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import type { WorkspaceId } from "@/lib/roles";

interface WorkspaceLayoutProps {
  children: ReactNode;
  workspace?: WorkspaceId;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function WorkspaceLayout({ children, workspace, title, subtitle, actions }: WorkspaceLayoutProps) {
  return (
    <RoleGuard workspace={workspace}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar title={title} subtitle={subtitle} actions={actions} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
