import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand";
export type ButtonSize    = "xs" | "sm" | "md" | "lg";

const V: Record<ButtonVariant, string> = {
  primary:   "os-btn-primary",
  secondary: "os-btn-secondary",
  ghost:     "os-btn-ghost",
  danger:    "os-btn-danger",
  brand:     "bg-brand-500/15 text-brand-200 border border-brand-500/30 hover:bg-brand-500/25 inline-flex items-center justify-center gap-1.5 rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-3 py-1.5",
};

const S: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-2xs",
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-9 px-4 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({ children, variant = "primary", size = "md", loading, icon, iconRight, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(V[variant], className)}
      style={{ height: size === "xs" ? "24px" : size === "sm" ? "28px" : size === "md" ? "32px" : "36px" }}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
