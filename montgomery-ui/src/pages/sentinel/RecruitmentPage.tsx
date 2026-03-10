import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { sentinel } from '@/lib/api';
import { ModuleHeader, LoadingScreen } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { DollarSign, Zap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

/** Safely extract a number from an AI-generated field (handles "$1,234", "1.5x", etc.) */
function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,%x]/gi, '').replace(/,/g, '').trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Normalize AI response to expected ROI shape — handles different field names/casing */
function normalizeROI(raw: any): any {
  if (!raw) return null;
  // Unwrap nested data if needed
  const r = raw?.data ?? raw?.result ?? raw?.analysis ?? raw;
  return {
    annualSavings: safeNum(r.annualSavings ?? r.annual_savings ?? r.totalSavings ?? r.total_savings),
    annualCost: safeNum(r.annualCost ?? r.annual_cost ?? r.totalCost ?? r.total_cost),
    roi: safeNum(r.roi ?? r.returnOnInvestment ?? r.return_on_investment ?? r.roiMultiplier),
    projectedIncidentReductionPct: safeNum(r.projectedIncidentReductionPct ?? r.projected_incident_reduction_pct ?? r.incidentReductionPct ?? r.incidentReduction ?? r.incident_reduction_pct),
    justification: r.justification ?? r.analysis ?? r.summary ?? r.explanation ?? r.narrative ?? '',
    breakdownByCategory: r.breakdownByCategory ?? r.breakdown_by_category ?? r.breakdown ?? r.categories ?? [],
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

  const result = normalizeROI(calc.data);

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="Recruitment ROI Calculator"
        subtitle="Model the financial and safety return on every new hire"
        accentColor="bg-sentinel-500"
        icon={<DollarSign className="w-6 h-6" />}
      />

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Additional Officers</label>
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
            <label className="block text-sm text-slate-400 mb-1.5">District</label>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="input-field w-40">
              <option value="">All Districts</option>
              {[1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={String(d)}>District {d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Shift</label>
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

      {result && (result.annualSavings > 0 || result.annualCost > 0 || result.roi > 0) && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-2xl text-emerald-400">{formatCurrency(result.annualSavings)}</p>
              <p className="stat-label">Annual Savings</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-2xl text-red-400">{formatCurrency(result.annualCost)}</p>
              <p className="stat-label">Annual Cost</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-2xl text-amber-400">{result.roi.toFixed(1)}x</p>
              <p className="stat-label">ROI</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="stat-value text-2xl text-blight-400">-{result.projectedIncidentReductionPct.toFixed(1)}%</p>
              <p className="stat-label">Incident Reduction</p>
            </div>
          </div>

          {/* ROI Visual */}
          <div className={`glass-card p-6 border-l-4 ${result.roi > 1 ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-5 h-5 ${result.roi > 1 ? 'text-emerald-400' : 'text-red-400'}`} />
              <h3 className="font-semibold text-white">
                {result.roi > 1 ? 'Positive Return on Investment' : 'Investment Analysis'}
              </h3>
            </div>
            <Markdown size="sm">{result.justification || 'ROI analysis based on Montgomery incident data and officer cost projections.'}</Markdown>
          </div>

          {/* Breakdown Chart */}
          {Array.isArray(result.breakdownByCategory) && result.breakdownByCategory.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Savings by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={result.breakdownByCategory} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="totalSavings" fill="#10b981" radius={[0, 6, 6, 0]} name="Savings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
