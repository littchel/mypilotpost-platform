"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "@/context/SessionContext";
import { canAccessWorkspace, type WorkspaceId } from "@/lib/roles";

interface RoleGuardProps {
  children: ReactNode;
  workspace?: WorkspaceId;
  fallback?: ReactNode;
}

export function RoleGuard({ children, workspace, fallback }: RoleGuardProps) {
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      window.location.href = "/login/";
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  if (workspace && !canAccessWorkspace(session.role, workspace)) {
    return fallback ?? (
      <div className="flex h-full items-center justify-center text-slate-500">
        You don&apos;t have access to this workspace.
      </div>
    );
  }

  return <>{children}</>;
}
