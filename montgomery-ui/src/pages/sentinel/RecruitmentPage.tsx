import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { ModuleHeader, LoadingScreen } from '@/components/shared';
import { ExportButton } from '@/lib/export';
import {
  DollarSign, Zap, TrendingUp, TrendingDown, Users, Clock,
  Shield, BadgeDollarSign, ChevronRight, Target, PiggyBank,
  BarChart3, Crosshair, MapPin,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';

/* ── colour palette for chart bars ───────────────────── */
const BAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

/* ────────────────────────────────────────────────────────
 * Normalize ANY API response shape into a single unified
 * structure. Handles both known formats:
 *
 * Format A (multi-officer):
 *   { roi_analysis: { officer_count_added, cost_projection,
 *     incident_reduction_projection_annual[], roi_calculation, ... } }
 *
 * Format B (single-officer):
 *   { recruitment_roi_analysis: { officers_added,
 *     cost_of_new_officer_first_year, projected_impact,
 *     return_on_investment, ... } }
 * ──────────────────────────────────────────────────────── */
function prettyCrimeType(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

interface NormalizedROI {
  officersAdded: number | string;
  shiftImpacted: string;
  costs: { label: string; value: number }[];
  totalFirstYearInvestment: number;
  totalSubsequentAnnualInvestment: number;
  reductions: { type: string; count: number; savings: number }[];
  totalAnnualSavings: number;
  firstYearNetBenefit: number | null;
  firstYearROI: number | null;
  subsequentNetBenefit: number | null;
  subsequentROI: number | null;
  justification: string;
  strategy: string;
  targetZone: any;
  incidentBreakdown: { label: string; value: string }[];
  totalIncidentsPrevented: number | null;
  reductionPct: string;
}

function normalizeROI(raw: any): NormalizedROI | null {
  if (!raw) return null;

  // Find the analysis object regardless of key name
  const a =
    raw?.roi_analysis ??
    raw?.recruitment_roi_analysis ??
    raw?.data?.roi_analysis ??
    raw?.data?.recruitment_roi_analysis ??
    raw;

  // If it still looks like a wrapper, bail
  if (!a || (typeof a !== 'object')) return null;

  /* ── Officers ── */
  const officersAdded = a.officer_count_added ?? a.officers_added ?? '—';

  /* ── Shift ── */
  const shiftImpacted = a.shift_impacted ?? a.projected_impact?.target_zone?.shift ?? '—';

  /* ── Costs ── */
  const costs: { label: string; value: number }[] = [];
  let totalFirstYear = 0;
  let totalSubsequent = 0;

  // Format A: cost_projection
  const cp = a.cost_projection;
  if (cp) {
    if (cp.officer_annual_cost_per) costs.push({ label: 'Annual Cost Per Officer', value: cp.officer_annual_cost_per });
    if (cp.training_cost_per_officer) costs.push({ label: 'Training Cost Per Officer', value: cp.training_cost_per_officer });
    if (cp.total_annual_personnel_cost) costs.push({ label: 'Total Annual Personnel Cost', value: cp.total_annual_personnel_cost });
    if (cp.total_initial_training_cost) costs.push({ label: 'Total Initial Training Cost', value: cp.total_initial_training_cost });
    totalFirstYear = cp.total_first_year_investment ?? 0;
    totalSubsequent = cp.total_subsequent_annual_investment ?? 0;
    if (totalFirstYear) costs.push({ label: 'Total First Year Investment', value: totalFirstYear });
    if (totalSubsequent) costs.push({ label: 'Subsequent Annual Investment', value: totalSubsequent });
  }

  // Format B: cost_of_new_officer_first_year
  const cf = a.cost_of_new_officer_first_year;
  if (cf) {
    if (cf.annual_salary_and_benefits) costs.push({ label: 'Annual Salary & Benefits', value: cf.annual_salary_and_benefits });
    if (cf.training_cost) costs.push({ label: 'Training Cost', value: cf.training_cost });
    totalFirstYear = cf.total_first_year_cost ?? 0;
    if (totalFirstYear) costs.push({ label: 'Total First Year Cost', value: totalFirstYear });
  }

  /* ── Incident Reductions ── */
  const reductions: { type: string; count: number; savings: number }[] = [];

  // Format A: incident_reduction_projection_annual[]
  const irpa = a.incident_reduction_projection_annual;
  if (Array.isArray(irpa)) {
    irpa.forEach((r: any) => {
      reductions.push({
        type: r.type ?? 'Unknown',
        count: r.projected_reduction_count ?? 0,
        savings: r.total_savings ?? 0,
      });
    });
  }

  // Format B: estimated_incidents_prevented_by_type + estimated_cost_savings_annually
  const pi = a.projected_impact;
  if (pi) {
    const byType = pi.estimated_incidents_prevented_by_type ?? {};
    const bySavings = pi.estimated_cost_savings_annually ?? {};
    const typeKeys = Object.keys(byType);
    if (typeKeys.length > 0) {
      typeKeys.forEach(key => {
        const savingsKey = `${key}_savings`;
        reductions.push({
          type: prettyCrimeType(key),
          count: byType[key] ?? 0,
          savings: bySavings[savingsKey] ?? 0,
        });
      });
    }
  }

  /* ── Total savings ── */
  const totalAnnualSavings =
    a.total_projected_annual_savings ??
    pi?.estimated_cost_savings_annually?.total_annual_cost_savings ??
    reductions.reduce((s, r) => s + r.savings, 0);

  /* ── ROI ── */
  const rc = a.roi_calculation;
  const rv = a.return_on_investment;

  const firstYearNetBenefit = rc?.first_year?.net_benefit ?? rv?.first_year_net_benefit ?? null;
  const firstYearROI = rc?.first_year?.roi_percentage ?? rv?.first_year_roi_percentage ?? null;
  const subsequentNetBenefit = rc?.subsequent_years_annual?.net_benefit ?? null;
  const subsequentROI = rc?.subsequent_years_annual?.roi_percentage ?? null;

  /* ── Justification ── */
  const justification = a.executive_justification ?? a.justification ?? '';

  /* ── Strategy / Target zone (Format B) ── */
  const strategy = pi?.strategy ?? '';
  const targetZone = pi?.target_zone ?? null;
  const reductionPct = pi?.assumed_incident_reduction_percentage ?? '';
  const totalIncidentsPrevented = pi?.estimated_incidents_prevented_annually ?? null;

  /* ── Incident breakdown assumptions ── */
  const incidentBreakdown: { label: string; value: string }[] = [];
  const iba = pi?.incident_breakdown_assumptions;
  if (iba) {
    Object.entries(iba).forEach(([k, v]) => {
      incidentBreakdown.push({ label: prettyCrimeType(k.replace('_percentage', '')), value: String(v) });
    });
  }

  return {
    officersAdded,
    shiftImpacted,
    costs,
    totalFirstYearInvestment: totalFirstYear,
    totalSubsequentAnnualInvestment: totalSubsequent,
    reductions,
    totalAnnualSavings,
    firstYearNetBenefit,
    firstYearROI,
    subsequentNetBenefit,
    subsequentROI,
    justification,
    strategy,
    targetZone,
    incidentBreakdown,
    totalIncidentsPrevented,
    reductionPct,
  };
}

export default function RecruitmentPage() {
  const [form, setForm] = useState({ district: '', shift: '', additionalOfficers: 1 });
  const calc = useBackgroundAction('Calculate Recruitment ROI', sentinel.recruitmentROI);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calc.execute({
      additionalOfficers: form.additionalOfficers,
      district: form.district || undefined,
      shift: form.shift || undefined,
    });
  };

  const roi = normalizeROI(calc.data);

  /* Chart data */
  const chartData = roi?.reductions.map(r => ({
    type: r.type,
    savings: r.savings,
    count: r.count,
  })) ?? [];

  /* Export content */
  const exportContent = roi
    ? [
        '# Recruitment ROI Analysis',
        '',
        '## Overview',
        `- Officers Added: ${roi.officersAdded}`,
        `- Shifts Impacted: ${roi.shiftImpacted}`,
        roi.strategy ? `- Strategy: ${roi.strategy}` : '',
        roi.reductionPct ? `- Assumed Incident Reduction: ${roi.reductionPct}` : '',
        '',
        '## Costs',
        ...roi.costs.map(c => `- ${c.label}: ${formatCurrency(c.value)}`),
        '',
        '## Incident Reduction Projections',
        ...roi.reductions.map(r => `- ${r.type}: ${r.count} incidents prevented → ${formatCurrency(r.savings)} saved`),
        `- **Total Annual Savings: ${formatCurrency(roi.totalAnnualSavings)}**`,
        '',
        '## ROI',
        roi.firstYearROI != null ? `- First Year ROI: ${roi.firstYearROI.toFixed(1)}% (Net Benefit: ${formatCurrency(roi.firstYearNetBenefit ?? 0)})` : '',
        roi.subsequentROI != null ? `- Subsequent Years ROI: ${roi.subsequentROI.toFixed(1)}% (Net Benefit: ${formatCurrency(roi.subsequentNetBenefit ?? 0)})` : '',
        '',
        '## Executive Justification',
        roi.justification,
      ].filter(Boolean).join('\n')
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <ModuleHeader
          title="Recruitment ROI Calculator"
          subtitle="Model the financial and safety return on every new hire"
          accentColor="bg-sentinel-500"
          icon={<DollarSign className="w-6 h-6" />}
        />
        {roi && <ExportButton content={exportContent} filename="recruitment-roi" title="Recruitment ROI Report" />}
      </div>

      {/* ── Form ── */}
      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Additional Officers</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.additionalOfficers}
              onChange={e => setForm({ ...form, additionalOfficers: Number(e.target.value) })}
              className="input-field w-32"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">District</label>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="input-field w-40">
              <option value="">All Districts</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Shift</label>
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} className="input-field w-40">
              <option value="">All Shifts</option>
              <option value="day">Day</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
          <button type="submit" disabled={calc.loading} className="btn-primary flex items-center gap-2">
            {calc.loading ? <span className="animate-spin">⏳</span> : <Zap className="w-4 h-4" />}
            Calculate ROI
          </button>
        </form>
      </div>

      {calc.loading && <LoadingScreen message="AI is calculating recruitment ROI..." />}
      {calc.error && (
        <div className="glass-card p-4 border-l-4 border-l-red-500 bg-red-500/5">
          <p className="text-sm text-red-400">{calc.error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {roi && (
        <div className="space-y-6 animate-slide-up">

          {/* ── Top-level KPI cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard
              icon={<Users className="w-5 h-5" />}
              label="Officers Added"
              value={String(roi.officersAdded)}
              accent="text-blue-400"
            />
            <KPICard
              icon={<Clock className="w-5 h-5" />}
              label="Shifts Impacted"
              value={roi.shiftImpacted}
              accent="text-indigo-400"
            />
            <KPICard
              icon={<PiggyBank className="w-5 h-5" />}
              label="Annual Projected Savings"
              value={formatCurrency(roi.totalAnnualSavings)}
              accent="text-emerald-400"
            />
            <KPICard
              icon={<TrendingUp className="w-5 h-5" />}
              label="First Year ROI"
              value={roi.firstYearROI != null ? `${roi.firstYearROI.toFixed(1)}%` : '—'}
              accent="text-amber-400"
            />
          </div>

          {/* ── Strategy & Target Zone (Format B) ── */}
          {(roi.strategy || roi.targetZone) && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-sentinel-400" /> Deployment Strategy
              </h3>
              {roi.strategy && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{roi.strategy}</p>
              )}
              {roi.targetZone && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {roi.targetZone.district && (
                    <InfoPill icon={<MapPin className="w-3.5 h-3.5" />} label="District" value={roi.targetZone.district} />
                  )}
                  {roi.targetZone.shift && (
                    <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Shift" value={roi.targetZone.shift} />
                  )}
                  {roi.targetZone.h3_index && (
                    <InfoPill icon={<MapPin className="w-3.5 h-3.5" />} label="H3 Zone" value={roi.targetZone.h3_index.slice(0, 12) + '…'} />
                  )}
                  {roi.targetZone.annual_incidents_in_zone != null && (
                    <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Annual Incidents" value={String(roi.targetZone.annual_incidents_in_zone)} />
                  )}
                </div>
              )}
              {(roi.reductionPct || roi.totalIncidentsPrevented != null) && (
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                  {roi.reductionPct && (
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Assumed Reduction: </span>
                      <span className="font-semibold text-sentinel-400">{roi.reductionPct}</span>
                    </div>
                  )}
                  {roi.totalIncidentsPrevented != null && (
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Est. Incidents Prevented: </span>
                      <span className="font-semibold text-emerald-400">{roi.totalIncidentsPrevented}/year</span>
                    </div>
                  )}
                </div>
              )}
              {/* Incident breakdown assumptions */}
              {roi.incidentBreakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Incident Breakdown Assumptions</p>
                  <div className="flex flex-wrap gap-2">
                    {roi.incidentBreakdown.map((b, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/30">
                        {b.label}: <span className="font-semibold">{b.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Cost Projection ── */}
          {roi.costs.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-red-400" /> Cost Projection
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roi.costs.map((c, i) => (
                  <CostRow
                    key={i}
                    label={c.label}
                    value={c.value}
                    highlight={c.label.toLowerCase().includes('total first year')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Incident Reduction Projections Table ── */}
          {roi.reductions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Incident Reduction Projections (Annual)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Crime Type</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Incidents Prevented</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {roi.reductions.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          {r.type}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            {r.count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-500">{formatCurrency(r.savings)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-white" colSpan={2}>Total Annual Projected Savings</td>
                      <td className="py-3 px-4 text-right font-bold text-lg text-emerald-400">{formatCurrency(roi.totalAnnualSavings)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Savings by Category Chart ── */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" /> Savings by Crime Category
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v: number) => formatCurrency(v)}
                  />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={130}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                    formatter={(v: number) => formatCurrency(v)}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                  />
                  <Bar dataKey="savings" name="Total Savings" radius={[0, 6, 6, 0]}>
                    {chartData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── ROI Calculation ── */}
          {(roi.firstYearROI != null || roi.subsequentROI != null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roi.firstYearROI != null && (
                <ROICard
                  title="First Year"
                  netBenefit={roi.firstYearNetBenefit}
                  roiPct={roi.firstYearROI}
                  investment={roi.totalFirstYearInvestment || undefined}
                  totalSavings={roi.totalAnnualSavings}
                  color="amber"
                />
              )}
              {roi.subsequentROI != null && (
                <ROICard
                  title="Subsequent Years (Annual)"
                  netBenefit={roi.subsequentNetBenefit}
                  roiPct={roi.subsequentROI}
                  investment={roi.totalSubsequentAnnualInvestment || undefined}
                  totalSavings={roi.totalAnnualSavings}
                  color="emerald"
                />
              )}
            </div>
          )}

          {/* ── Executive Justification ── */}
          {roi.justification && (
            <div className="glass-card p-6 border-l-4 border-l-sentinel-500 bg-sentinel-500/5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-sentinel-400" /> Executive Justification
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {roi.justification}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60', accent)}>{icon}</div>
      <div>
        <p className={cn('text-xl font-bold tabular-nums', accent)}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
      <span className="text-sentinel-400">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function CostRow({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl',
      highlight
        ? 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20'
        : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30'
    )}>
      <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', highlight ? 'text-red-500' : 'text-slate-700 dark:text-slate-200')}>
        {value != null ? formatCurrency(value) : '—'}
      </span>
    </div>
  );
}

function ROICard({
  title, netBenefit, roiPct, investment, totalSavings, color,
}: {
  title: string; netBenefit?: number | null; roiPct?: number | null; investment?: number; totalSavings: number; color: 'amber' | 'emerald';
}) {
  const isPositive = (netBenefit ?? 0) > 0;
  return (
    <div className={cn(
      'glass-card p-6 border-l-4',
      color === 'amber' ? 'border-l-amber-500' : 'border-l-emerald-500',
    )}>
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">{title}</h4>
      <div className="space-y-3">
        {investment != null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Investment</span>
            <span className="font-medium text-red-400">{formatCurrency(investment)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Projected Savings</span>
          <span className="font-medium text-emerald-400">{formatCurrency(totalSavings)}</span>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-3 flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Net Benefit</p>
            <p className={cn('text-lg font-bold tabular-nums', isPositive ? 'text-emerald-400' : 'text-red-400')}>
              {netBenefit != null ? formatCurrency(netBenefit) : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">ROI</p>
            <p className={cn('text-2xl font-bold tabular-nums', color === 'amber' ? 'text-amber-400' : 'text-emerald-400')}>
              {roiPct != null ? `${roiPct.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
