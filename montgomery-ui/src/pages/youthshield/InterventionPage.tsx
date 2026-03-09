import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { youthshield } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { AdaptiveRenderer, pick, labelify, SmartValue, smartText } from '@/components/shared/AdaptiveRenderer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Zap, RefreshCw, DollarSign, Users, TrendingDown, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const MONTGOMERY_NEIGHBORHOODS = [
  { value: '', label: 'All High-Risk Zones (Citywide)' },
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

export default function InterventionPage() {
  const [form, setForm] = useState({ district: '', interventionType: 'mentorship' });
  const action = useBackgroundAction('Run Intervention Model', youthshield.intervention);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    action.execute({
      zoneH3: form.district ? `district_${form.district}` : undefined,
      interventionType: form.interventionType,
    });
  };

  const interventionTypes = [
    { value: 'mentorship', label: 'Mentorship Program', icon: Users, desc: 'Pair at-risk youth with trained mentors' },
    { value: 'after_school', label: 'After-School Programs', icon: Clock, desc: 'Extended learning and activity programs' },
    { value: 'job_training', label: 'Job Training', icon: DollarSign, desc: 'Vocational training and employment pathways' },
    { value: 'community_policing', label: 'Community Policing', icon: Shield, desc: 'Increased community engagement patrols' },
    { value: 'crisis_intervention', label: 'Crisis Intervention', icon: Zap, desc: 'Immediate response teams for at-risk situations' },
  ];

  const raw = action.data as any;
  // Unwrap: AI might return data at various nesting levels
  const d = raw?.interventionPlan || raw?.plan || raw?.data?.interventionPlan || raw?.data || raw;
  const hasData = d && typeof d === 'object' && Object.keys(d).length > 0;

  /* ─── Resilient field extraction ─── */

  // Implementation steps — try many field names
  const steps: any[] =
    pick(d, 'implementationSteps', 'steps', 'implementationPlan', 'plan', 'phases', 'actionItems', 'actions', 'milestones') || [];
  const stepsArr = Array.isArray(steps) ? steps : [];

  // Interventions array (from API route type)
  const interventions: any[] = pick(d, 'interventions', 'programs', 'recommendations', 'strategies') || [];
  const interventionsArr = Array.isArray(interventions) ? interventions : [];

  // ─── Derived stats from actual data ───
  // The AI returns interventions[], coverageGaps[], coordinationNotes — stats are derived from those
  const estReduction = Number(pick(d, 'estimatedReduction', 'reductionPercent', 'reduction', 'estimatedImpact', 'impactPercent', 'crimeReduction')) || 0;
  const annualCost = Number(pick(d, 'annualCost', 'cost', 'totalCost', 'estimatedCost', 'budget', 'annualBudget')) || 0;
  const youthReached = Number(pick(d, 'youthReached', 'estimatedYouth', 'participants', 'targetYouth', 'youthServed', 'totalParticipants')) || 0;
  const timelineVal = pick(d, 'timelineMonths', 'timeline', 'duration', 'implementationTimeline', 'months');

  // Compute from interventions array when top-level fields are absent
  const highUrgencyCount = interventionsArr.filter((it: any) => {
    const u = String(pick(it, 'urgency', 'priority', 'level') || '').toLowerCase();
    return u.includes('high') || u.includes('critical') || u.includes('urgent') || u.includes('immediate');
  }).length;
  const uniqueProviders = [...new Set(interventionsArr.map((it: any) =>
    String(pick(it, 'provider', 'organization', 'agency', 'partner') || '')).filter(Boolean))];

  // Stat values: use top-level fields if present, otherwise derive from interventions array
  const statInterventions = interventionsArr.length || stepsArr.length;
  const statCost = annualCost > 0 ? formatCurrency(annualCost)
    : interventionsArr.length > 0 ? `${interventionsArr.length} Programs` : '—';
  const statYouth = youthReached > 0 ? youthReached
    : uniqueProviders.length > 0 ? `${uniqueProviders.length} Providers` : '—';
  const statTimeline = typeof timelineVal === 'number' ? `${timelineVal}mo`
    : timelineVal ? String(timelineVal)
    : highUrgencyCount > 0 ? `${highUrgencyCount} High Priority` : '—';

  // Cost breakdown
  const breakdown = pick(d, 'breakdown', 'costBreakdown', 'budgetBreakdown', 'costs');

  // Justification / narrative / coverage gaps / coordination
  const justification = pick(d, 'justification', 'narrative', 'rationale', 'summary', 'analysis', 'explanation');
  const coverageGaps: any[] = (() => {
    const g = pick(d, 'coverageGaps', 'gaps', 'riskAreas', 'challenges');
    return Array.isArray(g) ? g : [];
  })();
  const coordination = pick(d, 'coordinationNotes', 'coordination', 'partnerships', 'notes');

  // Keys we handle explicitly
  const handledKeys = new Set([
    'estimatedReduction', 'reductionPercent', 'reduction', 'estimatedImpact', 'impactPercent', 'crimeReduction',
    'annualCost', 'cost', 'totalCost', 'estimatedCost', 'budget', 'annualBudget',
    'youthReached', 'estimatedYouth', 'participants', 'targetYouth', 'youthServed', 'totalParticipants',
    'timelineMonths', 'timeline', 'duration', 'implementationTimeline', 'months',
    'implementationSteps', 'steps', 'implementationPlan', 'plan', 'phases', 'actionItems', 'actions', 'milestones',
    'interventions', 'programs', 'recommendations', 'strategies',
    'breakdown', 'costBreakdown', 'budgetBreakdown', 'costs',
    'justification', 'narrative', 'rationale', 'summary', 'analysis', 'explanation',
    'coverageGaps', 'gaps', 'riskAreas', 'challenges',
    'coordinationNotes', 'coordination', 'partnerships', 'notes',
    'interventionPlan', 'data',
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Intervention Designer" subtitle="Model privacy-preserving youth violence interventions for specific zones" accentColor="bg-youthshield-500" icon={<Shield className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Configure Intervention</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Target Area</label>
            <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="input-field w-full text-sm">
              {MONTGOMERY_NEIGHBORHOODS.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">Select a district or analyze all high-risk zones</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Intervention Type</label>
            <div className="space-y-2">
              {interventionTypes.map(t => {
                const Icon = t.icon;
                return (
                  <label key={t.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.interventionType === t.value ? 'border-youthshield-500/50 bg-youthshield-500/5' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'}`}>
                    <input type="radio" name="type" value={t.value} checked={form.interventionType === t.value} onChange={e => setForm(f => ({ ...f, interventionType: e.target.value }))} className="sr-only" />
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${form.interventionType === t.value ? 'text-youthshield-400' : 'text-slate-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${form.interventionType === t.value ? 'text-youthshield-300' : 'text-slate-300'}`}>{t.label}</p>
                      <p className="text-sm text-slate-500">{t.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Intervention Model
          </button>

          {action.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{action.error}</p>
            </div>
          )}
        </form>

        <div className="lg:col-span-2 space-y-6">
          {hasData ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={estReduction > 0 ? "Est. Reduction" : "Interventions"} value={estReduction > 0 ? `${estReduction}%` : statInterventions || '—'} icon={<TrendingDown className="w-4 h-4" />} color="text-emerald-400" />
                <StatCard label="Annual Cost" value={statCost} icon={<DollarSign className="w-4 h-4" />} color="text-amber-400" />
                <StatCard label={youthReached > 0 ? "Youth Reached" : "Providers"} value={statYouth} icon={<Users className="w-4 h-4" />} color="text-youthshield-400" />
                <StatCard label={highUrgencyCount > 0 && !timelineVal ? "Priority Zones" : "Timeline"} value={statTimeline} icon={<Clock className="w-4 h-4" />} color="text-blight-400" />
              </div>

              {/* Implementation Steps */}
              {stepsArr.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Implementation Plan</h3>
                  <div className="space-y-3">
                    {stepsArr.map((step: any, i: number) => {
                      const stepText = typeof step === 'string' ? step
                        : pick(step, 'description', 'text', 'step', 'action', 'name', 'title') || smartText(step);
                      const stepTimeline = typeof step === 'object' ? pick(step, 'timeline', 'duration', 'timeframe', 'when') : null;
                      const stepCost = typeof step === 'object' ? pick(step, 'cost', 'budget', 'amount') : null;
                      const stepHandled = new Set(['description', 'text', 'step', 'action', 'name', 'title', 'timeline', 'duration', 'timeframe', 'when', 'cost', 'budget', 'amount']);
                      const extraFields = typeof step === 'object' ? Object.entries(step).filter(([k, v]) => !stepHandled.has(k) && v != null && v !== '') : [];
                      return (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-7 h-7 rounded-full bg-youthshield-500/20 flex items-center justify-center text-xs font-bold text-youthshield-400 flex-shrink-0">{i + 1}</div>
                          <div className="flex-1 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                            <p className="text-sm text-slate-300">{stepText}</p>
                            <div className="flex flex-wrap gap-3 mt-1.5">
                              {stepTimeline && <span className="text-xs text-slate-500">⏱ {stepTimeline}</span>}
                              {stepCost && <span className="text-xs text-amber-400">💰 {typeof stepCost === 'number' ? formatCurrency(stepCost) : stepCost}</span>}
                            </div>
                            {extraFields.length > 0 && (
                              <div className="mt-2 space-y-0.5">
                                {extraFields.map(([k, v]) => (
                                  <div key={k} className="text-sm text-slate-500">
                                    <span className="font-medium">{labelify(k)}:</span> <span className="text-slate-400">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interventions list (from API route structure) */}
              {interventionsArr.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Intervention Programs</h3>
                  <div className="space-y-3">
                    {interventionsArr.map((item: any, i: number) => {
                      if (typeof item === 'string') {
                        return (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-youthshield-500/20 flex items-center justify-center text-xs font-bold text-youthshield-400 flex-shrink-0">{i + 1}</span>
                            <Markdown size="sm">{item}</Markdown>
                          </div>
                        );
                      }
                      const title = pick(item, 'name', 'title', 'program', 'type', 'intervention') || `Program ${i + 1}`;
                      const desc = pick(item, 'description', 'text', 'details', 'rationale', 'summary');
                      const target = pick(item, 'targetPopulation', 'target', 'audience', 'participants');
                      const cost = pick(item, 'estimatedCost', 'cost', 'budget', 'amount');
                      const itemHandled = new Set(['name', 'title', 'program', 'type', 'intervention', 'description', 'text', 'details', 'rationale', 'summary', 'targetPopulation', 'target', 'audience', 'participants', 'estimatedCost', 'cost', 'budget', 'amount']);
                      const extra = Object.entries(item).filter(([k, v]) => !itemHandled.has(k) && v != null && v !== '');
                      return (
                        <div key={i} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
                              {desc && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{desc}</p>}
                              {target && <p className="text-sm text-youthshield-400 mt-1">Target: {target}</p>}
                              {extra.length > 0 && (
                                <div className="mt-2 space-y-0.5">
                                  {extra.map(([k, v]) => (
                                    <div key={k} className="text-sm">
                                      <span className="text-slate-500 font-medium">{labelify(k)}: </span>
                                      <span className="text-slate-300">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {cost && (
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-amber-400">{typeof cost === 'number' ? formatCurrency(cost) : cost}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cost Breakdown Chart */}
              {breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown) && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Cost Breakdown</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={Object.entries(breakdown).map(([k, v]) => ({ name: labelify(k), value: v }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Coverage Gaps */}
              {coverageGaps.length > 0 && (
                <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Coverage Gaps & Risk Areas</h3>
                  <div className="space-y-2">
                    {coverageGaps.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        <p className="text-sm text-slate-300">{typeof g === 'string' ? g : (pick(g, 'text', 'description', 'area', 'gap', 'name') || smartText(g))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coordination Notes */}
              {coordination && (
                <div className="glass-card p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-sm font-semibold text-blue-300 mb-2">Coordination Notes</h3>
                  <Markdown size="sm">{typeof coordination === 'string' ? coordination : smartText(coordination)}</Markdown>
                </div>
              )}

              {/* Justification / Narrative */}
              {justification && (
                <div className="glass-card p-6 border-l-4 border-l-youthshield-500">
                  <h3 className="text-sm font-semibold text-youthshield-300 mb-2">AI Analysis & Justification</h3>
                  <Markdown size="sm">{typeof justification === 'string' ? justification : smartText(justification)}</Markdown>
                </div>
              )}

              {/* ★ ADAPTIVE FALLBACK — renders ALL unhandled fields ★ */}
              <AdaptiveRenderer data={d} excludeKeys={handledKeys} title="Additional Analysis Details" />
            </>
          ) : (
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-youthshield-500/10 flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-youthshield-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Design an Intervention</h3>
              <p className="text-sm text-slate-500 max-w-sm">Select a target zone and intervention type, then run the model to see projected outcomes and implementation plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
