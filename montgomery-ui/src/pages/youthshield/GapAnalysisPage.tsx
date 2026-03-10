import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Search, MapPin, AlertTriangle, Clock, Building2, School, TreePine,
  BookOpen, Baby, ShieldAlert, Lightbulb, ChevronRight, Users, MapPinned,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeH3, friendlyZone, isH3Hex } from '@/components/shared/AdaptiveRenderer';

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#a855f7',
  low: '#10b981',
};

const RISK_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  medium: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function GapAnalysisPage() {
  const [district, setDistrict] = useState('');
  const { data, loading, error, refetch } = useFetch(
    () => youthshield.gapAnalysis(district ? { district: Number(district) } : {}),
    [district],
  );

  if (loading) return <LoadingScreen message="Analyzing service gaps..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  const gaps: any[] = raw?.gapZones ?? raw?.gap_zones ?? [];
  const stats = raw?.summaryStats ?? raw?.summary ?? {};
  const recommendations: any[] = raw?.recommendations ?? [];
  const coverageNote: string = raw?.districtCoverageNote ?? '';

  /* ── Derived stats ── */
  const totalGapZones = stats.totalGapZonesIdentified ?? gaps.length;
  const criticalCount = stats.criticalGapZones ?? gaps.filter((g: any) => g.riskLevel === 'critical').length;
  const highCount = stats.highGapZones ?? gaps.filter((g: any) => g.riskLevel === 'high').length;
  const mediumCount = stats.mediumGapZones ?? gaps.filter((g: any) => g.riskLevel === 'medium').length;

  const closingAt5PM: string[] = stats.communityCentersClosingAt5PM ?? [];
  const closingAt6PM: string[] = stats.communityCentersClosingAt6PM ?? [];
  const openPast7PM: string[] = stats.communityCentersOpenPast7PM ?? [];
  const daylightHours: string[] = stats.communityCentersWithDaylightHours ?? [];

  /* ── Chart data (risk score by zone) ── */
  const chartData = gaps.map((g: any, i: number) => ({
    label: g.h3Index ? `Zone ${String.fromCharCode(65 + (i % 26))}` : (g.zone ?? `Zone ${i + 1}`),
    riskScore: g.riskScore ?? 0,
    gapScore: g.gapScore ?? 0,
    riskLevel: g.riskLevel ?? 'medium',
    h3Index: g.h3Index ?? '',
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Service Gap Analysis"
        subtitle="Identifying underserved areas for youth program expansion"
        accentColor="bg-youthshield-500"
        icon={<Search className="w-6 h-6" />}
      >
        <select value={district} onChange={e => setDistrict(e.target.value)} className="input-field w-44 text-sm">
          <option value="">All Districts</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
        </select>
      </ModuleHeader>

      {/* ── Top-level KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Gap Zones" value={totalGapZones} icon={<MapPin className="w-4 h-4" />} color="text-youthshield-400" />
        <StatCard label="Critical Zones" value={criticalCount} icon={<ShieldAlert className="w-4 h-4" />} color="text-red-400" />
        <StatCard label="High Risk Zones" value={highCount} icon={<AlertTriangle className="w-4 h-4" />} color="text-amber-400" />
        <StatCard label="Medium Risk Zones" value={mediumCount} icon={<MapPinned className="w-4 h-4" />} color="text-purple-400" />
      </div>

      {/* ── Facility Summary Stats ── */}
      {(stats.totalSchools || stats.totalCommunityCenters || stats.totalParks) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.totalSchools != null && (
            <MiniStat icon={<School className="w-4 h-4" />} label="Schools" value={stats.totalSchools} color="text-blue-400" />
          )}
          {stats.totalCommunityCenters != null && (
            <MiniStat icon={<Building2 className="w-4 h-4" />} label="Community Centers" value={stats.totalCommunityCenters} color="text-youthshield-400" />
          )}
          {stats.totalParks != null && (
            <MiniStat icon={<TreePine className="w-4 h-4" />} label="Parks" value={stats.totalParks} color="text-emerald-400" />
          )}
          {stats.totalLibraries != null && (
            <MiniStat icon={<BookOpen className="w-4 h-4" />} label="Libraries" value={stats.totalLibraries} color="text-amber-400" />
          )}
          {stats.totalDaycares != null && (
            <MiniStat icon={<Baby className="w-4 h-4" />} label="Daycares" value={stats.totalDaycares} color="text-pink-400" />
          )}
          {closingAt5PM.length > 0 && (
            <MiniStat icon={<Clock className="w-4 h-4" />} label="Close at 5 PM" value={closingAt5PM.length} color="text-red-400" />
          )}
        </div>
      )}

      {/* ── Risk Score Chart ── */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Risk Score by Gap Zone</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                formatter={(v: any, name: string) => [v, name === 'riskScore' ? 'Risk Score' : 'Gap Score']}
                labelFormatter={(label: string, payload: any[]) => {
                  const d = payload?.[0]?.payload;
                  return d?.h3Index ? `${label} (District ${d.district ?? '?'})` : label;
                }}
              />
              <Bar dataKey="riskScore" name="Risk Score" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={RISK_COLORS[d.riskLevel] ?? '#a855f7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Gap Zone Cards ── */}
      {gaps.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gap Zones Detail</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {gaps.map((gap: any, idx: number) => {
              const zoneName = `Zone ${String.fromCharCode(65 + (idx % 26))}-${Math.floor(idx / 26) + 1}`;
              const level = gap.riskLevel ?? 'medium';
              const riskPct = Math.min(gap.riskScore ?? 0, 100);
              return (
                <div key={gap.h3Index || idx} className="glass-card p-5 hover:border-youthshield-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{zoneName}</span>
                      {gap.district && <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">District {gap.district}</p>}
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border', RISK_BADGE[level] ?? RISK_BADGE.medium)}>
                      {level}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Risk Score</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{gap.riskScore ?? '—'}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${riskPct}%`, backgroundColor: RISK_COLORS[level] ?? '#a855f7' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Gap Score</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{gap.gapScore ?? '—'}/100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Community Center Hours Breakdown ── */}
      {(closingAt5PM.length > 0 || closingAt6PM.length > 0 || openPast7PM.length > 0 || daylightHours.length > 0) && (
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Community Center Hours Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {closingAt5PM.length > 0 && (
              <FacilityList
                title="Closing at 5 PM"
                subtitle="Critical coverage gap during danger window"
                items={closingAt5PM}
                accent="red"
              />
            )}
            {closingAt6PM.length > 0 && (
              <FacilityList
                title="Closing at 6 PM"
                subtitle="Partial coverage gap"
                items={closingAt6PM}
                accent="amber"
              />
            )}
            {openPast7PM.length > 0 && (
              <FacilityList
                title="Open Past 7 PM"
                subtitle="Good evening coverage"
                items={openPast7PM}
                accent="emerald"
              />
            )}
            {daylightHours.length > 0 && (
              <FacilityList
                title="Daylight Hours Only"
                subtitle="No evening coverage"
                items={daylightHours}
                accent="purple"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-youthshield-400" /> AI Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((r: any, i: number) => (
              <div key={i} className="p-4 bg-youthshield-500/5 rounded-xl border border-youthshield-500/10">
                <div className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-youthshield-500/20 flex items-center justify-center text-xs font-bold text-youthshield-400 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {r.interventionType && (
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{r.interventionType}</h4>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {typeof r === 'string' ? r : (r.description ?? r.text ?? r.recommendation ?? r.action ?? JSON.stringify(r))}
                    </p>
                    {/* Target facilities/zones/partners */}
                    {r.targetFacilities && r.targetFacilities.length > 0 && (
                      <TargetList label="Target Facilities" items={r.targetFacilities} icon={<Building2 className="w-3 h-3" />} />
                    )}
                    {r.targetZones && r.targetZones.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Target Zones ({r.targetZones.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {r.targetZones.slice(0, 8).map((z: string, j: number) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                              {isH3Hex(z) ? friendlyZone(z) : z}
                            </span>
                          ))}
                          {r.targetZones.length > 8 && (
                            <span className="text-[10px] text-slate-500">+{r.targetZones.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    {r.targetPartners && r.targetPartners.length > 0 && (
                      <TargetList label="Target Partners" items={r.targetPartners} icon={<Users className="w-3 h-3" />} />
                    )}
                    {r.targetSystem && (
                      <p className="mt-2 text-xs text-youthshield-400 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> {r.targetSystem}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Coverage Note ── */}
      {coverageNote && (
        <div className="glass-card p-4 border-l-4 border-l-slate-500 bg-slate-500/5">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">{coverageNote}</p>
        </div>
      )}

      {!gaps.length && !recommendations.length && (
        <div className="glass-card p-12 text-center">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No gap analysis data available</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className={cn('p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60', color)}>{icon}</div>
      <div>
        <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function FacilityList({ title, subtitle, items, accent }: { title: string; subtitle: string; items: string[]; accent: string }) {
  return (
    <div className={cn('p-4 rounded-xl border', `bg-${accent}-500/5 border-${accent}-500/15`)}>
      <h4 className={cn('text-sm font-semibold mb-0.5', `text-${accent}-500`)}>{title} ({items.length})</h4>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{subtitle}</p>
      <ul className="space-y-1">
        {items.map((name, i) => (
          <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TargetList({ label, items, icon }: { label: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item, j) => (
          <li key={j} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
