import { useState } from 'react';
import { useBackgroundAction } from '@/hooks/useBackgroundAction';
import { compass } from '@/lib/api';
import { ModuleHeader, StatCard } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { AdaptiveRenderer, pick, labelify, fmtDollars, SmartValue, smartText, deepFind, deepSum, parseDollarStr } from '@/components/shared/AdaptiveRenderer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FlaskConical, RefreshCw, DollarSign, Users, TrendingUp, Building } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function ScenarioPage() {
  const [form, setForm] = useState({
    investmentAmount: 50000000,
    projectType: 'data_center',
    district: 1,
    timeline: 5,
  });
  const action = useBackgroundAction('Run Scenario', compass.scenario);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeName = projectTypes.find(t => t.value === form.projectType)?.label || form.projectType;
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(form.investmentAmount);
    const scenario = `A ${amount} ${typeName} investment in District ${form.district} over a ${form.timeline}-year timeline. Model the economic impact including jobs, tax revenue, housing effects, and utility costs.`;
    action.execute(scenario);
  };

  const raw = action.data as any;
  // Unwrap — AI might nest under scenarioResult, simulation, data, etc.
  // IMPORTANT: Don't match raw?.scenario — that's the scenario description string, not a data wrapper
  const d = raw?.scenarioResult || raw?.simulation ||
    (raw?.scenario && typeof raw.scenario === 'object' ? raw.scenario : null) ||
    raw?.data?.scenarioResult || raw?.data?.simulation || raw?.data || raw;
  const hasData = d && typeof d === 'object' && Object.keys(d).length > 0;

  const projectTypes = [
    { value: 'data_center', label: 'Data Center' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'commercial', label: 'Commercial Development' },
    { value: 'mixed_use', label: 'Mixed-Use' },
    { value: 'infrastructure', label: 'Infrastructure' },
  ];

  /* ─── Helper: resolve any value to a number (handles Monte Carlo {mean:X} objects, dollar strings, etc.) ─── */
  function resolveNumeric(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const p = parseDollarStr(val);
      if (!isNaN(p) && p > 0) return p;
      const n = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    if (typeof val === 'object') {
      // Monte Carlo: {mean: X, confidenceInterval95: {...}}
      if ('mean' in val) return resolveNumeric(val.mean);
      if ('value' in val) return resolveNumeric(val.value);
      if ('total' in val) return resolveNumeric(val.total);
      if ('amount' in val) return resolveNumeric(val.amount);
      if ('estimate' in val) return resolveNumeric(val.estimate);
    }
    return 0;
  }

  /* ─── Resilient field extraction ─── */

  // --- Total Revenue / Tax Revenue ---
  const taxRevenueObj = pick(d, 'taxRevenue', 'taxImpact', 'fiscalImpact', 'revenueProjection');
  const totalRevenue = (() => {
    // Try flat top-level numbers
    const flat = resolveNumeric(pick(d, 'totalRevenue', 'totalTaxRevenue', 'estimatedRevenue', 'fiscalImpact', 'totalEconomicImpact', 'annualTaxRevenue'));
    if (flat > 0) return flat;
    // Try nested taxRevenue object
    if (taxRevenueObj && typeof taxRevenueObj === 'object') {
      // Try specific sub-fields
      for (const key of ['annual', 'annualRevenue', 'total', 'totalAnnual', 'postAbatement', 'propertyTax', 'salesTax']) {
        const val = (taxRevenueObj as any)[key];
        if (val != null) {
          const n = resolveNumeric(val);
          if (n > 0) return n;
        }
      }
      // Try first numeric-like value in the object
      for (const [, v] of Object.entries(taxRevenueObj)) {
        const n = resolveNumeric(v);
        if (n > 0) return n;
      }
    }
    if (typeof taxRevenueObj === 'string') return resolveNumeric(taxRevenueObj);
    // Deep-find any revenue value anywhere in the response
    for (const pattern of [/revenue/i, /tax.*annual/i, /fiscal/i]) {
      const found = deepFind(d, pattern);
      if (found != null) {
        const n = resolveNumeric(found);
        if (n > 0) return n;
      }
    }
    return 0;
  })();
  const taxRevenueDisplay = (() => {
    if (totalRevenue > 0) return fmtDollars(totalRevenue);
    // Show raw string if available
    if (taxRevenueObj && typeof taxRevenueObj === 'object') {
      const s = pick(taxRevenueObj, 'annual', 'total', 'postAbatement');
      if (s && typeof s === 'string') return s;
    }
    if (typeof taxRevenueObj === 'string') return taxRevenueObj;
    // Last resort: find any dollar string in the data
    const anyDollar = deepFind(d, /revenue|tax/i);
    if (typeof anyDollar === 'string' && /\$/.test(anyDollar)) return anyDollar;
    return '—';
  })();

  // --- Jobs Created ---
  const jobImpactObj = pick(d, 'jobImpact', 'jobCreation', 'employment', 'laborMarket', 'jobs');
  const jobsCreated = (() => {
    // Try flat top-level
    const flat = resolveNumeric(pick(d, 'jobsCreated', 'totalJobs', 'totalJobsCreated', 'directJobs'));
    if (flat > 0) return flat;
    // Try structured job impact object
    if (jobImpactObj && typeof jobImpactObj === 'object') {
      let total = 0;
      const cp = pick(jobImpactObj, 'constructionPhase', 'constructionJobs', 'construction', 'temporary');
      const op = pick(jobImpactObj, 'operationalPhase', 'permanentJobs', 'operational', 'permanent');
      const sec = pick(jobImpactObj, 'secondaryJobs', 'indirectJobs', 'secondary', 'indirect');
      for (const phase of [cp, op, sec]) {
        if (phase == null) continue;
        if (typeof phase === 'number') { total += phase; continue; }
        if (typeof phase === 'object') {
          // Handle nested: {jobs: X} or {jobs: {mean: X}} or {estimated: X} or {count: X}
          const jobVal = phase.jobs ?? phase.mean ?? phase.estimated ?? phase.count ?? phase.total ?? phase.number;
          total += resolveNumeric(jobVal);
        }
      }
      if (total > 0) return total;
      // If the object has a total/mean directly
      const directTotal = resolveNumeric(pick(jobImpactObj, 'total', 'totalJobs', 'mean'));
      if (directTotal > 0) return directTotal;
    }
    // Deep-sum all fields named "jobs" anywhere
    const deepJobs = deepSum(d, /^(jobs|totalJobs|jobsCreated|estimated|permanentJobs|constructionJobs|operationalJobs)$/i);
    if (deepJobs > 0) return deepJobs;
    // Deep-find for any job-related number
    const foundJobs = deepFind(d, /jobs|employment|workers/i);
    return resolveNumeric(foundJobs);
  })();

  // --- ROI / Confidence ---
  const roi = resolveNumeric(pick(d, 'roi', 'returnOnInvestment', 'roiPercent', 'estimatedROI'));
  const confidenceLevel = pick(d, 'confidenceLevel', 'confidence', 'confidenceRating', 'confidenceScore')
    || deepFind(d, /^confidence/i);

  // --- Multiplier ---
  const multiplier = resolveNumeric(pick(d, 'fiscalMultiplier', 'multiplier', 'economicMultiplier', 'impactMultiplier'));

  // --- Assumptions ---
  const assumptions: any[] = (() => {
    const a = pick(d, 'assumptions', 'keyAssumptions', 'modelAssumptions');
    return Array.isArray(a) ? a : [];
  })();

  // --- Impact Analysis (for the scenario page, this is the big nested section) ---
  const impactAnalysis = pick(d, 'impactAnalysis', 'impacts', 'economicImpact', 'impactAreas', 'impactSummary');
  const simulationResults = pick(d, 'simulationResults', 'results', 'simulation');
  const simulationParams = pick(d, 'simulationParameters', 'parameters', 'params', 'modelParameters');

  // Yearly projections — the AI might use many names
  const projections: any[] = (() => {
    // First check impactAnalysis or simulationResults for year-based entries
    const yearSource = impactAnalysis || simulationResults;
    if (yearSource && typeof yearSource === 'object' && !Array.isArray(yearSource)) {
      const yearEntries = Object.entries(yearSource).filter(([k]) => /year|yr|horizon/i.test(k));
      if (yearEntries.length > 0) {
        return yearEntries.map(([k, v]: [string, any]) => ({
          year: labelify(k),
          ...(typeof v === 'object' ? flattenForChart(v) : { value: v }),
        }));
      }
    }
    const rawProj = pick(d, 'yearlyProjection', 'projections', 'annualProjection', 'yearlyForecast', 'forecast', 'yearlyData');
    if (Array.isArray(rawProj)) return rawProj;
    if (rawProj && typeof rawProj === 'object') {
      const entries = Object.entries(rawProj);
      if (entries.length > 0 && entries.every(([k]) => /year|yr|y\d/i.test(k))) {
        return entries.map(([k, v]: [string, any]) => ({
          year: labelify(k),
          ...(typeof v === 'object' ? flattenForChart(v) : { value: v }),
        }));
      }
    }
    return [];
  })();

  // Impacts — can be named many ways
  const impacts = pick(d, 'impacts', 'economicImpact', 'impactAreas', 'impactSummary', 'sectorImpacts');

  // Narrative
  const narrative = pick(d, 'narrative', 'analysis', 'summary', 'description', 'executiveSummary', 'conclusion');

  // Job impact, housing impact, utility impact, community benefit, risk factors (from API route type)
  const jobImpact = pick(d, 'jobImpact', 'jobCreation', 'employment', 'laborMarket');
  const housingImpact = pick(d, 'housingImpact', 'housing', 'realEstate');
  const utilityImpact = pick(d, 'utilityImpact', 'utilities', 'infrastructure');
  const communityBenefit = pick(d, 'communityBenefit', 'community', 'socialImpact');
  const riskFactors: any[] = (() => {
    const r = pick(d, 'riskFactors', 'risks', 'challenges', 'threats', 'concerns');
    return Array.isArray(r) ? r : [];
  })();

  // Base data snapshot
  const baseData = pick(d, 'baseDataSnapshot', 'baseData', 'contextData', 'marketData', 'baselineData');

  const handledKeys = new Set([
    'totalRevenue', 'revenue', 'totalTaxRevenue', 'estimatedRevenue', 'fiscalImpact', 'taxRevenue', 'totalEconomicImpact', 'taxImpact',
    'jobsCreated', 'jobs', 'totalJobs', 'jobCreation', 'directJobs', 'employment',
    'roi', 'returnOnInvestment', 'roiPercent', 'estimatedROI',
    'fiscalMultiplier', 'multiplier', 'economicMultiplier', 'impactMultiplier',
    'yearlyProjection', 'projections', 'annualProjection', 'yearlyForecast', 'forecast', 'yearlyData', 'timeline',
    'impacts', 'economicImpact', 'impactAreas', 'impactSummary', 'sectorImpacts',
    'narrative', 'analysis', 'summary', 'description', 'executiveSummary', 'conclusion',
    'jobImpact', 'laborMarket', 'housingImpact', 'housing', 'realEstate',
    'utilityImpact', 'utilities', 'infrastructure',
    'communityBenefit', 'community', 'socialImpact',
    'riskFactors', 'risks', 'challenges', 'threats', 'concerns',
    'scenarioResult', 'simulation', 'scenario', 'data', 'modelUsed',
    'confidenceLevel', 'confidence', 'confidenceRating', 'confidenceScore',
    'assumptions', 'keyAssumptions', 'modelAssumptions',
    'impactAnalysis', 'simulationResults', 'results',
    'simulationParameters', 'parameters', 'params', 'modelParameters',
    'baseDataSnapshot', 'baseData', 'contextData', 'marketData', 'baselineData',
    // Monte Carlo meta fields
    'simulationId', 'simulationName', 'simulationEngine', 'timestamp',
    'analysisHorizonsYears', 'contextualInvestments',
  ]);

  /** Flatten a nested year object to get just the `mean` values for charting */
  function flattenForChart(yearObj: any, prefix = ''): Record<string, number> {
    const result: Record<string, number> = {};
    if (!yearObj || typeof yearObj !== 'object') return result;
    for (const [k, v] of Object.entries(yearObj)) {
      const key = prefix ? `${prefix} ${labelify(k)}` : labelify(k);
      if (typeof v === 'number') result[key] = v;
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        if ('mean' in (v as any)) result[key] = Number((v as any).mean);
        else Object.assign(result, flattenForChart(v, key));
      }
    }
    return result;
  }

  /** Check if a key name suggests dollar values */
  function isDollarKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('cost') || k.includes('revenue') || k.includes('value') || k.includes('budget') ||
      k.includes('investment') || k.includes('price') || k.includes('amount') || k.includes('wage') ||
      k.includes('fund') || k.includes('salary') || k.includes('usd') || k.includes('dollar');
  }

  /* ─── Helper: render a nested impact section ─── */
  function renderImpactSection(title: string, data: any, icon: string) {
    if (!data) return null;
    if (typeof data === 'string') {
      return (
        <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{icon} {title}</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{data}</p>
        </div>
      );
    }
    if (typeof data === 'object') {
      const entries = Object.entries(data).filter(([, v]) => v != null && v !== '');
      return (
        <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{icon} {title}</h4>
          <div className="space-y-2.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm gap-3">
                <span className="text-slate-400">{labelify(k)}</span>
                <span className="text-slate-200 font-medium text-right">
                  {typeof v === 'number' ? (v > 10000 ? fmtDollars(v) : v.toLocaleString()) : typeof v === 'object' ? <SmartValue label={k} value={v} /> : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Scenario Modeler" subtitle="What-if economic impact scenarios for development decisions" accentColor="bg-compass-500" icon={<FlaskConical className="w-6 h-6" />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300">Scenario Parameters</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Investment Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="number" value={form.investmentAmount} onChange={e => setForm(f => ({ ...f, investmentAmount: Number(e.target.value) }))} className="input-field w-full pl-9 font-mono text-sm" min={1000000} step={1000000} />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">{formatCurrency(form.investmentAmount)}</p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Project Type</label>
            <select value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))} className="input-field w-full text-sm">
              {projectTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">District</label>
            <select value={form.district} onChange={e => setForm(f => ({ ...f, district: Number(e.target.value) }))} className="input-field w-full text-sm">
              {[1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={d}>District {d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Timeline (Years)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={20} value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: Number(e.target.value) }))} className="flex-1 accent-compass-500" />
              <span className="text-sm font-mono text-compass-400 w-12 text-right">{form.timeline}yr</span>
            </div>
          </div>

          <button type="submit" disabled={action.loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {action.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Run Scenario
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
                <StatCard label="Tax Revenue" value={taxRevenueDisplay} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-400" />
                <StatCard label="Jobs Created" value={jobsCreated > 0 ? formatNumber(jobsCreated) : '—'} icon={<Users className="w-4 h-4" />} color="text-blight-400" />
                <StatCard label={roi > 0 ? "ROI" : confidenceLevel ? "Confidence" : "Projections"} value={roi > 0 ? `${roi}%` : confidenceLevel ? String(confidenceLevel) : (projections.length > 0 ? `${projections.length} Periods` : hasData ? 'N/A' : '—')} icon={<TrendingUp className="w-4 h-4" />} color="text-compass-400" />
                <StatCard label={multiplier > 0 ? "Multiplier" : riskFactors.length > 0 ? "Risk Factors" : assumptions.length > 0 ? "Assumptions" : "Impact Areas"} value={multiplier > 0 ? `${multiplier}x` : riskFactors.length > 0 ? String(riskFactors.length) : assumptions.length > 0 ? String(assumptions.length) : hasData ? 'N/A' : '—'} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
              </div>

              {/* Simulation Parameters (if present) */}
              {simulationParams && typeof simulationParams === 'object' && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Simulation Parameters</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                    {Object.entries(simulationParams).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-2 text-sm">
                        <span className="text-slate-400 font-medium">{labelify(k)}:</span>
                        <span className={`font-medium ${isDollarKey(k) ? 'text-emerald-400 font-mono' : 'text-slate-200'}`}>
                          {typeof v === 'number' && isDollarKey(k) ? fmtDollars(v)
                            : typeof v === 'number' ? v.toLocaleString()
                            : typeof v === 'object' ? smartText(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Base Data Snapshot */}
              {baseData && typeof baseData === 'object' && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Base Data Snapshot</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                    {Object.entries(baseData).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-2 text-sm">
                        <span className="text-slate-400 font-medium">{labelify(k)}:</span>
                        <span className={`font-medium ${isDollarKey(k) ? 'text-emerald-400 font-mono' : 'text-slate-200'}`}>
                          {typeof v === 'number' && isDollarKey(k) ? fmtDollars(v)
                            : typeof v === 'number' ? v.toLocaleString()
                            : typeof v === 'string' && /^\$/.test(v) ? <span className="text-emerald-400 font-mono">{v}</span>
                            : typeof v === 'object' ? smartText(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Yearly Projection Chart */}
              {projections.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Annual Projection</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => typeof v === 'number' && Math.abs(v) >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : String(v)} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => typeof v === 'number' ? (Math.abs(v) > 1000 ? formatCurrency(v) : v.toLocaleString()) : v} />
                      {(() => {
                        const sample = projections[0] || {};
                        const numericKeys = Object.keys(sample).filter(k => k !== 'year' && typeof sample[k] === 'number');
                        const colors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
                        return numericKeys.slice(0, 6).map((key, i) => (
                          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} name={key} />
                        ));
                      })()}
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Also show projection data as a table for readability */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/30">
                          <th className="text-left py-1.5 px-2 text-slate-500 font-medium">Period</th>
                          {Object.keys(projections[0] || {}).filter(k => k !== 'year').map(k => (
                            <th key={k} className="text-right py-1.5 px-2 text-slate-500 font-medium">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {projections.map((row, i) => (
                          <tr key={i} className="border-b border-slate-800/30">
                            <td className="py-1.5 px-2 text-slate-300 font-medium">{row.year}</td>
                            {Object.entries(row).filter(([k]) => k !== 'year').map(([k, v]) => (
                              <td key={k} className="text-right py-1.5 px-2 text-slate-400 font-mono">
                                {typeof v === 'number' ? (isDollarKey(k) || Math.abs(v as number) > 10000 ? fmtDollars(v as number) : (v as number).toLocaleString()) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Impact Areas — generic object rendering */}
              {impacts && typeof impacts === 'object' && !Array.isArray(impacts) && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Impact Areas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(impacts).filter(([, v]) => v != null && v !== '').map(([key, val]: any) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <span className="text-sm text-slate-400">{labelify(key)}</span>
                        <span className="text-sm font-mono text-compass-400 font-medium">
                          {typeof val === 'number' ? (val > 10000 ? formatCurrency(val) : formatNumber(val))
                            : typeof val === 'object' ? <SmartValue label={key} value={val} /> : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector-specific impacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderImpactSection('Tax Revenue', taxRevenueObj, '💰')}
                {renderImpactSection('Job Impact', jobImpactObj, '👥')}
                {renderImpactSection('Housing Impact', housingImpact, '🏠')}
                {renderImpactSection('Utility Impact', utilityImpact, '⚡')}
                {renderImpactSection('Community Benefit', communityBenefit, '🏘️')}
              </div>

              {/* Assumptions */}
              {assumptions.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Key Assumptions</h3>
                  <div className="space-y-1.5">
                    {assumptions.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-slate-500 mt-0.5 text-sm">•</span>
                        <p className="text-sm text-slate-400 leading-relaxed">{typeof a === 'string' ? a : smartText(a)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {riskFactors.length > 0 && (
                <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Risk Factors</h3>
                  <div className="space-y-2">
                    {riskFactors.map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        <p className="text-sm text-slate-300 leading-relaxed">{typeof r === 'string' ? r : (pick(r, 'description', 'text', 'risk', 'factor', 'name', 'title') || smartText(r))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative */}
              {narrative && (
                <div className="glass-card p-6 border-l-4 border-l-compass-500">
                  <h3 className="text-sm font-semibold text-compass-300 mb-2">Scenario Analysis</h3>
                  <Markdown size="sm">{typeof narrative === 'string' ? narrative : smartText(narrative)}</Markdown>
                </div>
              )}

              {/* ★ ADAPTIVE FALLBACK ★ */}
              <AdaptiveRenderer data={d} excludeKeys={handledKeys} title="Additional Scenario Details" />
            </>
          ) : (
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-compass-500/10 flex items-center justify-center mb-4">
                <FlaskConical className="w-10 h-10 text-compass-500/30" />
              </div>
              <h3 className="text-lg font-semibold text-slate-400 mb-1">Model a Scenario</h3>
              <p className="text-sm text-slate-500 max-w-sm">Configure investment parameters and run the model to see projected fiscal impact, job creation, and ROI.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
