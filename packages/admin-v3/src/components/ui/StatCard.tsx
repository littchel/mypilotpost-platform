import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  accent?: "success" | "warning" | "danger" | "info" | "brand";
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const ACCENT: Record<string, string> = {
  success: "border-green-500/30",
  warning: "border-yellow-500/30",
  danger:  "border-red-500/30",
  info:    "border-blue-500/30",
  brand:   "border-brand-500/30",
};

export function StatCard({ label, value, sub, delta, deltaLabel, icon, accent, loading, onClick, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "os-card p-4 flex flex-col gap-1.5",
        accent && ACCENT[accent],
        onClick && "cursor-pointer hover:bg-os-raised transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{label}</p>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-os-raised rounded animate-pulse my-1" />
      ) : (
        <p className="text-2xl font-bold text-ink-1 tabular-nums leading-none">{value ?? "—"}</p>
      )}
      <div className="flex items-center gap-2 min-h-[16px]">
        {sub && <span className="text-xs text-ink-3">{sub}</span>}
        {delta !== undefined && !loading && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium",
            delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-ink-3"
          )}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {delta > 0 ? "+" : ""}{delta}%
            {deltaLabel && <span className="text-ink-3 font-normal ml-1">{deltaLabel}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
