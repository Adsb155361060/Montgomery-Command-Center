import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { Target, RefreshCw, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

export default function ForceMultiplierPage() {
  const { isExecutive, isOperational } = useAuth();
  const [page, setPage] = useState(1);
  const [shift, setShift] = useState('');
  const { data, loading, error, refetch } = useFetch(
    () => sentinel.forceMultiplier({ page, limit: 20, shift: shift || undefined }),
    [page, shift]
  );
  const gen = useBackgroundAction('Recalculate Force Multiplier', sentinel.generateForceMultiplier);

  const handleGenerate = () => {
    gen.execute();
    setTimeout(refetch, 3000);
  };

  if (loading) return <LoadingScreen message="Loading force multiplier zones..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const zones = Array.isArray(data) ? data : ((data as any)?.data || []);
  const meta = (data as any)?.meta;

  const chartData = zones.slice(0, 15).map((z: any, i: number) => ({
    zone: `Zone ${i + 1}`,
    riskScore: z.score ?? z.riskScore ?? 0,
    multiplier: z.multiplierEffect ?? z.multiplier ?? 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Force Multiplier Zones"
        subtitle="AI-calculated zones where officer presence yields maximum deterrent effect"
        accentColor="bg-sentinel-500"
        icon={<Target className="w-6 h-6" />}
      >
        <select value={shift} onChange={e => { setShift(e.target.value); setPage(1); }} className="input-field w-auto text-sm">
          <option value="">All Shifts</option>
          <option value="day">Day Shift</option>
          <option value="evening">Evening Shift</option>
          <option value="night">Night Shift</option>
        </select>
        {(isExecutive || isOperational) && (
          <button onClick={handleGenerate} disabled={gen.loading} className="btn-primary flex items-center gap-2 text-sm">
            {gen.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Recalculate Zones
          </button>
        )}
      </ModuleHeader>

      {gen.data && (
        <div className="glass-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5 animate-slide-up">
          <p className="text-sm text-emerald-400">✓ Generated {(gen.data as any).zones} force multiplier zones</p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Score Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="zone" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Bar dataKey="riskScore" fill="#ef4444" radius={[6, 6, 0, 0]} name="Risk Score" />
              <Bar dataKey="multiplier" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Multiplier" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((zone: any, idx: number) => (
          <div key={zone.id} className="glass-card p-5 border-l-4 border-l-sentinel-500">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500">Patrol Zone {String.fromCharCode(65 + (idx % 26))}-{Math.floor(idx / 26) + 1}</span>
              <span className={`badge text-xs ${(zone.score ?? zone.riskScore ?? 0) > 70 ? 'badge-danger' : (zone.score ?? zone.riskScore ?? 0) > 40 ? 'badge-warning' : 'badge-success'}`}>
                Risk: {zone.score ?? zone.riskScore ?? 0}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-lg font-bold font-mono text-sentinel-400">{(zone.multiplierEffect ?? zone.multiplier) ? `${(zone.multiplierEffect ?? zone.multiplier).toFixed(1)}x` : `${((zone.score ?? zone.riskScore ?? 0) / 10).toFixed(1)}x`}</p>
                <p className="text-xs text-slate-500">Multiplier</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-white">{zone.incidentCount}</p>
                <p className="text-xs text-slate-500">Incidents</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-amber-400">{zone.shift || '—'}</p>
                <p className="text-xs text-slate-500">Shift</p>
              </div>
            </div>
            {zone.recommendation && (
              <div className="mt-3 bg-slate-800/50 p-2 rounded-lg">
                <Markdown size="sm">{zone.recommendation}</Markdown>
              </div>
            )}
          </div>
        ))}
      </div>

      {(!zones.length) && (
        <div className="glass-card p-12 text-center">
          <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No force multiplier zones calculated yet</p>
          <p className="text-xs text-slate-600 mt-1">Click "Recalculate Zones" to generate AI-powered analysis</p>
        </div>
      )}

      {meta && <Pagination page={page} totalPages={meta.pages} onPageChange={setPage} />}
    </div>
  );
}
