import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, RefreshCw, Filter, X, Search } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

// ── Filter Bar ──
export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  accentColor = 'amber',
}: {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  accentColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="glass-card p-3 no-print">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            expanded
              ? `bg-${accentColor}-500/10 text-${accentColor}-500 border border-${accentColor}-500/20`
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className={`ml-1 w-5 h-5 rounded-full bg-${accentColor}-500 text-white text-[10px] flex items-center justify-center font-bold`}>
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-500 hover:bg-red-500/10 transition-all"
          >
            <X className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filters.map(f => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={values[f.key] || ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">{f.placeholder || `All ${f.label}`}</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type={f.type}
                    value={values[f.key] || ''}
                    onChange={e => onChange(f.key, e.target.value)}
                    placeholder={f.placeholder || `Search ${f.label.toLowerCase()}...`}
                    className="input-field text-sm pl-8 w-full"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hook to manage filter state with debounce and page reset */
export function useFilters(
  initialFilters: Record<string, string>,
  setPage: (p: number) => void,
) {
  const [filters, setFilters] = useState(initialFilters);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, [setPage]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
  }, [initialFilters, setPage]);

  // Build params object from filters (only include non-empty values)
  // Memoize so the object reference is stable across renders
  const filterParamsKey = JSON.stringify(filters);
  const filterParams = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterParamsKey]
  );

  return { filters, setFilter, resetFilters, filterParams };
}

// ── Loading Spinner ──
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return <Loader2 className={cn(sizes[size], 'animate-spin text-amber-500', className)} />;
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <Spinner size="lg" />
      <p className="mt-4 text-slate-400 text-sm">{message}</p>
    </div>
  );
}

// ── Error Display ──
export function ErrorDisplay({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-slate-400 text-sm text-center max-w-md mb-4">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
}

// ── Empty State ──
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      {icon && <div className="mb-4 text-slate-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm">{description}</p>}
    </div>
  );
}

// ── Stat Card ──
export function StatCard({
  label,
  value,
  trend,
  icon,
  color = 'text-white',
  className,
}: {
  label: string;
  value: string | number;
  trend?: string;
  icon?: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('glass-card p-5 animate-slide-up', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className={cn('stat-value mt-1', color)}>{value}</p>
          {trend && (
            <p className={cn('text-xs mt-2 font-medium', trend.startsWith('+') ? 'text-emerald-400' : trend.startsWith('-') ? 'text-red-400' : 'text-slate-400')}>
              {trend}
            </p>
          )}
        </div>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
    </div>
  );
}

// ── Module Header Card ──
export function ModuleHeader({
  title,
  subtitle,
  accentColor,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white', accentColor)}>
            {icon}
          </div>
          <div>
            <h1 className="section-title">{title}</h1>
            <p className="text-slate-400 mt-1">{subtitle}</p>
          </div>
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}

// ── Data Table ──
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No data available',
}: {
  columns: Array<{ key: string; label: string; render?: (value: unknown, row: T) => ReactNode }>;
  data: T[];
  keyField?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  if (!data.length) {
    return <EmptyState title={emptyMessage} />;
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={String(row[keyField] ?? i)}
              className={cn(
                'border-b border-slate-800/50 transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-slate-800/30' : ''
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={col.key} className="py-3 px-4 text-slate-300">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ──
export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalRecords,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  // Calculate visible page buttons
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const showingFrom = totalRecords ? (page - 1) * (pageSize || 25) + 1 : undefined;
  const showingTo = totalRecords ? Math.min(page * (pageSize || 25), totalRecords) : undefined;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 no-print">
      {totalRecords != null && (
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Showing {showingFrom}–{showingTo} of {totalRecords.toLocaleString()} records
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-xs px-2 py-1.5"
          title="First page"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-sm px-2.5 py-1.5"
        >
          ‹ Prev
        </button>
        {startPage > 1 && <span className="text-xs text-slate-500 px-1">…</span>}
        {pageNumbers.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'w-8 h-8 rounded-lg text-xs font-medium transition-all',
              p === page
                ? 'bg-amber-500 text-navy-950 shadow-lg shadow-amber-500/20'
                : 'btn-ghost hover:bg-slate-200 dark:hover:bg-slate-700/50'
            )}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && <span className="text-xs text-slate-500 px-1">…</span>}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-sm px-2.5 py-1.5"
        >
          Next ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-xs px-2 py-1.5"
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

// ── Tab Navigation ──
export function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: string; label: string; icon?: ReactNode }>;
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            active === tab.key
              ? 'bg-amber-500 text-navy-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Alert Card ──
export function AlertCard({
  title,
  description,
  severity,
  modules,
  time,
  recommendation,
}: {
  title: string;
  description: string;
  severity: string;
  modules: string[];
  time: string;
  recommendation?: string;
}) {
  const severityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-500/5',
    high: 'border-l-orange-500 bg-orange-500/5',
    medium: 'border-l-amber-500 bg-amber-500/5',
    low: 'border-l-emerald-500 bg-emerald-500/5',
  };
  const moduleColors: Record<string, string> = {
    sentinel: 'badge-sentinel',
    youthshield: 'badge-youthshield',
    blight: 'badge-blight',
    compass: 'badge-compass',
  };
  
  return (
    <div className={cn('glass-card border-l-4 p-5', severityColors[severity.toLowerCase()] || severityColors.low)}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-white text-sm">{title}</h4>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <p className="text-sm text-slate-400 mb-3">{description}</p>
      {recommendation && (
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
          <p className="text-xs text-amber-400 font-medium mb-1">RECOMMENDATION</p>
          <p className="text-sm text-slate-300">{recommendation}</p>
        </div>
      )}
      <div className="flex gap-2">
        {modules.map(m => (
          <span key={m} className={cn('badge text-xs', moduleColors[m.toLowerCase()] || 'badge')}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
