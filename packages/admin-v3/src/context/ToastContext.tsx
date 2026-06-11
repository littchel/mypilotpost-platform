"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastCtx {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-400" />,
  error:   <XCircle    className="h-4 w-4 text-red-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  info:    <Info       className="h-4 w-4 text-blue-400" />,
};

const BORDERS: Record<ToastType, string> = {
  success: "border-green-500/30",
  error:   "border-red-500/30",
  warning: "border-yellow-500/30",
  info:    "border-blue-500/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) =>
    setToasts(p => p.filter(t => t.id !== id)), []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const success = useCallback((t: string, m?: string) => toast("success", t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast("error",   t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast("warning", t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast("info",    t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-os-raised px-4 py-3 shadow-os-lg animate-slide-up min-w-[280px] max-w-[380px]",
              BORDERS[t.type]
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-1">{t.title}</p>
              {t.message && <p className="text-xs text-ink-2 mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-ink-3 hover:text-ink-2 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
