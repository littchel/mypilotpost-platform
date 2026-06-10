import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; label?: string };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, sub, trend, icon, className }: StatCardProps) {
  const trendPositive = trend && trend.value >= 0;
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
        {trend && (
          <span className={cn("text-xs font-medium", trendPositive ? "text-green-600" : "text-red-600")}>
            {trendPositive ? "+" : ""}{trend.value}%{trend.label ? ` ${trend.label}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
