import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, type ToastItem } from '@/components/shared/Toast';

/* ───────────────── Task types ───────────────── */

export interface BackgroundTask {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
  routePath?: string; // page route where the task was started
}

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[];
  /** Launch a named background task. Returns the task id. */
  addTask: <T>(label: string, promiseFn: () => Promise<T>, routePath?: string) => string;
  /** Get a finished task's result by id */
  getTask: (id: string) => BackgroundTask | undefined;
  /** Find the latest task matching a label */
  findByLabel: (label: string) => BackgroundTask | undefined;
  /** Remove a completed/failed task from the list */
  dismissTask: (id: string) => void;
  /** Remove all completed/failed tasks */
  clearFinished: () => void;
}

const Ctx = createContext<BackgroundTaskContextValue | null>(null);

/* ───────────────── Provider ───────────────── */

let _taskSeq = 0;

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const navigate = useNavigate();

  /* Toast helpers */
  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { ...t, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* Task management */
  const addTask = useCallback(<T,>(label: string, promiseFn: () => Promise<T>, routePath?: string): string => {
    const id = `task_${++_taskSeq}_${Date.now()}`;
    const task: BackgroundTask = {
      id,
      label,
      status: 'running',
      startedAt: Date.now(),
      routePath,
    };

    setTasks(prev => [...prev, task]);

    // Show "started" toast
    pushToast({
      type: 'loading',
      title: `${label}`,
      message: 'AI analysis running — feel free to switch tabs. You\'ll be notified when it\'s done.',
      duration: 4000,
    });

    // Fire and forget — runs independently of any component lifecycle
    promiseFn()
      .then((result) => {
        setTasks(prev =>
          prev.map(t =>
            t.id === id ? { ...t, status: 'completed' as const, result, completedAt: Date.now() } : t
          )
        );
        pushToast({
          type: 'success',
          title: `${label} — Complete`,
          message: 'Click to view results.',
          duration: 12000,
          onClick: routePath ? () => navigate(routePath) : undefined,
          actionLabel: routePath ? 'View Results' : undefined,
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setTasks(prev =>
          prev.map(t =>
            t.id === id ? { ...t, status: 'failed' as const, error: msg, completedAt: Date.now() } : t
          )
        );
        pushToast({
          type: 'error',
          title: `${label} — Failed`,
          message: msg,
          duration: 8000,
        });
      });

    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const getTask = useCallback((id: string) => tasks.find(t => t.id === id), [tasks]);

  const findByLabel = useCallback((label: string) => {
    // Return most recent task with this label (last in array)
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (tasks[i].label === label) return tasks[i];
    }
    return undefined;
  }, [tasks]);

  const dismissTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'running'));
  }, []);

  return (
    <Ctx.Provider value={{ tasks, addTask, getTask, findByLabel, dismissTask, clearFinished }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </Ctx.Provider>
  );
}

/* ───────────────── Hook ───────────────── */

export function useBackgroundTasks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackgroundTasks must be used inside BackgroundTaskProvider');
  return ctx;
}
