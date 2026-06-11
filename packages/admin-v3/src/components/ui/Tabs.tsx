"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  size?: "sm" | "md";
}

export function Tabs({ tabs, active, onChange, variant = "underline", size = "md" }: TabsProps) {
  if (variant === "pills") {
    return (
      <div className="flex items-center gap-1 p-1 bg-os-raised rounded-lg border border-os-border inline-flex">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors",
              size === "sm" ? "text-xs" : "text-sm",
              active === t.id
                ? "bg-os-surface text-ink-1 shadow-os-sm"
                : "text-ink-3 hover:text-ink-2"
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums",
                active === t.id ? "bg-brand-500/20 text-brand-200" : "bg-os-border text-ink-3"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center border-b border-os-border gap-0">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex items-center gap-1.5 px-4 font-medium transition-colors border-b-2 -mb-px",
            size === "sm" ? "text-xs py-2.5" : "text-sm py-3",
            active === t.id
              ? "border-brand-500 text-ink-1"
              : "border-transparent text-ink-3 hover:text-ink-2 hover:border-os-strong"
          )}
        >
          {t.icon}
          {t.label}
          {t.count !== undefined && (
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums",
              active === t.id ? "bg-brand-500/20 text-brand-200" : "bg-os-raised text-ink-3"
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
