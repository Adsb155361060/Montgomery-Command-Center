import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

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
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        Previous
      </button>
      <span className="text-sm text-slate-400 px-4">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed text-sm"
      >
        Next
      </button>
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
