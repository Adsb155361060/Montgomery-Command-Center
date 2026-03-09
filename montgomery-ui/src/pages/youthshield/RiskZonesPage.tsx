import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, Pagination } from '@/components/shared';
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RiskZonesPage() {
  const { isExecutive, isOperational } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFetch(() => youthshield.riskZones({ page, limit: 20 }), [page]);
  const gen = useBackgroundAction('Generate Risk Zones', youthshield.generateRiskZones);

  const handleGenerate = () => { gen.execute(); setTimeout(refetch, 3000); };

  if (loading) return <LoadingScreen message="Loading risk zones..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const zones = Array.isArray(data) ? data : ((data as any)?.data || []);
  const meta = (data as any)?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Youth Risk Heat Map" subtitle="Privacy-preserving zones showing elevated youth violence risk" accentColor="bg-youthshield-500" icon={<AlertTriangle className="w-6 h-6" />}>
        {(isExecutive || isOperational) && (
          <button onClick={handleGenerate} disabled={gen.loading} className="btn-primary flex items-center gap-2 text-sm">
            {gen.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Recalculate Zones
          </button>
        )}
      </ModuleHeader>

      {gen.data && (
        <div className="glass-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5 animate-slide-up">
          <p className="text-sm text-emerald-400">✓ Generated {(gen.data as any).zones} risk zones</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((zone: any) => (
          <div key={zone.id} className={`glass-card p-5 border-l-4 ${zone.riskScore > 70 ? 'border-l-red-500' : zone.riskScore > 40 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500">Zone {zone.h3Index?.slice(-4).toUpperCase() || zone.id}</span>
              <span className={`badge text-xs ${zone.riskScore > 70 ? 'badge-danger' : zone.riskScore > 40 ? 'badge-warning' : 'badge-success'}`}>
                Risk: {zone.riskScore}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-bold font-mono text-youthshield-400">{zone.riskScore}</p>
                <p className="text-[10px] text-slate-500">Risk Score</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-blight-400">{zone.gapScore}</p>
                <p className="text-[10px] text-slate-500">Gap Score</p>
              </div>
            </div>
            {zone.nearestSchool && <p className="text-xs text-slate-400 mt-2">📍 Near: {zone.nearestSchool}</p>}
            {zone.factors && <p className="text-xs text-slate-500 mt-1 bg-slate-800/50 p-2 rounded-lg">{zone.factors}</p>}
          </div>
        ))}
      </div>

      {!zones.length && (
        <div className="glass-card p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No risk zones calculated yet</p>
        </div>
      )}

      {meta && <Pagination page={page} totalPages={meta.pages} onPageChange={setPage} />}
    </div>
  );
}
