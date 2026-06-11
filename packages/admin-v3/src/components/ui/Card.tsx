import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  raised?: boolean;
}

const PAD = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

export function Card({ padding = "md", raised = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn(raised ? "os-card-raised" : "os-card", PAD[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-ink-1", className)} {...props}>{children}</h3>;
}

export function CardSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="border-t border-os-border pt-3 mt-3">
      {label && <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3 mb-2">{label}</p>}
      {children}
    </div>
  );
}
