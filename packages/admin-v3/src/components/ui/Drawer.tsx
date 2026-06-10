"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTHS = { sm: "w-96", md: "w-[32rem]", lg: "w-[44rem]" };

export function Drawer({ open, onClose, title, children, width = "md" }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className={cn(
        "relative ml-auto flex h-full flex-col bg-white shadow-2xl",
        WIDTHS[width]
      )}>
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-6">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}
