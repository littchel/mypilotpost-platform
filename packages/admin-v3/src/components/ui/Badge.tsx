import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  default:  "bg-slate-100 text-slate-700",
  success:  "bg-green-100 text-green-700",
  warning:  "bg-amber-100 text-amber-700",
  danger:   "bg-red-100 text-red-700",
  info:     "bg-blue-100 text-blue-700",
  neutral:  "bg-slate-100 text-slate-500",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", VARIANTS[variant], className)}>
      {children}
    </span>
  );
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "active":
    case "approved":
    case "resolved":
    case "healthy":     return "success";
    case "trial":
    case "pending":
    case "in_progress":
    case "warning":     return "warning";
    case "past_due":
    case "rejected":
    case "critical":
    case "error":
    case "at_risk":     return "danger";
    case "cancelled":
    case "archived":
    case "closed":      return "neutral";
    default:            return "default";
  }
}
