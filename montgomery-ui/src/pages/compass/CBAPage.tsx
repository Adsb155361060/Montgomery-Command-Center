import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { compass } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { AdaptiveRenderer, pick, labelify, fmtDollars, SmartValue, smartText } from '@/components/shared/AdaptiveRenderer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calculator, RefreshCw, DollarSign, Users, Building, Handshake, Scale, ChevronDown, ChevronUp, FileText, Briefcase, Globe } from 'lucide-react';

function parseDollar(s: string | number): number {
  if (typeof s === 'number') return s;
  const n = parseFloat((s || '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function CBAPage() {
  const [form, setForm] = useState({
    projectName: '',
    totalCost: 10000000,
    annualBenefit: 2000000,
    timeline: 10,
    discountRate: 5,
  });
  const [expandedSection, setExpandedSection] = useState<Set<string>>(new Set(['components', 'tax', 'workforce', 'negotiation', 'comparables']));
  const action = useBackgroundAction('Calculate CBA', compass.cba);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectName.trim()) return;
    action.execute({
      project: form.projectName,
      investmentAmount: form.totalCost,
      annualBenefit: form.annualBenefit,
      timeline: form.timeline,
      discountRate: form.discountRate,
    });
  };

  const raw = action.data as any;
  // The API can return the CBA at various nesting levels
  const d = raw?.communityBenefitAgreement || raw?.cba || raw?.data?.communityBenefitAgreement || raw?.data?.cba || raw?.data || raw;
  const hasData = d && typeof d === 'object' && Object.keys(d).length > 0;

  /* ─── Extract known sections with MANY fallback field names ─── */

  // Components / mitigations — the AI may call them components, mitigations, environmentalMitigations, cbaComponents, etc.
  const directContrib = d?.cbaDirectContribution || d?.directContribution || {};
  const components: any[] =
    d?.components || directContrib?.components ||
    d?.cbaComponents || d?.environmentalMitigations || d?.mitigations ||
    d?.requirements || d?.obligations || d?.commitments || [];

  const totalCBAValue =
    directContrib?.totalValue ||
    parseDollar(pick(d, 'recommendedCBAValue', 'requiredCBAValue', 'totalCBAValue', 'cbaValue', 'totalValue') || '0') ||
    components.reduce((s: number, c: any) => s + parseDollar(c.value || c.estimatedValue || c.amount || c.totalContributionUSD || c.totalContribution || c.contributionUSD || c.contribution || c.cost || '0'), 0);

  // Workforce
  const workforce = d?.workforceDevelopment || d?.localHiringTargets || d?.workforce || d?.hiring || {};
  const trainingPartners: any[] =
    workforce?.primaryPartners || workforce?.trainingPartners || workforce?.partners ||
    d?.partners || d?.trainingPartners || d?.localHiringTargets?.trainingPartners ||
    d?.stakeholders || d?.communityPartners || [];
  const trainingPrograms: any[] = workforce?.trainingPrograms || workforce?.programs || d?.trainingPrograms || d?.programs || [];

  // Negotiation points
  const negotiationPoints: any[] =
    d?.negotiationPoints || d?.keyNegotiationPoints || d?.negotiation || d?.terms || [];

  // Tax abatement — the AI returns various structures
  const taxAbatement = d?.taxAbatementAnalysis || d?.taxAbatementScenarios || d?.taxAbatement || d?.abatement || {};

  // Comparable CBAs
  const comparables: any[] = d?.comparableCBAs || d?.comparableAgreements || d?.comparables || d?.benchmarks || [];

  // Summary / narrative
  const summary = pick(d, 'summary', 'narrative', 'executiveSummary', 'overview', 'description', 'analysis');
  const projectName = pick(d, 'projectName', 'project', 'name', 'title') || form.projectName;

  // Chart data for components
  const componentChart = components.map((c: any) => ({
    name: (pick(c, 'fundName', 'category', 'name', 'mitigationType', 'type', 'title') || 'Component').slice(0, 22),
    value: parseDollar(c.value || c.estimatedValue || c.amount || c.totalContributionUSD || c.totalContribution || c.contributionUSD || c.contribution || c.cost || '0'),
  })).filter((c: { name: string; value: number }) => c.value > 0);

  // Collect keys we handle explicitly, so AdaptiveRenderer shows everything else
  const handledKeys = new Set([
    'communityBenefitAgreement', 'cba', 'data',
    'components', 'cbaComponents', 'environmentalMitigations', 'mitigations', 'requirements', 'obligations', 'commitments',
    'cbaDirectContribution', 'directContribution',
    'recommendedCBAValue', 'requiredCBAValue', 'totalCBAValue', 'cbaValue', 'totalValue',
    'workforceDevelopment', 'localHiringTargets', 'workforce', 'hiring',
    'partners', 'trainingPartners', 'stakeholders', 'communityPartners',
    'trainingPrograms', 'programs',
    'negotiationPoints', 'keyNegotiationPoints', 'negotiation', 'terms',
    'taxAbatementAnalysis', 'taxAbatementScenarios', 'taxAbatement', 'abatement',
    'comparableCBAs', 'comparableAgreements', 'comparables', 'benchmarks',
    'summary', 'narrative', 'executiveSummary', 'overview', 'description', 'analysis',
    'projectName', 'project', 'name', 'title',
    'projectInvestment', 'investmentAmount',
    'negotiationDate', 'cbaFrameworkVersion',
  ]);

  const toggle = (section: string) => setExpandedSection(prev => {
    const next = new Set(prev);
    if (next.has(section)) next.delete(section); else next.add(section);
    return next;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Cost-Benefit Analysis" subtitle="Quantitative project evaluation tool for data-driven capital allocation" accentColor="bg-compass-500" icon={<Calculator className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5 h-fit">
          <h3 className="text-sm font-semibold text-slate-300">Project Parameters</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Project Name</label>
            <input type="text" value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="e.g. Downtown Data Center" className="input-field w-full text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Total Cost</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="number" value={form.totalCost} onChange={e => setForm(f => ({ ...f, totalCost: Number(e.target.value) }))} className="input-field w-full pl-9 font-mono text-sm" min={0} step={500000} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Annual Benefit</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="number" value={form.annualBenefit} onChange={e => setForm(f => ({ ...f, annualBenefit: Number(e.target.value) }))} className="input-field w-full pl-9 font-mono text-sm" min={0} step={100000} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Timeline (Years): {form.timeline}</label>
            <input type="range" min={1} max={30} value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: Number(e.target.value) }))} className="w-full accent-compass-500" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Discount Rate: {form.discountRate}%</label>
            <input type="range" min={1} max={15} step={0.5} value={form.discountRate} onChange={e => setForm(f => ({ ...f, discountRate: Number(e.target.value) }))} className="w-full accent-compass-500" />
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate CBA
          </button>

          {action.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{action.error}</p>
            </div>
          )}
        </form>

        {/* ── Results ── */}
        <div className="lg:col-span-2 space-y-6">
          {hasData ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Project Investment"
                  value={fmtDollars(pick(d, 'projectInvestment', 'investmentAmount', 'totalCost', 'investment') || form.totalCost)}
                  icon={<Building className="w-4 h-4" />}
                  color="text-compass-400"
                />
                <StatCard
                  label="CBA Value"
                  value={totalCBAValue > 0 ? fmtDollars(totalCBAValue) : '—'}
                  icon={<DollarSign className="w-4 h-4" />}
                  color="text-emerald-400"
                />
                <StatCard
                  label="CBA Components"
                  value={components.length > 0 ? components.length : Object.keys(taxAbatement).length > 0 ? Object.keys(taxAbatement).length : '—'}
                  icon={<FileText className="w-4 h-4" />}
                  color="text-blue-400"
                />
                <StatCard
                  label="Partners"
                  value={trainingPartners.length > 0 ? trainingPartners.length : comparables.length > 0 ? comparables.length : negotiationPoints.length > 0 ? negotiationPoints.length : components.length > 0 ? components.length : '—'}
                  icon={<Handshake className="w-4 h-4" />}
                  color="text-purple-400"
                />
              </div>

              {/* Summary Banner */}
              <div className="glass-card p-5 border-l-4 border-l-compass-500 bg-compass-500/5">
                <div className="flex items-start gap-3">
                  <Scale className="w-6 h-6 text-compass-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-compass-300">
                      Community Benefit Agreement — {projectName}
                    </p>
                    {summary && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{typeof summary === 'string' ? summary : smartText(summary)}</p>}
                    {d.negotiationDate && <p className="text-xs text-slate-500 mt-2">Framework v{d.cbaFrameworkVersion || '1.0'} • Negotiation date: {d.negotiationDate}</p>}
                    {directContrib?.fundingSchedule && <p className="text-sm text-compass-400 mt-1">{directContrib.fundingSchedule}</p>}
                  </div>
                </div>
              </div>

              {/* CBA Component Chart */}
              {componentChart.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">CBA Component Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={componentChart} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => fmtDollars(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => fmtDollars(v)} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={componentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name.slice(0, 12)}>
                          {componentChart.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => fmtDollars(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* CBA Components / Mitigations Detail */}
              {components.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <button onClick={() => toggle('components')} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-compass-400" /> CBA Components ({components.length})
                    </h3>
                    {expandedSection.has('components') ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expandedSection.has('components') && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-700/30">
                      {components.map((c: any, i: number) => {
                        const title = pick(c, 'fundName', 'category', 'name', 'mitigationType', 'type', 'title');
                        const desc = pick(c, 'description', 'justification', 'requirement', 'detail', 'details', 'text');
                        const value = parseDollar(pick(c, 'value', 'estimatedValue', 'amount', 'totalContributionUSD', 'totalContribution', 'contributionUSD', 'contribution', 'cost') || '0');
                        const handledComponentKeys = new Set([
                          'fundName', 'category', 'name', 'mitigationType', 'type', 'title',
                          'description', 'justification', 'requirement', 'detail', 'details', 'text',
                          'value', 'estimatedValue', 'amount', 'totalContributionUSD', 'totalContribution', 'contributionUSD', 'contribution', 'cost', 'comparableCity',
                        ]);
                        // Get all remaining fields
                        const extraEntries = Object.entries(c).filter(
                          ([k, v]) => !handledComponentKeys.has(k) && v !== null && v !== undefined && v !== ''
                        );
                        return (
                          <div key={i} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium text-slate-200">{title || `Component ${i + 1}`}</h4>
                                {desc && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{desc}</p>}
                                {c.comparableCity && <p className="text-xs text-slate-500 mt-1">Comparable: {c.comparableCity}</p>}
                                {/* Render any extra fields */}
                                {extraEntries.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {extraEntries.map(([k, v]) => (
                                      <div key={k} className="text-sm">
                                        <span className="text-slate-500 font-medium">{labelify(k)}: </span>
                                        <span className="text-slate-300">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {value > 0 && (
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-bold text-compass-400">{fmtDollars(value)}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {totalCBAValue > 0 && (
                        <div className="p-3 bg-compass-500/10 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-semibold text-compass-300">Total CBA Value</span>
                          <span className="text-lg font-bold text-compass-400">{fmtDollars(totalCBAValue)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tax Abatement — render ALL scenarios generically */}
              {Object.keys(taxAbatement).length > 0 && (
                <div className="glass-card overflow-hidden">
                  <button onClick={() => toggle('tax')} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-amber-400" /> Tax Abatement Analysis
                    </h3>
                    {expandedSection.has('tax') ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expandedSection.has('tax') && (
                    <div className="px-5 pb-5 border-t border-slate-700/30">
                      {/* Render each scenario/entry as a card */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        {Object.entries(taxAbatement)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .map(([key, val]: [string, any]) => {
                            // If primitive (like recommended: "string"), show inline
                            if (typeof val !== 'object') {
                              return (
                                <div key={key} className="sm:col-span-2 p-3 bg-compass-500/10 rounded-lg border border-compass-500/20">
                                  <p className="text-sm text-compass-300"><strong>{labelify(key)}:</strong> {String(val)}</p>
                                </div>
                              );
                            }
                            // Object scenario
                            return (
                              <div key={key} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                <h5 className="text-sm font-semibold text-slate-200 mb-3">{labelify(key)}</h5>
                                <div className="space-y-2">
                                  {Object.entries(val)
                                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                    .map(([k2, v2]) => (
                                      <div key={k2} className="flex justify-between text-sm gap-2">
                                        <span className="text-slate-400">{labelify(k2)}</span>
                                        <span className={`text-slate-200 font-mono text-right ${
                                          k2.toLowerCase().includes('loss') || k2.toLowerCase().includes('foregone')
                                            ? 'text-red-400'
                                            : k2.toLowerCase().includes('benefit') || k2.toLowerCase().includes('value')
                                              ? 'text-emerald-400'
                                              : ''
                                        }`}>
                                          {Array.isArray(v2) ? v2.map(x => typeof x === 'number' ? fmtDollars(x) : x).join(' – ')
                                            : typeof v2 === 'number' ? v2.toLocaleString()
                                              : String(v2)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workforce Development */}
              {(trainingPartners.length > 0 || trainingPrograms.length > 0 || workforce.constructionPhase || workforce.localHiringTargets || Object.keys(workforce).length > 0) && (
                <div className="glass-card overflow-hidden">
                  <button onClick={() => toggle('workforce')} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" /> Workforce Development & Local Hiring
                    </h3>
                    {expandedSection.has('workforce') ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expandedSection.has('workforce') && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30">
                      {/* Partners */}
                      {trainingPartners.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Training Partners</h5>
                          <div className="flex flex-wrap gap-2">
                            {trainingPartners.map((p: any, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                                {typeof p === 'string' ? p : p.name || p.partner || p.organization || p.institution || smartText(p)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Programs */}
                      {trainingPrograms.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Training Programs</h5>
                          <div className="space-y-2">
                            {trainingPrograms.map((p: any, i: number) => (
                              <div key={i} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                <h6 className="text-sm font-medium text-slate-200">
                                  {typeof p === 'string' ? p : (p.programName || p.name || p.title || `Program ${i + 1}`)}
                                </h6>
                                {p.description && <p className="text-sm text-slate-400 mt-1">{p.description}</p>}
                                <div className="flex flex-wrap gap-3 mt-1.5">
                                  {p.targetParticipants && <span className="text-xs text-slate-500">👥 {p.targetParticipants}</span>}
                                  {p.duration && <span className="text-xs text-slate-500">⏱ {p.duration}</span>}
                                  {p.fundingSource && <span className="text-xs text-compass-400">💰 {p.fundingSource}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hiring Targets */}
                      {(workforce.constructionPhase || workforce.operationalPhase || workforce.localHiringTargets) && (
                        <div>
                          <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Local Hiring Targets</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(workforce.constructionPhase || workforce.localHiringTargets?.constructionPhase) && (
                              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                                <Briefcase className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                                <div className="text-sm font-bold text-slate-200">{workforce.constructionPhase || workforce.localHiringTargets?.constructionPhase}</div>
                                <div className="text-xs text-slate-500">Construction Phase</div>
                              </div>
                            )}
                            {(workforce.operationalPhase || workforce.localHiringTargets?.operationalPhase) && (
                              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                                <Building className="w-5 h-5 text-compass-400 mx-auto mb-1" />
                                <div className="text-sm font-bold text-slate-200">{workforce.operationalPhase || workforce.localHiringTargets?.operationalPhase}</div>
                                <div className="text-xs text-slate-500">Operational Phase</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fallback: render any other workforce fields not handled above */}
                      {(() => {
                        const wfHandled = new Set([
                          'primaryPartners', 'trainingPartners', 'partners',
                          'trainingPrograms', 'programs',
                          'constructionPhase', 'operationalPhase', 'localHiringTargets',
                        ]);
                        const extra = Object.entries(workforce).filter(
                          ([k, v]) => !wfHandled.has(k) && v !== null && v !== undefined && v !== ''
                        );
                        if (extra.length === 0) return null;
                        return (
                          <div className="space-y-1.5 mt-2">
                            {extra.map(([k, v]) => (
                              <div key={k} className="text-xs">
                                <span className="text-slate-500 font-medium">{labelify(k)}: </span>
                                <span className="text-slate-300">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Negotiation Points */}
              {negotiationPoints.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <button onClick={() => toggle('negotiation')} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Handshake className="w-4 h-4 text-emerald-400" /> Negotiation Points ({negotiationPoints.length})
                    </h3>
                    {expandedSection.has('negotiation') ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expandedSection.has('negotiation') && (
                    <div className="px-5 pb-5 space-y-2 border-t border-slate-700/30 mt-3">
                      {negotiationPoints.map((point: any, i: number) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {typeof point === 'string' ? point : (point.text || point.description || point.point || point.title || point.name || smartText(point))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comparable CBAs */}
              {comparables.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <button onClick={() => toggle('comparables')} className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" /> Comparable CBAs ({comparables.length})
                    </h3>
                    {expandedSection.has('comparables') ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {expandedSection.has('comparables') && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-700/30">
                      {comparables.map((c: any, i: number) => {
                        const cTitle = pick(c, 'city', 'location', 'name', 'company');
                        const cProject = pick(c, 'project', 'projectName', 'title', 'description');
                        const cValue = pick(c, 'cbaValue', 'value', 'amount');
                        const cHandled = new Set(['city', 'location', 'name', 'company', 'project', 'projectName', 'title', 'description', 'cbaValue', 'value', 'amount', 'keyTerms']);
                        const extra = Object.entries(c).filter(([k, v]) => !cHandled.has(k) && v !== null && v !== undefined && v !== '');
                        return (
                          <div key={i} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 mt-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-medium text-slate-200">{cTitle || `CBA ${i + 1}`}</h4>
                                {cProject && <p className="text-xs text-slate-400 mt-0.5">{cProject}</p>}
                              </div>
                              {cValue && <span className="text-sm font-bold text-purple-400 flex-shrink-0">{cValue}</span>}
                            </div>
                            {c.keyTerms && Array.isArray(c.keyTerms) && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {c.keyTerms.map((t: string, j: number) => (
                                  <span key={j} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs rounded-full border border-purple-500/20">
                                    {typeof t === 'string' ? t : smartText(t)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {extra.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {extra.map(([k, v]) => (
                                  <div key={k} className="text-xs">
                                    <span className="text-slate-500 font-medium">{labelify(k)}: </span>
                                    <span className="text-slate-300">{typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Narrative / Summary */}
              {summary && typeof summary === 'string' && summary.length > 50 && (
                <div className="glass-card p-6 border-l-4 border-l-compass-500">
                  <h3 className="text-sm font-semibold text-compass-300 mb-2">Analysis Summary</h3>
                  <Markdown size="sm">{summary}</Markdown>
                </div>
              )}

              {/* ★ ADAPTIVE FALLBACK — renders ALL fields not handled above ★ */}
              <AdaptiveRenderer
                data={d}
                excludeKeys={handledKeys}
                title="Additional CBA Details"
              />
            </>
          ) : (
            /* ── Empty state ── */
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-compass-500/10 flex items-center justify-center mb-4">
                <Calculator className="w-10 h-10 text-compass-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Design a CBA</h3>
              <p className="text-sm text-slate-500 max-w-sm">Enter project parameters to generate a Community Benefit Agreement with CBA components, workforce development plans, tax abatement analysis, and comparable agreements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
