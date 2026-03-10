import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination, FilterBar, useFilters } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { Target, RefreshCw, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 20;

const FILTER_FIELDS = [
  { key: 'district', label: 'District', type: 'text' as const, placeholder: 'e.g. 2, 4A...' },
  { key: 'shift', label: 'Shift', type: 'select' as const, options: [
    { value: 'day', label: 'Day Shift' },
    { value: 'evening', label: 'Evening Shift' },
    { value: 'night', label: 'Night Shift' },
  ]},
  { key: 'riskLevel', label: 'Risk Level', type: 'select' as const, options: [
    { value: 'critical', label: 'Critical (>70)' },
    { value: 'high', label: 'High (50-70)' },
    { value: 'medium', label: 'Medium (30-50)' },
    { value: 'low', label: 'Low (<30)' },
  ]},
];

export default function ForceMultiplierPage() {
  const { isExecutive, isOperational } = useAuth();
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters({ district: '', shift: '', riskLevel: '' }, setPage);

  const { data, loading, error, refetch, raw } = useFetch(
    () => sentinel.forceMultiplier({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filterParams]
  );
  const gen = useBackgroundAction('Recalculate Force Multiplier', sentinel.generateForceMultiplier);

  const handleGenerate = () => {
    gen.execute();
    setTimeout(refetch, 3000);
  };

  if (loading) return <LoadingScreen message="Loading force multiplier zones..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const zones = Array.isArray(data) ? data : [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

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
        {(isExecutive || isOperational) && (
          <button onClick={handleGenerate} disabled={gen.loading} className="btn-primary flex items-center gap-2 text-sm">
            {gen.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Recalculate Zones
          </button>
        )}
      </ModuleHeader>

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
