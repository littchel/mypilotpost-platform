import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Input({ label, error, hint, required, icon, iconRight, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="os-label">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">{icon}</span>}
        <input
          id={inputId}
          className={cn(
            "os-input",
            icon && "pl-8",
            iconRight && "pr-8",
            error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {iconRight && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">{iconRight}</span>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Textarea({ label, error, hint, required, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="os-label">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn("os-input resize-y min-h-[80px]", error && "border-red-500/60", className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
}

export function Select({ label, error, hint, required, options, onChange, className, id, children, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="os-label">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={cn("os-input appearance-none", error && "border-red-500/60", className)}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...props}
      >
        {options
          ? options.map(o => <option key={o.value} value={o.value} className="bg-os-raised">{o.label}</option>)
          : children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, label, disabled, size = "md" }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          size === "sm" ? "h-4 w-7" : "h-5 w-9",
          checked ? "bg-brand-500" : "bg-os-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 rounded-full bg-white transition-transform shadow-os-sm",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            checked ? (size === "sm" ? "translate-x-3.5" : "translate-x-[18px]") : "translate-x-0.5"
          )}
        />
      </button>
      {label && <span className="text-sm text-ink-1">{label}</span>}
    </label>
  );
}
