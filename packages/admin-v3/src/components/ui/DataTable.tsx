"use client";
import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Settings2, Download, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  hidden?: boolean;
  render?: (row: T, i: number) => ReactNode;
  value?: (row: T) => string | number;
}

export interface BulkAction<T> {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  action: (rows: T[]) => void;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  exportFilename?: string;
  filters?: ReactNode;
}

export function DataTable<T extends object>({
  data,
  columns: initialColumns,
  keyField,
  searchable = true,
  searchPlaceholder = "Search...",
  searchFields,
  bulkActions,
  onRowClick,
  selectedId,
  loading,
  error,
  emptyTitle = "No records",
  emptyMessage = "Nothing to show yet.",
  pageSize = 50,
  toolbar,
  exportFilename = "export",
  filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(initialColumns.filter(c => c.hidden).map(c => c.key))
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const columns = useMemo(() => initialColumns.filter(c => !hiddenCols.has(c.key)), [initialColumns, hiddenCols]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row => {
      const fields = searchFields ?? (Object.keys(row) as (keyof T)[]);
      return fields.some(f => String(row[f] ?? "").toLowerCase().includes(q));
    });
  }, [data, search, searchFields]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = initialColumns.find(c => c.key === sortKey);
    return [...filtered].sort((a, b) => {
      const va = col?.value ? col.value(a) : (a as Record<string, unknown>)[sortKey];
      const vb = col?.value ? col.value(b) : (b as Record<string, unknown>)[sortKey];
      const cmp = String(va ?? "") < String(vb ?? "") ? -1 : String(va ?? "") > String(vb ?? "") ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, initialColumns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const toggleRow = useCallback((id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const allPageSelected = paged.length > 0 && paged.every(r => selected.has(String(r[keyField])));
  const toggleAll = useCallback(() => {
    if (allPageSelected) setSelected(s => { const n = new Set(s); paged.forEach(r => n.delete(String(r[keyField]))); return n; });
    else setSelected(s => { const n = new Set(s); paged.forEach(r => n.add(String(r[keyField]))); return n; });
  }, [allPageSelected, paged, keyField]);

  const exportCSV = useCallback(() => {
    const rows = selected.size > 0 ? sorted.filter(r => selected.has(String(r[keyField]))) : sorted;
    const header = initialColumns.map(c => c.header).join(",");
    const body = rows.map(r =>
      initialColumns.map(c => {
        const v = c.value ? c.value(r) : (r as Record<string, unknown>)[c.key];
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(",")
    ).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportFilename}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [sorted, selected, keyField, initialColumns, exportFilename]);

  const selectedRows = useMemo(() =>
    sorted.filter(r => selected.has(String(r[keyField]))), [sorted, selected, keyField]);

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="os-input pl-8 h-8 text-sm"
            />
          </div>
        )}
        {filters}
        <div className="flex items-center gap-1.5 ml-auto">
          {toolbar}
          {/* Column visibility */}
          <div className="relative">
            <Button variant="secondary" size="sm" icon={<Settings2 className="h-3.5 w-3.5" />}
              onClick={() => setShowColMenu(v => !v)}>Columns</Button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-os-raised border border-os-border rounded-lg shadow-os-lg p-2 min-w-[160px]">
                {initialColumns.map(col => (
                  <button
                    key={col.key}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-ink-1 hover:bg-os-surface rounded transition-colors"
                    onClick={() => setHiddenCols(s => {
                      const n = new Set(s);
                      n.has(col.key) ? n.delete(col.key) : n.add(col.key);
                      return n;
                    })}
                  >
                    <span className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0",
                      !hiddenCols.has(col.key) ? "bg-brand-500 border-brand-500" : "border-os-strong"
                    )}>
                      {!hiddenCols.has(col.key) && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    {col.header}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCSV}>Export</Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 border border-brand-500/30 rounded-lg">
          <span className="text-sm text-brand-200 font-medium">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-ink-3 hover:text-ink-2 ml-1">Clear</button>
          <div className="h-4 w-px bg-os-border mx-1" />
          {bulkActions.map(a => (
            <Button key={a.label} variant={a.variant ?? "secondary"} size="sm" icon={a.icon}
              onClick={() => a.action(selectedRows)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="os-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-os-border bg-os-raised/50">
                {bulkActions && (
                  <th className="os-table-th w-8 pl-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="rounded border-os-border bg-os-raised accent-brand-500 cursor-pointer"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn("os-table-th", col.sortable && "cursor-pointer hover:text-ink-2 select-none", col.width)}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        sortKey === col.key
                          ? sortDir === "asc"
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                          : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-os-border/50">
                    {bulkActions && <td className="os-table-td"><div className="h-3 w-3 bg-os-raised rounded animate-pulse" /></td>}
                    {columns.map(c => (
                      <td key={c.key} className="os-table-td">
                        <div className="h-3.5 bg-os-raised rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="py-12 text-center">
                    <p className="text-sm text-red-400">{error}</p>
                    <p className="text-xs text-ink-3 mt-1">Check network or API status</p>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="py-12 text-center">
                    <p className="text-sm text-ink-2">{emptyTitle}</p>
                    <p className="text-xs text-ink-3 mt-1">{emptyMessage}</p>
                  </td>
                </tr>
              ) : paged.map((row, i) => {
                const id = String(row[keyField]);
                const isSelected = selected.has(id);
                const isActive = selectedId === id;
                return (
                  <tr
                    key={id}
                    className={cn(
                      "os-table-row",
                      isActive && "bg-brand-500/5 border-l-2 border-l-brand-500",
                      isSelected && "bg-brand-500/5",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {bulkActions && (
                      <td className="os-table-td" onClick={e => { e.stopPropagation(); toggleRow(id); }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          className="rounded border-os-border bg-os-raised accent-brand-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className="os-table-td">
                        {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-os-border">
            <span className="text-xs text-ink-3">
              {sorted.length} result{sorted.length !== 1 ? "s" : ""}
              {selected.size > 0 && ` · ${selected.size} selected`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 flex items-center justify-center rounded text-ink-2 hover:bg-os-raised disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-ink-2 px-2 min-w-[80px] text-center">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded text-ink-2 hover:bg-os-raised disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
