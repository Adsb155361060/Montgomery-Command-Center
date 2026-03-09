import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { ModuleHeader, LoadingScreen } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { AdaptiveRenderer, pick, labelify, SmartValue, smartText } from '@/components/shared/AdaptiveRenderer';
import { Map, Users, Zap } from 'lucide-react';

export default function DeploymentPage() {
  const [form, setForm] = useState({ officerCount: 14, shift: 'day', district: '' });
  const deploy = useBackgroundAction('Optimize Deployment', sentinel.deployment);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    deploy.execute({
      officerCount: form.officerCount,
      shift: form.shift,
      district: form.district || undefined,
    });
  };

  const raw = deploy.data as any;
  // Unwrap — AI might nest under deploymentPlan, optimizedShift, data, etc.
  const result = raw?.deploymentPlan || raw?.deployment || raw?.optimizedShift || raw?.plan || raw?.data?.deploymentPlan || raw?.data || raw;
  const hasResult = result && typeof result === 'object' && Object.keys(result).length > 0;

  /* ─── Resilient extraction ─── */
  const totalCoverage = Number(pick(result, 'totalCoverage', 'coverage', 'overallCoverage', 'coveragePercent') || 0);
  const assignments: any[] = (() => {
    const a = pick(result, 'assignments', 'patrols', 'patrolAssignments', 'officers', 'units', 'deployments');
    return Array.isArray(a) ? a : [];
  })();
  const gapZones: any[] = (() => {
    const g = pick(result, 'gapZones', 'gaps', 'coverageGaps', 'uncoveredZones', 'gapAreas');
    return Array.isArray(g) ? g : [];
  })();
  const recs: any[] = (() => {
    const r = pick(result, 'recommendations', 'suggestions', 'notes', 'optimizationNotes');
    return Array.isArray(r) ? r : r ? [r] : [];
  })();

  const handledKeys = new Set([
    'totalCoverage', 'coverage', 'overallCoverage', 'coveragePercent',
    'assignments', 'patrols', 'patrolAssignments', 'officers', 'units', 'deployments',
    'gapZones', 'gaps', 'coverageGaps', 'uncoveredZones', 'gapAreas',
    'recommendations', 'suggestions', 'notes', 'optimizationNotes',
    'deploymentPlan', 'deployment', 'optimizedShift', 'plan', 'data', 'modelUsed',
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Shift Deployment Optimizer"
        subtitle="AI-optimized patrol route assignments maximizing coverage across all districts"
        accentColor="bg-sentinel-500"
        icon={<Map className="w-6 h-6" />}
      />

      {/* Input Form */}
      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Officers Available</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.officerCount}
              onChange={e => setForm({ ...form, officerCount: Number(e.target.value) })}
              className="input-field w-32"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Shift</label>
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className="input-field w-40">
              <option value="day">Day Shift</option>
              <option value="evening">Evening Shift</option>
              <option value="night">Night Shift</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">District (optional)</label>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="input-field w-40">
              <option value="">All Districts</option>
              {[1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
            </select>
          </div>
          <button type="submit" disabled={deploy.loading} className="btn-primary flex items-center gap-2">
            {deploy.loading ? <span className="animate-spin">⏳</span> : <Zap className="w-4 h-4" />}
            Optimize Deployment
          </button>
        </form>
      </div>

      {deploy.loading && <LoadingScreen message="AI is optimizing deployment..." />}

      {deploy.error && (
        <div className="glass-card p-4 border-l-4 border-l-red-500 bg-red-500/5">
          <p className="text-sm text-red-400">{deploy.error}</p>
        </div>
      )}

      {hasResult && (
        <div className="space-y-6 animate-slide-up">
          {/* Coverage Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-sentinel-400">{totalCoverage > 0 ? `${totalCoverage}%` : '—'}</p>
              <p className="stat-label">Total Coverage</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-white">{assignments.length || '—'}</p>
              <p className="stat-label">Assignments</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-amber-400">{gapZones.length || 0}</p>
              <p className="stat-label">Gap Zones</p>
            </div>
          </div>

          {/* Assignments */}
          {assignments.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-sentinel-400" /> Patrol Assignments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {assignments.map((a: any, i: number) => {
                  const officerId = pick(a, 'officerId', 'officer', 'officerName', 'id', 'unit', 'unitId', 'name');
                  const zone = pick(a, 'zone', 'area', 'sector', 'beat', 'location', 'region');
                  const district = pick(a, 'district', 'districtNumber', 'districtId');
                  const route = pick(a, 'patrolRoute', 'route', 'patrol', 'description', 'routeDescription', 'details');
                  const coverage = Number(pick(a, 'estimatedCoverage', 'coverage', 'coveragePercent', 'coverageScore') || 0);
                  const priority = pick(a, 'priority', 'level', 'urgency', 'riskLevel');
                  const priorityStr = String(priority || 'normal').toLowerCase();
                  const aHandled = new Set([
                    'officerId', 'officer', 'officerName', 'id', 'unit', 'unitId', 'name',
                    'zone', 'area', 'sector', 'beat', 'location', 'region',
                    'district', 'districtNumber', 'districtId',
                    'patrolRoute', 'route', 'patrol', 'description', 'routeDescription', 'details',
                    'estimatedCoverage', 'coverage', 'coveragePercent', 'coverageScore',
                    'priority', 'level', 'urgency', 'riskLevel',
                  ]);
                  const extra = Object.entries(a).filter(([k, v]) => !aHandled.has(k) && v != null && v !== '');
                  return (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{officerId ? `Officer ${officerId}` : `Unit ${i + 1}`}</span>
                        {priority && (
                          <span className={`badge text-[10px] ${
                            priorityStr === 'high' || priorityStr === 'critical' ? 'badge-danger' :
                            priorityStr === 'medium' || priorityStr === 'moderate' ? 'badge-warning' :
                            'badge-success'
                          }`}>
                            {priority}
                          </span>
                        )}
                      </div>
                      {zone && <p className="text-xs text-slate-400">Zone: {zone}</p>}
                      {district && <p className="text-xs text-slate-400">District: {district}</p>}
                      {route && <p className="text-xs text-slate-400 mt-1">{route}</p>}
                      {coverage > 0 && (
                        <>
                          <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
                            <div className="bg-sentinel-500 h-1.5 rounded-full" style={{ width: `${Math.min(coverage, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{coverage}% coverage</p>
                        </>
                      )}
                      {/* Show any extra fields */}
                      {extra.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {extra.map(([k, v]) => (
                            <div key={k} className="text-[10px] text-slate-500">
                              <span className="font-medium">{labelify(k)}:</span>{' '}
                              <span className="text-slate-400">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-3">AI Recommendations</h3>
              <ul className="space-y-2">
                {recs.map((r: any, i: number) => {
                  const text = typeof r === 'string' ? r : (pick(r, 'text', 'recommendation', 'description', 'title', 'action', 'note') || smartText(r));
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-amber-500 mt-0.5">→</span>
                      <Markdown size="sm">{text}</Markdown>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Gap Zones */}
          {gapZones.length > 0 && (
            <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">⚠ Coverage Gaps</h3>
              <div className="flex flex-wrap gap-2">
                {gapZones.map((g: any, i: number) => (
                  <span key={i} className="badge-warning text-xs">
                    {typeof g === 'string' ? g : (pick(g, 'zone', 'area', 'name', 'district', 'location') || smartText(g))}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ★ ADAPTIVE FALLBACK ★ */}
          <AdaptiveRenderer data={result} excludeKeys={handledKeys} title="Additional Deployment Details" />
        </div>
      )}
    </div>
  );
}
