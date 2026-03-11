import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { command, citizen } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, AlertCard, Pagination, ModuleHeader } from '@/components/shared';
import { AlertTriangle, RefreshCw, Zap, CheckCircle2, Clock, Info } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { CitizenAlert } from '@/types';

function CitizenAlertsView() {
  const { data, loading, error, refetch } = useFetch(
    () => citizen.overview(),
    []
  );

  if (loading) return <LoadingScreen message="Loading alerts..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const overview = (data as any)?.data || data;
  const alerts: CitizenAlert[] = overview?.approved_alerts || [];
  const conditions = overview?.neighborhood_conditions || [];
  const cityActions = overview?.city_actions || [];
  const guidance = overview?.resident_guidance || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="City Alerts"
        subtitle="Approved alerts and neighborhood conditions for Montgomery residents"
        accentColor="bg-amber-500"
        icon={<AlertTriangle className="w-6 h-6" />}
      />

      {/* City Status */}
      {overview?.city_status_summary && (
        <div className="glass-card p-5 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">City Status</p>
              <p className="text-sm text-slate-300 leading-relaxed">{overview.city_status_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approved Alerts */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Active Alerts</h3>
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className={`glass-card border-l-4 p-5 ${
                alert.severity === 'critical' ? 'border-l-red-500 bg-red-500/5' :
                alert.severity === 'high' ? 'border-l-orange-500 bg-orange-500/5' :
                alert.severity === 'medium' ? 'border-l-amber-500 bg-amber-500/5' :
                'border-l-emerald-500 bg-emerald-500/5'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-white text-sm">{alert.title}</h4>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-xs ${
                    alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  } px-2 py-0.5 rounded-md font-medium`}>{alert.severity}</span>
                  {alert.updated_at && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.updated_at)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">{alert.summary}</p>
              {alert.what_city_is_doing && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-400 font-medium mb-0.5">WHAT THE CITY IS DOING</p>
                    <p className="text-sm text-emerald-300/90">{alert.what_city_is_doing}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
            <p className="text-slate-400">No active alerts for your area</p>
            <p className="text-sm text-slate-600 mt-1">All clear — the city is monitoring conditions across all modules</p>
          </div>
        )}
      </div>

      {/* Neighborhood Conditions */}
      {conditions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Neighborhood Conditions</h3>
          {conditions.map((cond: any, idx: number) => {
            const moduleColors: Record<string, string> = {
              sentinel: 'border-l-red-500 bg-red-500/5',
              youthshield: 'border-l-purple-500 bg-purple-500/5',
              blight: 'border-l-blue-500 bg-blue-500/5',
              compass: 'border-l-emerald-500 bg-emerald-500/5',
            };
            const badgeColors: Record<string, string> = {
              sentinel: 'badge-sentinel',
              youthshield: 'badge-youthshield',
              blight: 'badge-blight',
              compass: 'badge-compass',
            };
            return (
              <div key={`${cond.module}-${idx}`} className={`glass-card border-l-4 p-5 ${moduleColors[cond.module] || 'border-l-slate-500 bg-slate-500/5'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{cond.title}</h4>
                  <span className={`${badgeColors[cond.module] || 'badge'} text-xs`}>{cond.module}</span>
                </div>
                <p className="text-sm text-slate-400 mb-2">{cond.summary}</p>
                <p className="text-xs text-slate-500 italic">Why it matters: {cond.why_it_matters}</p>
                {cond.what_city_is_doing && (
                  <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-emerald-300/90">{cond.what_city_is_doing}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* City Actions & Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cityActions.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              City Actions
            </h3>
            <div className="space-y-3">
              {cityActions.map((action: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    action.category === 'positive_progress' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white">{action.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{action.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {guidance.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Resident Guidance
            </h3>
            <div className="space-y-2.5">
              {guidance.map((item: string, idx: number) => (
                <p key={idx} className="text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-blue-400 font-bold mt-px">•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { isExecutive, isOperational, isCitizen } = useAuth();

  // Citizens see the citizen-safe alert view
  if (isCitizen) return <CitizenAlertsView />;

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
