import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search, MapPin, AlertTriangle, School, Building2 } from 'lucide-react';
import { smartText } from '@/components/shared/AdaptiveRenderer';

export default function GapAnalysisPage() {
  const [district, setDistrict] = useState('');
  const { data, loading, error, refetch } = useFetch(() => youthshield.gapAnalysis(district ? { district: Number(district) } : {}), [district]);

  if (loading) return <LoadingScreen message="Analyzing service gaps..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  // The API returns { gapZones, summary, recommendations }
  const raw = data as any;
  const gaps = Array.isArray(raw) ? raw : (raw?.gapZones || raw?.gaps || raw?.gap_zones || []);
  const summary = raw?.summary ?? {
    totalGapZones: gaps.length,
    avgGapScore: 0,
    schoolsAffected: 0,
    programsNeeded: 0,
  };
  const recommendations: unknown[] = raw?.recommendations || [];

  const COLORS = ['#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Service Gap Analysis" subtitle="Identifying underserved areas for youth program expansion" accentColor="bg-youthshield-500" icon={<Search className="w-6 h-6" />}>
        <select value={district} onChange={e => setDistrict(e.target.value)} className="input-field w-44 text-sm">
          <option value="">All Districts</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <option key={d} value={d}>District {d}</option>)}
        </select>
      </ModuleHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gap Zones" value={summary.totalGapZones ?? gaps.length} icon={<MapPin className="w-4 h-4" />} color="text-youthshield-400" />
        <StatCard label="Avg Gap Score" value={summary.avgGapScore ?? summary.avgGapHours ?? 0} icon={<AlertTriangle className="w-4 h-4" />} color="text-amber-400" />
        <StatCard label="Schools Affected" value={summary.schoolsAffected ?? summary.centersClosingBefore6PM ?? 0} icon={<School className="w-4 h-4" />} color="text-blight-400" />
        <StatCard label="Programs Needed" value={summary.programsNeeded ?? recommendations.length ?? 0} icon={<Building2 className="w-4 h-4" />} color="text-compass-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gaps.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Gap Scores by Zone</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gaps.slice(0, 15).map((g: any, i: number) => ({ ...g, label: g.zone || g.district || `Zone ${String.fromCharCode(65 + (i % 26))}`, score: g.gapScore ?? g.gapHours ?? g.score ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: string) => typeof v === 'string' ? v.slice(0, 12) : String(v)} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="score" fill="#a855f7" radius={[4, 4, 0, 0]} name="Gap Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {gaps.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Resources Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[
                  { name: 'Schools', value: gaps.reduce((s: number, z: any) => s + (z.schools || 0), 0) },
                  { name: 'Centers', value: gaps.reduce((s: number, z: any) => s + (z.communityCenters || 0), 0) },
                  { name: 'Parks', value: gaps.reduce((s: number, z: any) => s + (z.parks || 0), 0) },
                  { name: 'Libraries', value: gaps.reduce((s: number, z: any) => s + (z.libraries || 0), 0) },
                ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {gaps.map((gap: any, idx: number) => {
          const zoneName = gap.zone || gap.district || `Zone ${String.fromCharCode(65 + (idx % 26))}-${Math.floor(idx / 26) + 1}`;
          const score = gap.gapScore ?? gap.score ?? 0;
          const gapHoursText = gap.gapHours || '';
          return (
            <div key={gap.id || idx} className="glass-card p-5 hover:border-youthshield-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-slate-500">{typeof zoneName === 'string' ? zoneName.slice(0, 20) : zoneName}</span>
                <span className={`badge text-xs ${score > 60 ? 'badge-danger' : score > 30 ? 'badge-warning' : 'badge-success'}`}>
                  {gapHoursText || `Gap: ${score}`}
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-3">
                <div className="bg-gradient-to-r from-youthshield-600 to-youthshield-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(Number(score) || 0, 100)}%` }} />
              </div>
              {gap.nearestCenter && (
                <p className="text-xs text-slate-400 mb-2">📍 Nearest: {gap.nearestCenter} ({gap.nearestCenterDistance || '?'}){gap.nearestCenterCloses ? `, closes ${gap.nearestCenterCloses}` : ''}</p>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-sm font-bold text-youthshield-400">{gap.schools ?? '-'}</p><p className="text-[9px] text-slate-500">Schools</p></div>
                <div><p className="text-sm font-bold text-blight-400">{gap.communityCenters ?? '-'}</p><p className="text-[9px] text-slate-500">Centers</p></div>
                <div><p className="text-sm font-bold text-compass-400">{gap.parks ?? '-'}</p><p className="text-[9px] text-slate-500">Parks</p></div>
              </div>
              {gap.recommendation && <p className="text-xs text-slate-400 mt-3 italic">💡 {gap.recommendation}</p>}
            </div>
          );
        })}
      </div>

      {recommendations.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">AI Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((r: any, i: number) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-youthshield-500/5 rounded-lg border border-youthshield-500/10">
                <span className="w-6 h-6 rounded-full bg-youthshield-500/20 flex items-center justify-center text-xs font-bold text-youthshield-400 flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-slate-300">{typeof r === 'string' ? r : (r as any)?.text || (r as any)?.recommendation || (r as any)?.description || (r as any)?.title || (r as any)?.action || smartText(r)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!gaps.length && (
        <div className="glass-card p-12 text-center">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No gap analysis data available</p>
        </div>
      )}
    </div>
  );
}
