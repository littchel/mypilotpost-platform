"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Action {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  divider?: boolean;
}

interface ActionMenuProps {
  actions: Action[];
  trigger?: ReactNode;
  align?: "left" | "right";
}

export function ActionMenu({ actions, trigger, align = "right" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="text-ink-3 hover:text-ink-2 p-1 rounded hover:bg-os-raised transition-colors"
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div className={cn(
          "absolute z-30 mt-1 min-w-[160px] bg-os-raised border border-os-border rounded-lg shadow-os-lg py-1 animate-fade-in",
          align === "right" ? "right-0" : "left-0"
        )}>
          {actions.map((a, i) => (
            <div key={i}>
              {a.divider && <div className="my-1 border-t border-os-border" />}
              <button
                disabled={a.disabled}
                onClick={e => { e.stopPropagation(); a.onClick(); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left",
                  a.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-os-surface cursor-pointer",
                  a.variant === "danger" ? "text-red-400 hover:bg-red-500/10" : "text-ink-1"
                )}
              >
                {a.icon && <span className="text-current w-4 h-4 flex items-center justify-center">{a.icon}</span>}
                {a.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
