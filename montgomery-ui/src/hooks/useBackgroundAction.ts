import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useBackgroundTasks, type BackgroundTask } from '@/contexts/BackgroundTaskContext';

/**
 * Drop-in replacement for `useAction` that survives navigation.
 *
 * The API call runs inside BackgroundTaskContext so it persists even when
 * the page component unmounts. When the user navigates back, the hook
 * automatically picks up the latest result/error from the global task list
 * by matching on the `label` string.
 *
 * Usage:
 *   const bg = useBackgroundAction('Generate Alerts', command.generateAlerts);
 *   bg.execute(params);        // fires background task
 *   bg.data                    // result (survives navigation)
 *   bg.loading                 // true while running
 *   bg.error                   // error string if failed
 */
export function useBackgroundAction<T, A extends unknown[]>(
  label: string,
  action: (...args: A) => Promise<{ data: T }>,
): {
  execute: (...args: A) => void;
  data: T | null;
  loading: boolean;
  error: string | null;
  taskId: string | null;
} {
  const { addTask, findByLabel, tasks } = useBackgroundTasks();
  const location = useLocation();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [localData, setLocalData] = useState<T | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // On mount, restore from global state if a matching task exists
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const existing = findByLabel(label);
    if (existing) {
      setTaskId(existing.id);
      if (existing.status === 'completed' && existing.result !== undefined) {
        setLocalData(existing.result as T);
        setLocalError(null);
      } else if (existing.status === 'failed') {
        setLocalError(existing.error ?? 'Something went wrong');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find our task in global context
  const task: BackgroundTask | undefined = taskId
    ? tasks.find(t => t.id === taskId)
    : undefined;

  // Sync global task state → local state so component re-renders
  useEffect(() => {
    if (!task) return;
    if (task.status === 'completed' && task.result !== undefined) {
      setLocalData(task.result as T);
      setLocalError(null);
    }
    if (task.status === 'failed') {
      setLocalError(task.error ?? 'Something went wrong');
    }
  }, [task?.status, task?.result, task?.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute = useCallback(
    (...args: A) => {
      setLocalData(null);
      setLocalError(null);
      const id = addTask(label, async () => {
        const res = await action(...args);
        return res.data;
      }, location.pathname);
      setTaskId(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addTask, label, location.pathname],
  );

  const loading = task ? task.status === 'running' : false;

  return {
    execute,
    data: localData,
    loading,
    error: localError,
    taskId,
  };
}
