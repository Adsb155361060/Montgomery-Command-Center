import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { ModuleHeader, LoadingScreen } from '@/components/shared';
import { ExportButton } from '@/lib/export';
import {
  DollarSign, Zap, TrendingUp, TrendingDown, Users, Clock,
  Shield, BadgeDollarSign, ChevronRight, Target, PiggyBank,
  BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, cn } from '@/lib/utils';

/* ── colour palette for chart bars ───────────────────── */
const BAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

/* ── Extract nested roi_analysis from API response ─── */
function extractROI(raw: any) {
  if (!raw) return null;
  // API returns { roi_analysis: { ... } } inside data
  return raw?.roi_analysis ?? raw?.data?.roi_analysis ?? raw;
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

  const roi = extractROI(calc.data);

  /* Derived values */
  const cost = roi?.cost_projection;
  const reductions = roi?.incident_reduction_projection_annual ?? [];
  const roiCalc = roi?.roi_calculation;
  const totalSavings = roi?.total_projected_annual_savings ?? 0;
  const justification = roi?.executive_justification ?? '';

  /* Chart data */
  const chartData = reductions.map((r: any) => ({
    type: r.type,
    savings: r.total_savings ?? 0,
    reductions: r.projected_reduction_count ?? 0,
    costPerIncident: r.cost_per_incident ?? 0,
  }));

  /* Export content for markdown / text */
  const exportContent = roi
    ? `# Recruitment ROI Analysis\n\n## Overview\n- Officers Added: ${roi.officer_count_added}\n- Shifts Impacted: ${roi.shift_impacted}\n\n## Cost Projection\n- Annual Cost Per Officer: ${formatCurrency(cost?.officer_annual_cost_per)}\n- Training Cost Per Officer: ${formatCurrency(cost?.training_cost_per_officer)}\n- Total First Year Investment: ${formatCurrency(cost?.total_first_year_investment)}\n- Subsequent Annual Investment: ${formatCurrency(cost?.total_subsequent_annual_investment)}\n\n## Incident Reduction Projections\n${reductions.map((r: any) => `- ${r.type}: ${r.projected_reduction_count} incidents reduced → ${formatCurrency(r.total_savings)} saved`).join('\n')}\n\n## ROI Calculation\n- First Year ROI: ${roiCalc?.first_year?.roi_percentage?.toFixed(1)}% (Net Benefit: ${formatCurrency(roiCalc?.first_year?.net_benefit)})\n- Subsequent Years ROI: ${roiCalc?.subsequent_years_annual?.roi_percentage?.toFixed(1)}% (Net Benefit: ${formatCurrency(roiCalc?.subsequent_years_annual?.net_benefit)})\n\n## Executive Justification\n${justification}`
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
              value={String(roi.officer_count_added ?? '—')}
              accent="text-blue-400"
            />
            <KPICard
              icon={<Clock className="w-5 h-5" />}
              label="Shifts Impacted"
              value={roi.shift_impacted ?? '—'}
              accent="text-indigo-400"
            />
            <KPICard
              icon={<PiggyBank className="w-5 h-5" />}
              label="Annual Projected Savings"
              value={formatCurrency(totalSavings)}
              accent="text-emerald-400"
            />
            <KPICard
              icon={<TrendingUp className="w-5 h-5" />}
              label="First Year ROI"
              value={`${roiCalc?.first_year?.roi_percentage?.toFixed(1) ?? '—'}%`}
              accent="text-amber-400"
            />
          </div>

          {/* ── Cost Projection ── */}
          {cost && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-red-400" /> Cost Projection
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CostRow label="Annual Cost Per Officer" value={cost.officer_annual_cost_per} />
                <CostRow label="Training Cost Per Officer" value={cost.training_cost_per_officer} />
                <CostRow label="Total Annual Personnel Cost" value={cost.total_annual_personnel_cost} />
                <CostRow label="Total Initial Training Cost" value={cost.total_initial_training_cost} />
                <CostRow label="Total First Year Investment" value={cost.total_first_year_investment} highlight />
                <CostRow label="Subsequent Annual Investment" value={cost.total_subsequent_annual_investment} />
              </div>
            </div>
          )}

          {/* ── Incident Reduction Projections Table ── */}
          {reductions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Incident Reduction Projections (Annual)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Crime Type</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Projected Reduction</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cost Per Incident</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {reductions.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          {r.type}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            {r.projected_reduction_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(r.cost_per_incident)}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-500">{formatCurrency(r.total_savings)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-white" colSpan={3}>Total Annual Projected Savings</td>
                      <td className="py-3 px-4 text-right font-bold text-lg text-emerald-400">{formatCurrency(totalSavings)}</td>
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

          {/* ── ROI Calculation Comparison ── */}
          {roiCalc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ROICard
                title="First Year"
                netBenefit={roiCalc.first_year?.net_benefit}
                roiPct={roiCalc.first_year?.roi_percentage}
                investment={cost?.total_first_year_investment}
                color="amber"
              />
              <ROICard
                title="Subsequent Years (Annual)"
                netBenefit={roiCalc.subsequent_years_annual?.net_benefit}
                roiPct={roiCalc.subsequent_years_annual?.roi_percentage}
                investment={cost?.total_subsequent_annual_investment}
                color="emerald"
              />
            </div>
          )}

          {/* ── Executive Justification ── */}
          {justification && (
            <div className="glass-card p-6 border-l-4 border-l-sentinel-500 bg-sentinel-500/5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-sentinel-400" /> Executive Justification
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                {justification}
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
  title, netBenefit, roiPct, investment, color,
}: {
  title: string; netBenefit?: number; roiPct?: number; investment?: number; color: 'amber' | 'emerald';
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
          <span className="font-medium text-emerald-400">{formatCurrency((netBenefit ?? 0) + (investment ?? 0))}</span>
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
