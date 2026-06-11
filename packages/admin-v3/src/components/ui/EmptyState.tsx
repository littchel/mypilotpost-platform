import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      {icon && (
        <div className="mb-4 rounded-full bg-os-raised border border-os-border p-4 text-ink-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {description && <p className="text-xs text-ink-3 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="os-card p-4 space-y-3">
            <div className="h-2.5 w-16 bg-os-raised rounded" />
            <div className="h-7 w-24 bg-os-raised rounded" />
          </div>
        ))}
      </div>
      <div className="os-card p-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-os-border/50">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-3.5 bg-os-raised rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
