"use client";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  updatedAt?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function TopBar({ title, subtitle, actions, updatedAt, onRefresh, refreshing }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-os-border bg-os-surface px-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-ink-1 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-ink-3 truncate">{subtitle}</p>}
        </div>
        {updatedAt && (
          <span className="text-2xs text-ink-4 shrink-0">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-ink-3 hover:text-ink-2 p-1.5 rounded hover:bg-os-raised transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        )}
      </div>
    </header>
  );
}
