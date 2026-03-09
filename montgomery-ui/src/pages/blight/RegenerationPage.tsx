import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { blight } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, RefreshCw, DollarSign, MapPin, Building, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const MONTGOMERY_NEIGHBORHOODS = [
  'Cloverdale', 'Midtown', 'Capitol Heights', 'Centennial Hill', 'West Montgomery',
  'Chisholm', 'Gibbs Village', 'Dalraida', 'Eastdale', 'Normandale',
  'Woodmere', 'Pike Road', 'Prattville Junction', 'Old Cloverdale', 'Garden District',
  'Cottage Hill', 'Highland Park', 'McGehee', 'Arrowhead', 'Halcyon',
];

/** Parse a cost-range string like "$5,000,000 - $8,000,000" and return the midpoint */
function parseCostMid(range: string): number {
  const nums = range.replace(/[^0-9.,-]/g, '').split(/[-–]/).map(s => {
    const n = parseFloat(s.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  });
  if (nums.length >= 2) return (nums[0] + nums[1]) / 2;
  return nums[0] || 0;
}

function fmtDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function blightColor(score: number) {
  if (score >= 80) return 'text-red-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-emerald-400';
}

function catalyticBadge(text: string) {
  const t = text.toUpperCase();
  if (t.startsWith('HIGH')) return { label: 'HIGH', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (t.startsWith('MEDIUM-HIGH')) return { label: 'MED-HIGH', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  if (t.startsWith('MEDIUM')) return { label: 'MEDIUM', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'LOW', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
}

export default function RegenerationPage() {
  const [form, setForm] = useState({ district: '', neighborhood: '' });
  const [collapsedParcels, setCollapsedParcels] = useState<Set<number>>(new Set());
  const action = useBackgroundAction('Generate Regeneration Blueprint', blight.regeneration);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    action.execute({
      district: form.district || undefined,
      censusTract: form.neighborhood || undefined,
    });
  };

  const raw = action.data as any;
  const parcels: any[] = raw ? (Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [raw]) : [];

  // Compute summary stats from actual parcel data
  const totalAcreage = parcels.reduce((s, p) => s + (p.acreage || 0), 0);
  const avgBlightScore = parcels.length ? Math.round(parcels.reduce((s, p) => s + (p.blightScore || 0), 0) / parcels.length) : 0;
  const totalRecs = parcels.reduce((s, p) => s + (Array.isArray(p.recommendations) ? p.recommendations.length : 0), 0);
  const estInvestment = parcels.reduce((s, p) => {
    if (!Array.isArray(p.recommendations)) return s;
    return s + p.recommendations.reduce((rs: number, r: any) => rs + parseCostMid(r.costRange || ''), 0);
  }, 0);

  // Chart data: blight score per parcel
  const chartData = parcels.map(p => ({
    name: (p.address || p.parcelNum || '').slice(0, 20),
    blightScore: p.blightScore || 0,
    acreage: +(p.acreage || 0).toFixed(2),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Regeneration Blueprint" subtitle="AI-generated neighborhood transformation plans" accentColor="bg-blight-500" icon={<Sparkles className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5 h-fit">
          <h3 className="text-sm font-semibold text-slate-300">Generate Blueprint</h3>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">District</label>
            <select
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              className="input-field w-full text-sm"
            >
              <option value="">All Districts</option>
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <option key={d} value={String(d)}>District {d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Neighborhood (optional)</label>
            <select
              value={form.neighborhood}
              onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
              className="input-field w-full text-sm"
            >
              <option value="">Any neighborhood</option>
              {MONTGOMERY_NEIGHBORHOODS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">Narrow results to a specific neighborhood</p>
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Blueprint
          </button>

          {action.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{action.error}</p>
            </div>
          )}
        </form>

        <div className="lg:col-span-2 space-y-6">
          {parcels.length > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Properties" value={parcels.length} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
                <StatCard label="Total Acreage" value={totalAcreage.toFixed(1)} icon={<MapPin className="w-4 h-4" />} color="text-emerald-400" />
                <StatCard label="Avg Blight Score" value={avgBlightScore} icon={<TrendingUp className="w-4 h-4" />} color="text-red-400" />
                <StatCard label="Est. Investment" value={fmtDollars(estInvestment)} icon={<DollarSign className="w-4 h-4" />} color="text-compass-400" />
              </div>

              {/* Blight Score Chart */}
              {chartData.length > 1 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Blight Score by Parcel</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                      <Bar dataKey="blightScore" fill="#ef4444" radius={[4, 4, 0, 0]} name="Blight Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Parcel Cards */}
              <div className="space-y-4">
                {parcels.map((p: any, idx: number) => {
                  const isExpanded = !collapsedParcels.has(idx);
                  const badge = catalyticBadge(p.catalyticPotential || '');
                  return (
                    <div key={p.parcelNum || idx} className="glass-card overflow-hidden">
                      {/* Parcel Header */}
                      <button
                        onClick={() => setCollapsedParcels(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; })}
                        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blight-500/20 flex items-center justify-center">
                            <span className={`text-lg font-bold ${blightColor(p.blightScore || 0)}`}>{p.blightScore}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-200 truncate">{p.address || p.parcelNum}</h4>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-slate-500">Parcel {p.parcelNum}</span>
                              <span className="text-xs text-slate-500">{p.acreage?.toFixed(2)} ac</span>
                              <span className="text-xs text-slate-500">Zone: {p.zoning}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-500">{Array.isArray(p.recommendations) ? p.recommendations.length : 0} options</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30">
                          {/* Market Momentum */}
                          {p.marketMomentumImpact && (
                            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border-l-3 border-l-blight-500">
                              <h5 className="text-xs font-semibold text-blight-400 uppercase tracking-wider mb-1">Market Momentum Impact</h5>
                              <Markdown size="sm">{p.marketMomentumImpact}</Markdown>
                            </div>
                          )}

                          {/* Recommendations */}
                          {Array.isArray(p.recommendations) && p.recommendations.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-300 mb-3">Regeneration Options</h5>
                              <div className="grid gap-3">
                                {p.recommendations.map((rec: any, ri: number) => (
                                  <div key={ri} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <h6 className="text-sm font-medium text-slate-200">{rec.option || rec.title || rec.name || `Option ${ri + 1}`}</h6>
                                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                          {rec.costRange && <span className="text-xs text-compass-400 font-medium">💰 {rec.costRange}</span>}
                                          {rec.timeframe && <span className="text-xs text-slate-400">⏱ {rec.timeframe}</span>}
                                        </div>
                                      </div>
                                      {rec.viability != null && (
                                        <div className="flex-shrink-0 text-center">
                                          <div className={`text-lg font-bold ${rec.viability >= 80 ? 'text-emerald-400' : rec.viability >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {rec.viability}%
                                          </div>
                                          <div className="text-[9px] text-slate-500 uppercase">Viability</div>
                                        </div>
                                      )}
                                    </div>
                                    {/* Viability bar */}
                                    {rec.viability != null && (
                                      <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${rec.viability >= 80 ? 'bg-emerald-500' : rec.viability >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                          style={{ width: `${rec.viability}%` }}
                                        />
                                      </div>
                                    )}
                                    {rec.justification && (
                                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{rec.justification}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Catalytic Potential */}
                          {p.catalyticPotential && (
                            <div className="p-3 bg-slate-800/40 rounded-lg">
                              <h5 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Catalytic Potential</h5>
                              <p className="text-sm text-slate-400 leading-relaxed">{p.catalyticPotential}</p>
                            </div>
                          )}

                          {/* Nearby Context */}
                          {p.nearbyContext && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {p.nearbyContext.schoolsInCity != null && (
                                <div className="p-2 bg-slate-800/30 rounded-lg text-center">
                                  <div className="text-lg font-bold text-blue-400">{p.nearbyContext.schoolsInCity}</div>
                                  <div className="text-xs text-slate-500">Schools in City</div>
                                </div>
                              )}
                              {p.nearbyContext.communityCentersInCity != null && (
                                <div className="p-2 bg-slate-800/30 rounded-lg text-center">
                                  <div className="text-lg font-bold text-purple-400">{p.nearbyContext.communityCentersInCity}</div>
                                  <div className="text-xs text-slate-500">Community Centers</div>
                                </div>
                              )}
                              {Array.isArray(p.nearbyContext.cityWideTopBlightAreas) && (
                                <div className="p-2 bg-slate-800/30 rounded-lg text-center">
                                  <div className="text-lg font-bold text-red-400">{p.nearbyContext.cityWideTopBlightAreas.length}</div>
                                  <div className="text-xs text-slate-500">Top Blight Areas</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-blight-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-blight-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Generate a Blueprint</h3>
              <p className="text-sm text-slate-500 max-w-sm">Select a district to get an AI-powered regeneration plan with investment estimates, phases, and projected community impact.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
