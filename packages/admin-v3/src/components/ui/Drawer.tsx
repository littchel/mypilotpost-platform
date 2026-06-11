"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
  footer?: ReactNode;
  dirty?: boolean;
}

const WIDTHS = {
  sm:   "w-[380px]",
  md:   "w-[480px]",
  lg:   "w-[580px]",
  xl:   "w-[700px]",
  "2xl":"w-[860px]",
};

export function Drawer({ open, onClose, title, subtitle, children, width = "md", footer, dirty }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, dirty]);

  if (!open) return null;

  const handleClose = () => {
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClose} />
      <div className={cn(
        "relative ml-auto flex flex-col bg-os-surface border-l border-os-border shadow-os-xl animate-slide-right h-full overflow-hidden",
        WIDTHS[width]
      )}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-os-border shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            {title && <h2 className="text-base font-semibold text-ink-1 truncate">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-3 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={handleClose} className="shrink-0 text-ink-3 hover:text-ink-1 transition-colors p-1 rounded hover:bg-os-raised">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-5 py-3.5 border-t border-os-border bg-os-raised/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
