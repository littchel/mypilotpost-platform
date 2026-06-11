"use client";
import { useEffect, type ReactNode } from "react";
import { X, AlertTriangle, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const WIDTHS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export function Dialog({ open, onClose, title, description, children, footer, width = "md" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn(
        "relative w-full bg-os-surface border border-os-border rounded-xl shadow-os-xl animate-slide-up",
        WIDTHS[width]
      )}>
        <div className="flex items-start justify-between p-5 border-b border-os-border">
          <div>
            <h2 className="text-base font-semibold text-ink-1">{title}</h2>
            {description && <p className="text-sm text-ink-2 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-1 transition-colors ml-3 mt-0.5 p-1 rounded hover:bg-os-raised">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="p-5">{children}</div>}
        {footer && <div className="px-5 pb-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  type?: "danger" | "info";
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = "Confirm", confirmVariant = "primary", loading, type = "info"
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {type === "danger" && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">This action cannot be undone.</p>
        </div>
      )}
    </Dialog>
  );
}

interface InputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function InputDialog({ open, onClose, onConfirm, title, description, placeholder, confirmLabel = "Save", loading }: InputDialogProps) {
  let value = "";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => onConfirm(value)} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <input
        autoFocus
        className="os-input w-full"
        placeholder={placeholder}
        onChange={e => { value = e.target.value; }}
        onKeyDown={e => { if (e.key === "Enter") onConfirm(value); }}
      />
    </Dialog>
  );
}
