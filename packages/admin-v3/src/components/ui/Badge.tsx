import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const V: Record<BadgeVariant, string> = {
  success: "os-badge-success",
  warning: "os-badge-warning",
  danger:  "os-badge-danger",
  info:    "os-badge-info",
  neutral: "os-badge-neutral",
  brand:   "os-badge-brand",
};

const DOTS: Record<BadgeVariant, string> = {
  success: "bg-green-400",
  warning: "bg-yellow-400",
  danger:  "bg-red-400",
  info:    "bg-blue-400",
  neutral: "bg-ink-3",
  brand:   "bg-brand-400",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span className={cn(V[variant], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[variant])} />}
      {children}
    </span>
  );
}

export function statusBadge(status: string): BadgeVariant {
  const s = (status ?? "").toLowerCase();
  if (["active","published","success","connected","healthy","approved","verified","open","resolved"].includes(s)) return "success";
  if (["trial","pending","review","degraded","warning","in_progress","changes_requested"].includes(s)) return "warning";
  if (["inactive","failed","error","down","rejected","disabled","closed","past_due","at_risk","critical"].includes(s)) return "danger";
  if (["info","running"].includes(s)) return "info";
  if (["draft","archived","expired","cancelled","queued"].includes(s)) return "neutral";
  return "neutral";
}

export function statusVariant(status: string): BadgeVariant {
  return statusBadge(status);
}
