import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // 0 = persistent
  onClick?: () => void;
  actionLabel?: string; // e.g. "View Results"
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  loading: <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />,
};

const borders: Record<ToastType, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  loading: 'border-amber-500/30',
};

function Toast({ toast, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (toast.duration === 0) return;
    const ms = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, ms);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 w-80 p-4 rounded-xl border backdrop-blur-xl bg-navy-900/90 shadow-2xl shadow-black/40 transition-all duration-300 ${borders[toast.type]} ${
        exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } ${toast.onClick ? 'cursor-pointer hover:bg-navy-800/90' : ''}`}
      style={{ animation: exiting ? undefined : 'slideInRight 0.3s ease-out' }}
      onClick={toast.onClick ? () => { toast.onClick!(); setExiting(true); setTimeout(() => onDismiss(toast.id), 300); } : undefined}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 leading-tight">{toast.title}</p>
        {toast.message && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>}
        {toast.onClick && toast.actionLabel && (
          <p className="text-xs text-blue-400 mt-1.5 font-medium hover:text-blue-300 transition-colors">
            {toast.actionLabel} →
          </p>
        )}
      </div>
      {toast.type !== 'loading' && (
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-auto">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
