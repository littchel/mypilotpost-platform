"use client";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import type { WorkspaceId } from "@/lib/roles";

interface WorkspaceLayoutProps {
  workspace?: WorkspaceId;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  updatedAt?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  noPadding?: boolean;
}

export function WorkspaceLayout({
  workspace, title, subtitle, actions, children,
  updatedAt, onRefresh, refreshing, noPadding = false,
}: WorkspaceLayoutProps) {
  return (
    <RoleGuard workspace={workspace}>
      <div className="flex h-screen bg-os-bg overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            title={title}
            subtitle={subtitle}
            actions={actions}
            updatedAt={updatedAt}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
          <main className={`flex-1 overflow-y-auto ${noPadding ? "" : "p-5"}`}>
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
