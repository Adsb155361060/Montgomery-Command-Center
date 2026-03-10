import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, MapPin, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { smartText } from '@/components/shared/AdaptiveRenderer';

/** Parse gap hours string like "3PM-6PM" into a numeric duration for charting */
function gapHoursToNum(gh: unknown): number {
  if (typeof gh === 'number') return gh;
  if (typeof gh !== 'string') return 0;
  // Try "XPM-YPM" or "X:00 PM - Y:00 PM" patterns
  const m = gh.match(/(\d{1,2})(?::?\d{2})?\s*(?:PM|AM)?.*?(\d{1,2})(?::?\d{2})?\s*(?:PM|AM)/i);
  if (m) {
    let start = parseInt(m[1]);
    let end = parseInt(m[2]);
    // Assume PM range for afternoon gaps
    if (start < 12 && gh.toLowerCase().includes('pm')) start += 12;
    if (end < 12 && gh.toLowerCase().includes('pm')) end += 12;
    if (start < end) return end - start;
  }
  // Try plain number
  const n = parseFloat(gh);
  return Number.isFinite(n) ? n : 0;
}

export default function GapAnalysisPage() {
  const [district, setDistrict] = useState('');
  const { data, loading, error, refetch } = useFetch(() => youthshield.gapAnalysis(district ? { district: Number(district) } : {}), [district]);

  if (loading) return <LoadingScreen message="Analyzing service gaps..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  // API returns { gapZones, summary, recommendations }
  const raw = data as any;
  const gaps: any[] = Array.isArray(raw) ? raw : (raw?.gapZones || raw?.gaps || raw?.gap_zones || []);
  const summary = raw?.summary ?? {};
  const recommendations: unknown[] = raw?.recommendations || [];

  // Derive summary stats with multiple fallback field names
  const totalGapZones = summary.totalGapZones ?? gaps.length;
  const avgGapHours = summary.avgGapHours ?? summary.avgGapScore ?? (
    gaps.length > 0 ? (gaps.reduce((s: number, z: any) => s + gapHoursToNum(z.gapHours ?? z.gapScore ?? z.score), 0) / gaps.length).toFixed(1) : 0
  );
  const worstDistrict = summary.worstDistrict ?? summary.worst_district ?? '-';
  const centersClosingEarly = summary.centersClosingBefore6PM ?? summary.centersClosingBefore_6PM ?? summary.schoolsAffected ?? 0;

  // Chart data
  const chartData = gaps.slice(0, 15).map((g: any, i: number) => ({
    label: g.zone || g.district || `Zone ${String.fromCharCode(65 + (i % 26))}`,
    hours: gapHoursToNum(g.gapHours ?? g.gapScore ?? g.score),
    gapHours: g.gapHours || '',
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Service Gap Analysis" subtitle="Identifying underserved areas for youth program expansion" accentColor="bg-youthshield-500" icon={<Search className="w-6 h-6" />}>
        <select value={district} onChange={e => setDistrict(e.target.value)} className="input-field w-44 text-sm">
          <option value="">All Districts</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
        </select>
      </ModuleHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gap Zones" value={totalGapZones} icon={<MapPin className="w-4 h-4" />} color="text-youthshield-400" />
        <StatCard label="Avg Gap Hours" value={avgGapHours} icon={<Clock className="w-4 h-4" />} color="text-amber-400" />
        <StatCard label="Centers Closing Early" value={centersClosingEarly} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-400" />
        <StatCard label="Worst District" value={worstDistrict} icon={<Building2 className="w-4 h-4" />} color="text-blight-400" />
      </div>

      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Coverage Gap by Zone (hours without programs)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: any, _: any, entry: any) => [entry.payload.gapHours || `${v} hrs`, 'Gap']}
              />
              <Bar dataKey="hours" fill="#a855f7" radius={[4, 4, 0, 0]} name="Gap Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {gaps.map((gap: any, idx: number) => {
          const zoneName = gap.zone || gap.district || `Zone ${String.fromCharCode(65 + (idx % 26))}-${Math.floor(idx / 26) + 1}`;
          const gapHours = gap.gapHours || gap.gap_hours || '';
          const numHours = gapHoursToNum(gapHours);
          return (
            <div key={gap.id || idx} className="glass-card p-5 hover:border-youthshield-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-slate-400 font-semibold">{typeof zoneName === 'string' ? zoneName.slice(0, 24) : zoneName}</span>
                <span className={`badge text-xs ${numHours >= 4 ? 'badge-danger' : numHours >= 2 ? 'badge-warning' : 'badge-success'}`}>
                  {gapHours || `${numHours}h gap`}
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-3">
                <div className="bg-gradient-to-r from-youthshield-600 to-youthshield-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(numHours * 20, 100)}%` }} />
              </div>
              {gap.nearestCenter && (
                <div className="text-xs text-slate-400 mb-2 space-y-0.5">
                  <p><span className="text-slate-500">Nearest:</span> <span className="text-slate-300">{gap.nearestCenter}</span></p>
                  {gap.nearestCenterDistance && <p><span className="text-slate-500">Distance:</span> {gap.nearestCenterDistance}</p>}
                  {gap.nearestCenterCloses && <p><span className="text-slate-500">Closes:</span> <span className="text-amber-400">{gap.nearestCenterCloses}</span></p>}
                </div>
              )}
              {gap.recommendation && (
                <p className="text-xs text-youthshield-300/80 mt-2 pt-2 border-t border-slate-700/50 italic">
                  {gap.recommendation}
                </p>
              )}
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
