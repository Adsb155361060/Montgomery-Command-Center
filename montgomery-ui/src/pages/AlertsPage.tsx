import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { command } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, AlertCard, Pagination, ModuleHeader } from '@/components/shared';
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function AlertsPage() {
  const { isExecutive, isOperational } = useAuth();
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const { data, loading, error, refetch } = useFetch(
    () => command.alerts({ page, limit: 20, severity: severity || undefined }),
    [page, severity]
  );
  const gen = useBackgroundAction('Generate Alerts', command.generateAlerts);

  const handleGenerate = () => {
    gen.execute();
    // Results will be available via toast when done; refetch list after a delay
    setTimeout(refetch, 3000);
  };

  if (loading) return <LoadingScreen message="Loading alerts..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const alerts = (data as any)?.data || data || [];
  const meta = (data as any)?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Cross-Module Alerts"
        subtitle="AI-detected convergence patterns across all modules"
        accentColor="bg-amber-500"
        icon={<AlertTriangle className="w-6 h-6" />}
      >
        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value); setPage(1); }}
          className="input-field w-auto text-sm"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(isExecutive || isOperational) && (
          <button onClick={handleGenerate} disabled={gen.loading} className="btn-primary flex items-center gap-2 text-sm">
            {gen.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Alerts
          </button>
        )}
      </ModuleHeader>

      {gen.data && (
        <div className="glass-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5 animate-slide-up">
          <p className="text-sm text-emerald-400">✓ Generated {(gen.data as any).alerts} new convergence alerts</p>
        </div>
      )}

      <div className="space-y-4">
        {Array.isArray(alerts) && alerts.length > 0 ? (
          alerts.map((alert: any) => (
            <AlertCard
              key={alert.id}
              title={alert.title}
              description={alert.description}
              severity={alert.severity}
              modules={alert.modules || []}
              time={timeAgo(alert.createdAt)}
              recommendation={alert.recommendation}
            />
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No alerts found</p>
            <p className="text-sm text-slate-600 mt-1">Generate new convergence alerts to detect cross-module patterns</p>
          </div>
        )}
      </div>

      {meta && <Pagination page={page} totalPages={meta.pages} onPageChange={setPage} />}
    </div>
  );
}
