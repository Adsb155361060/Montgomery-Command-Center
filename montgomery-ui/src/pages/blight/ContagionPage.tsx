import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { blight } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bug, RefreshCw, AlertTriangle, Flame, MapPin, TrendingUp, Zap, Leaf, ChevronDown, ChevronUp } from 'lucide-react';

const MONTGOMERY_DISTRICTS = [
  { value: '', label: 'Citywide Analysis' },
  { value: '1', label: 'District 1 — Cloverdale / Midtown' },
  { value: '2', label: 'District 2 — Capitol Heights / Centennial Hill' },
  { value: '3', label: 'District 3 — West Montgomery / Chisholm' },
  { value: '4', label: 'District 4 — Gibbs Village / Tulane Court' },
  { value: '5', label: 'District 5 — Dalraida / Eastdale' },
  { value: '6', label: 'District 6 — Normandale / Woodmere' },
  { value: '7', label: 'District 7 — Pike Road / Snowdoun' },
  { value: '8', label: 'District 8 — Prattville Junction / Mitylene' },
  { value: '9', label: 'District 9 — Eastern Boulevard / AUM' },
];

/* ─── Resilient field helpers ─── */

/** Try multiple keys on an object and return the first non-null/undefined value */
function pick(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Convert camelCase/snake_case key to readable Title Case */
function labelify(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Render all primitive fields of an object as key-value, excluding already-handled keys */
function renderAllFields(obj: any, excludeKeys: Set<string>) {
  if (!obj || typeof obj !== 'object') return null;
  const entries = Object.entries(obj).filter(
    ([k, v]) => !excludeKeys.has(k) && v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1.5 mt-2">
      {entries.map(([k, v]) => (
        <div key={k} className="text-sm">
          <span className="text-slate-500 font-medium">{labelify(k)}: </span>
          <span className="text-slate-300">
            {typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

import { SmartValue } from '@/components/shared/AdaptiveRenderer';

/* ─── Color helpers ─── */

function urgencyColor(u: string) {
  const t = (u || '').toLowerCase();
  if (t.includes('critical') || t.includes('immediate')) return 'text-red-400 bg-red-500/10 border-red-500/20';
  if (t.includes('high')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
}

function riskColor(s: string) {
  const t = (s || '').toLowerCase();
  if (t.includes('critical') || t.includes('very high') || t.includes('severe')) return 'text-red-400';
  if (t.includes('high')) return 'text-amber-400';
  if (t.includes('medium') || t.includes('moderate')) return 'text-yellow-400';
  return 'text-emerald-400';
}

/* ─── Component ─── */

export default function ContagionPage() {
  const [form, setForm] = useState({ district: '', months: 12 });
  const [collapsedRecs, setCollapsedRecs] = useState<Set<number>>(new Set());
  const action = useBackgroundAction('Run Contagion Model', blight.contagion);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    action.execute({
      district: form.district || undefined,
      months: form.months,
    });
  };

  const d = action.data as any;

  /* ── Extract arrays (try top-level and nested .data) ── */
  const rawZones: any[] = d?.contagionZones || d?.contagion_zones || d?.data?.contagionZones || d?.data?.contagion_zones || d?.zones || d?.data?.zones || [];
  const rawHotspots: any[] = d?.hotspots || d?.data?.hotspots || d?.hot_spots || d?.data?.hot_spots || [];
  const rawSpillovers: any[] = d?.positiveSpillover || d?.positive_spillover || d?.data?.positiveSpillover || d?.data?.positive_spillover || d?.positiveSpillovers || d?.positive_spillovers || d?.data?.positiveSpillovers || d?.spillover || [];
  const recs: any[] = (() => {
    const raw = d?.recommendations || d?.data?.recommendations || d?.containment_recommendations || d?.containmentRecommendations || [];
    return Array.isArray(raw) ? raw : [raw];
  })();

  /* ── Normalize zone objects with resilient field extraction ── */
  const zones = rawZones.map((z: any) => ({
    label: pick(z, 'address', 'parcel', 'zone', 'zoneName', 'zone_name', 'name', 'location', 'area', 'neighborhood', 'id', 'parcelNum', 'parcel_num', 'parcelId', 'parcel_id') || '',
    subLabel: pick(z, 'parcel', 'parcelNum', 'parcel_num', 'parcelId', 'parcel_id', 'id'),
    score: Number(pick(z, 'contagionScore', 'contagion_score', 'score', 'contagion', 'riskScore', 'risk_score', 'blightScore', 'blight_score', 'severity')) || 0,
    affected: Number(pick(z, 'affectedNeighbors', 'affected_neighbors', 'affected', 'neighbors', 'neighborsAffected', 'neighbors_affected', 'affectedParcels', 'affected_parcels', 'impactedNeighbors', 'impacted_neighbors', 'impacted')) || 0,
    spreadRisk: String(pick(z, 'spreadRisk', 'spread_risk', 'risk', 'riskLevel', 'risk_level', 'spreadLevel', 'spread_level', 'contagionRisk', 'contagion_risk', 'threat') || ''),
    remediation: String(pick(z, 'remediationImpact', 'remediation_impact', 'remediation', 'impact', 'remediationEffect', 'remediation_effect', 'intervention', 'recommendation', 'effect') || ''),
    priority: Number(pick(z, 'priority', 'priorityRank', 'priority_rank', 'rank', 'order')) || 0,
    raw: z,
  }));

  /* ── Normalize hotspot objects ── */
  const hotspots = rawHotspots.map((h: any) => ({
    area: pick(h, 'area', 'name', 'location', 'zone', 'neighborhood', 'address', 'zoneName', 'zone_name') || '',
    density: pick(h, 'blightDensity', 'blight_density', 'density', 'score', 'blightScore', 'blight_score', 'severity', 'count'),
    spread: pick(h, 'spreadDirection', 'spread_direction', 'spread', 'direction', 'trend', 'spreadTrend', 'spread_trend'),
    urgency: String(pick(h, 'interventionUrgency', 'intervention_urgency', 'urgency', 'priority', 'riskLevel', 'risk_level', 'risk', 'level') || ''),
    raw: h,
  }));

  /* ── Normalize spillover objects ── */
  const spillovers = rawSpillovers.map((s: any) => ({
    area: pick(s, 'area', 'name', 'location', 'zone', 'neighborhood') || '',
    parcels: pick(s, 'remediatedParcels', 'remediated_parcels', 'parcels', 'count', 'properties'),
    improvement: String(pick(s, 'neighborhoodImprovement', 'neighborhood_improvement', 'improvement', 'impact', 'description', 'effect', 'result') || ''),
    raw: s,
  }));

  /* ── Compute stats from normalized data ── */
  const totalZones = zones.length;
  const totalHotspots = hotspots.length;
  const maxContagion = zones.length ? Math.max(...zones.map(z => z.score)) : 0;
  const totalAffected = zones.reduce((s, z) => s + z.affected, 0);

  /* ── Chart data ── */
  const chartData = zones.map((z, i) => ({
    name: (z.label || z.subLabel || `Zone ${i + 1}`).slice(0, 18),
    contagion: z.score,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Blight Contagion Model" subtitle="Predict how urban blight spreads to neighboring zones over time" accentColor="bg-blight-500" icon={<Bug className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5 h-fit">
          <h3 className="text-sm font-semibold text-slate-300">Configure Model</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Target Area</label>
            <select
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              className="input-field w-full text-sm"
            >
              {MONTGOMERY_DISTRICTS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">Select a district or run citywide analysis</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Projection Period</label>
            <div className="flex items-center gap-3">
              <input type="range" min={3} max={36} step={3} value={form.months} onChange={e => setForm(f => ({ ...f, months: Number(e.target.value) }))} className="flex-1 accent-blight-500" />
              <span className="text-sm font-mono text-blight-400 w-16 text-right">{form.months} mo</span>
            </div>
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
            Run Contagion Model
          </button>

          {action.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{action.error}</p>
            </div>
          )}
        </form>

        {/* ── Results ── */}
        <div className="lg:col-span-2 space-y-6">
          {d ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Contagion Zones" value={totalZones} icon={<MapPin className="w-4 h-4" />} color="text-red-400" />
                <StatCard label="Active Hotspots" value={totalHotspots} icon={<Flame className="w-4 h-4" />} color="text-amber-400" />
                <StatCard label="Max Contagion" value={`${maxContagion}/10`} icon={<TrendingUp className="w-4 h-4" />} color="text-blight-400" />
                <StatCard label="Neighbors At Risk" value={totalAffected} icon={<AlertTriangle className="w-4 h-4" />} color="text-youthshield-400" />
              </div>

              {/* Key Findings */}
              {(zones.length > 0 || hotspots.length > 0) && (
                <div className="glass-card p-5 border-l-4 border-l-red-500 bg-red-500/5">
                  <h3 className="text-sm font-semibold text-red-300 mb-3">Contagion Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {zones.length > 0 && zones[0].label && (
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Highest Risk Zone</div>
                        <div className="text-sm font-bold text-red-400">{zones.sort((a, b) => b.score - a.score)[0].label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Score: {zones.sort((a, b) => b.score - a.score)[0].score}/10</div>
                      </div>
                    )}
                    {hotspots.length > 0 && (
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Most Urgent Hotspot</div>
                        <div className="text-sm font-bold text-amber-400">{hotspots[0].area || 'Hotspot 1'}</div>
                        {hotspots[0].urgency && <div className="text-xs text-amber-500 mt-0.5">{hotspots[0].urgency}</div>}
                      </div>
                    )}
                    {spillovers.length > 0 && (
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Positive Spillover</div>
                        <div className="text-sm font-bold text-emerald-400">{spillovers.length} area{spillovers.length > 1 ? 's' : ''}</div>
                        <div className="text-xs text-slate-500 mt-0.5">showing improvement</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contagion Score Chart */}
              {chartData.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Contagion Scores by Zone</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                      <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                      <Bar dataKey="contagion" fill="#ef4444" radius={[4, 4, 0, 0]} name="Contagion Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Contagion Zones Table */}
              {zones.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Contagion Zones</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50 text-slate-400">
                          <th className="text-left py-2 pr-3">#</th>
                          <th className="text-left py-2 pr-3">Parcel / Address</th>
                          <th className="text-center py-2 px-2">Score</th>
                          <th className="text-center py-2 px-2">Affected</th>
                          <th className="text-left py-2 px-2">Spread Risk</th>
                          <th className="text-left py-2">Remediation Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zones.map((z, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="py-2.5 pr-3 text-slate-500 font-medium">{z.priority || i + 1}</td>
                            <td className="py-2.5 pr-3">
                              <div className="text-slate-200 font-medium">{z.label || `Zone ${i + 1}`}</div>
                              {z.subLabel && z.label && z.subLabel !== z.label && (
                                <div className="text-xs text-slate-500">{z.subLabel}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                z.score >= 8 ? 'bg-red-500/20 text-red-400' :
                                z.score >= 5 ? 'bg-amber-500/20 text-amber-400' :
                                'bg-emerald-500/20 text-emerald-400'
                              }`}>{z.score}/10</span>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-300 font-medium">{z.affected || '—'}</td>
                            <td className="py-2.5 px-2">
                              <span className={`font-medium ${riskColor(z.spreadRisk)}`}>{z.spreadRisk || '—'}</span>
                            </td>
                            <td className="py-2.5 text-slate-400 max-w-[220px]">
                              <p className="line-clamp-2" title={z.remediation}>{z.remediation || '—'}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Hotspots */}
              {hotspots.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" /> Active Hotspots
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hotspots.map((h, i) => {
                      const usedKeys = new Set([
                        'area', 'name', 'location', 'zone', 'neighborhood', 'address', 'zoneName',
                        'blightDensity', 'density', 'score', 'blightScore', 'severity', 'count',
                        'spreadDirection', 'spread', 'direction', 'trend', 'spreadTrend',
                        'interventionUrgency', 'urgency', 'priority', 'riskLevel', 'risk', 'level',
                      ]);
                      return (
                        <div key={i} className={`p-4 rounded-xl border ${urgencyColor(h.urgency)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-200">{h.area || `Hotspot ${i + 1}`}</h4>
                            {h.urgency && (
                              <span className="text-xs uppercase font-bold tracking-wider">{h.urgency}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {h.density != null && (
                              <span className="text-slate-400">Density: <strong className="text-slate-200">{h.density}</strong></span>
                            )}
                            {h.spread && (
                              <span className="text-slate-400">Spread: <strong className="text-slate-200">{h.spread}</strong></span>
                            )}
                          </div>
                          {renderAllFields(h.raw, usedKeys)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Positive Spillover */}
              {spillovers.length > 0 && (
                <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                  <h3 className="text-sm font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                    <Leaf className="w-4 h-4" /> Positive Spillover Examples
                  </h3>
                  <div className="space-y-3">
                    {spillovers.map((s, i) => {
                      const usedKeys = new Set([
                        'area', 'name', 'location', 'zone', 'neighborhood',
                        'remediatedParcels', 'parcels', 'count', 'properties',
                        'neighborhoodImprovement', 'improvement', 'impact', 'description', 'effect', 'result',
                      ]);
                      return (
                        <div key={i} className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-200">{s.area || `Area ${i + 1}`}</h4>
                            {s.parcels != null && (
                              <span className="text-xs text-emerald-400 font-mono">{s.parcels} parcels remediated</span>
                            )}
                          </div>
                          {s.improvement && <p className="text-sm text-slate-400 mt-1">{s.improvement}</p>}
                          {renderAllFields(s.raw, usedKeys)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Containment Recommendations */}
              {recs.length > 0 && (
                <div className="glass-card p-6 border-l-4 border-l-blight-500">
                  <h3 className="text-sm font-semibold text-blight-300 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Containment Recommendations
                  </h3>
                  <div className="space-y-3">
                    {recs.map((r: any, i: number) => {
                      /* ── String recommendation ── */
                      if (typeof r === 'string') {
                        return (
                          <div key={i} className="flex gap-3 items-start p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                            <span className="w-6 h-6 rounded-full bg-blight-500/20 flex items-center justify-center text-xs font-bold text-blight-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                            <Markdown size="sm">{r}</Markdown>
                          </div>
                        );
                      }

                      /* ── Rich object recommendation ── */
                      const isExpanded = !collapsedRecs.has(i);

                      // Resilient field extraction
                      const severity = pick(r, 'blightSeverity', 'severity', 'score', 'riskScore', 'risk') || 0;
                      const parcelLabel = pick(r, 'parcelId', 'parcel', 'parcelNum', 'address', 'zone', 'area', 'name', 'location', 'title');
                      const priority = pick(r, 'priorityRank', 'priority', 'rank') || i + 1;
                      const reuseOptionRaw = pick(r, 'reuseOption', 'reuse', 'option') || {};
                      const isReuseObj = typeof reuseOptionRaw === 'object' && reuseOptionRaw !== null;
                      const reuseType = isReuseObj
                        ? pick(reuseOptionRaw, 'type', 'name', 'title', 'option', 'strategy')
                        : (typeof reuseOptionRaw === 'string' ? reuseOptionRaw : null);
                      const viability = isReuseObj
                        ? pick(reuseOptionRaw, 'viabilityPercentage', 'viability', 'score', 'confidence')
                        : null;
                      const justification = isReuseObj
                        ? pick(reuseOptionRaw, 'justification', 'description', 'rationale', 'reasoning', 'explanation')
                        : null;
                      const momentum = pick(r, 'marketMomentumImpact', 'marketImpact', 'momentum');
                      const cascade = pick(r, 'cascadeEffect', 'cascade', 'spillover', 'spilloverEffect');

                      // Keys we already handle (so renderAllFields skips them)
                      const handledKeys = new Set([
                        'priorityRank', 'priority', 'rank',
                        'parcelId', 'parcel', 'parcelNum', 'address', 'zone', 'area', 'name', 'location', 'title',
                        'blightSeverity', 'severity', 'score', 'riskScore', 'risk',
                        'reuseOption', 'reuse', 'option',
                        'marketMomentumImpact', 'marketImpact', 'momentum',
                        'cascadeEffect', 'cascade', 'spillover', 'spilloverEffect',
                      ]);

                      return (
                        <div key={i} className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden">
                          {/* Header — always visible */}
                          <button
                            onClick={() => setCollapsedRecs(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; })}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                (typeof severity === 'number' && severity >= 80) ? 'bg-red-500/20 text-red-400' :
                                (typeof severity === 'number' && severity >= 50) ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blight-500/20 text-blight-400'
                              }`}>{priority}</div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-slate-200">
                                  {parcelLabel || `Recommendation ${priority}`}
                                </h4>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {typeof severity === 'number' && severity > 0 && (
                                    <span className="text-xs text-slate-500">
                                      Severity: <strong className={severity >= 80 ? 'text-red-400' : severity >= 50 ? 'text-amber-400' : 'text-emerald-400'}>{severity}</strong>
                                    </span>
                                  )}
                                  {reuseType && <span className="text-xs text-compass-400">{reuseType}</span>}
                                  {viability != null && (
                                    <span className={`text-xs font-bold ${Number(viability) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {viability}% viable
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <span className="text-xs text-slate-600">{isExpanded ? 'collapse' : 'details'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30 pt-3">
                              {/* Market Momentum Impact */}
                              {momentum && (
                                <div className="p-3 bg-slate-800/40 rounded-lg border-l-2 border-l-amber-500">
                                  <h5 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Market Momentum Impact</h5>
                                  <p className="text-sm text-slate-300 leading-relaxed">{String(momentum)}</p>
                                </div>
                              )}

                              {/* Reuse Option Detail */}
                              {reuseType && (
                                <div className="p-3 bg-slate-800/40 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-semibold text-compass-400 uppercase tracking-wider">Reuse Option</h5>
                                    {viability != null && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${Number(viability) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${viability}%` }}
                                          />
                                        </div>
                                        <span className={`text-xs font-bold ${Number(viability) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                          {viability}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-slate-200 mb-1">{reuseType}</p>
                                  {justification && (
                                    <p className="text-sm text-slate-400 leading-relaxed">{justification}</p>
                                  )}
                                </div>
                              )}

                              {/* Cascade Effect */}
                              {cascade && (
                                <div className="p-3 bg-blight-500/5 rounded-lg border border-blight-500/10">
                                  <h5 className="text-xs font-semibold text-blight-400 uppercase tracking-wider mb-1.5">Cascade Effect</h5>
                                  <p className="text-sm text-slate-300 leading-relaxed">{String(cascade)}</p>
                                </div>
                              )}

                              {/* Fallback: render ALL other fields not explicitly handled */}
                              {renderAllFields(r, handledKeys)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Empty state ── */
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-blight-500/10 flex items-center justify-center mb-4">
                <Bug className="w-10 h-10 text-blight-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Contagion Modeling</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Enter a blighted zone and projection period to model how blight may spread to neighboring areas without intervention.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
