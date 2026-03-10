import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination, FilterBar, useFilters } from '@/components/shared';
import { BarChart3, RefreshCw, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 24;

const FILTER_FIELDS = [
  { key: 'district', label: 'District', type: 'text' as const, placeholder: 'e.g. 2, 4A...' },
  { key: 'riskLevel', label: 'Risk Level', type: 'select' as const, options: [
    { value: 'critical', label: 'Critical (>70)' },
    { value: 'high', label: 'High (50-70)' },
    { value: 'medium', label: 'Medium (30-50)' },
    { value: 'low', label: 'Low (<30)' },
  ]},
];

export default function ScoresPage() {
  const { isExecutive, isOperational } = useAuth();
  const [page, setPage] = useState(1);
  const { filters, setFilter, resetFilters, filterParams } = useFilters({ district: '', riskLevel: '' }, setPage);

  const { data, loading, error, refetch, raw } = useFetch(
    () => blight.scores({ page, limit: PAGE_SIZE, ...filterParams }),
    [page, filterParams]
  );
  const gen = useBackgroundAction('Recalculate Blight Scores', blight.generateScores);

  const handleGen = () => { gen.execute(); setTimeout(refetch, 3000); };

  if (loading) return <LoadingScreen message="Loading blight scores..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = Array.isArray(data) ? data : [];
  const pagination = (raw as any)?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalRecords = pagination?.total;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Blight Scores" subtitle="AI-computed composite scores combining nuisances, violations, and environmental factors" accentColor="bg-blight-500" icon={<BarChart3 className="w-6 h-6" />}>
        {(isExecutive || isOperational) && (
          <button onClick={handleGen} disabled={gen.loading} className="btn-primary flex items-center gap-2 text-sm">
            {gen.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Recalculate Scores
          </button>
        )}
      </ModuleHeader>

      <FilterBar filters={FILTER_FIELDS} values={filters} onChange={setFilter} onReset={resetFilters} />

      {gen.data && (
        <div className="glass-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5 animate-slide-up">
          <p className="text-sm text-emerald-400">✓ Scores recalculated successfully</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((s: any, idx: number) => {
          const score = s.blightScore ?? s.score ?? 0;
          const isHigh = score > 70;
          const isMed = score > 40;
          return (
            <div key={s.id || s.h3Index} className={`glass-card p-5 border-l-4 ${isHigh ? 'border-l-red-500' : isMed ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-slate-500">{s.address?.slice(0, 25) || `Area ${String.fromCharCode(65 + (idx % 26))}-${Math.floor(idx / 26) + 1}`}</span>
                {isHigh ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
              </div>

              <div className="flex items-end gap-2 mb-3">
                <span className={`text-3xl font-bold font-mono ${isHigh ? 'text-red-400' : isMed ? 'text-amber-400' : 'text-emerald-400'}`}>{score}</span>
                <span className="text-xs text-slate-500 mb-1">/ 100</span>
              </div>

              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full transition-all ${isHigh ? 'bg-gradient-to-r from-red-600 to-red-400' : isMed ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} style={{ width: `${Math.min(score, 100)}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs font-mono text-blight-400">{s.nuisanceCount ?? s.nuisances ?? '-'}</p><p className="text-[9px] text-slate-500">Nuisances</p></div>
                <div><p className="text-xs font-mono text-amber-400">{s.violationCount ?? s.violations ?? '-'}</p><p className="text-[9px] text-slate-500">Violations</p></div>
                <div><p className="text-xs font-mono text-youthshield-400">{s.environmentalFactor ?? s.environmental ?? s.envFactor ?? '-'}</p><p className="text-[9px] text-slate-500">Env Factor</p></div>
              </div>

              {s.address && <p className="text-[10px] text-slate-500 mt-2 truncate">📍 {s.address}</p>}
            </div>
          );
        })}
      </div>

      {!items.length && (
        <div className="glass-card p-12 text-center">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No blight scores available. Click "Recalculate Scores" to generate.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={totalRecords} pageSize={PAGE_SIZE} />
    </div>
  );
}
