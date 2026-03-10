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

  // Helper: extract numeric value from nested {value, confidenceInterval95} objects
  function extractValue(obj: any): number {
    if (!obj) return 0;
    if (typeof obj === 'number') return obj;
    if (typeof obj === 'string') return resolveNumeric(obj);
    if (typeof obj === 'object' && 'value' in obj) return resolveNumeric(obj.value);
    if (typeof obj === 'object' && 'mean' in obj) return resolveNumeric(obj.mean);
    return resolveNumeric(obj);
  }

  // Helper: sum all {value} fields in a year's section (e.g. taxRevenue.property_annual_usd.value + sales_...)
  function sumYearSection(section: any): number {
    if (!section || typeof section !== 'object') return 0;
    let total = 0;
    for (const v of Object.values(section)) {
      total += extractValue(v);
    }
    return total;
  }

  // Helper: get impactAnalysis — AI returns either:
  //   Object: {year1: {taxRevenue, jobCreation, ...}, year3: {...}, ...}
  //   Array:  [{horizonYears: 1, jobs: {...}, taxRevenue: {...}, ...}, ...]
  const impactYearsRaw = pick(d, 'impactAnalysis', 'impact_analysis', 'projections');

  // Normalize to array of year objects
  const impactYearsList: any[] = (() => {
    if (!impactYearsRaw) return [];
    if (Array.isArray(impactYearsRaw)) return impactYearsRaw;
    if (typeof impactYearsRaw === 'object') {
      const entries = Object.entries(impactYearsRaw);
      const yearEntries = entries.filter(([k]) => /year|yr|horizon/i.test(k));
      if (yearEntries.length > 0) return yearEntries.map(([k, v]: [string, any]) => ({ _yearKey: k, ...v }));
      // Numeric keys (0,1,2...) — already array-like
      if (entries.every(([k]) => /^\d+$/.test(k))) return entries.map(([, v]) => v);
    }
    return [];
  })();

  // Pick a representative year for KPI display (prefer ~year5 for operational data)
  const kpiYear = (() => {
    if (impactYearsList.length === 0) return null;
    // If items have horizonYears, find year 5 or 10
    const byHorizon = impactYearsList.find((y: any) => y.horizonYears === 5 || y.horizon_years === 5)
      || impactYearsList.find((y: any) => y.horizonYears === 10 || y.horizon_years === 10)
      || impactYearsList.find((y: any) => y.horizonYears === 3 || y.horizon_years === 3);
    if (byHorizon) return byHorizon;
    // If items have _yearKey from object format
    const byKey = impactYearsList.find((y: any) => y._yearKey === 'year5')
      || impactYearsList.find((y: any) => y._yearKey === 'year10')
      || impactYearsList.find((y: any) => y._yearKey === 'year3');
    if (byKey) return byKey;
    // Fallback: middle element
    return impactYearsList[Math.min(2, impactYearsList.length - 1)];
  })();

  // --- Total Revenue / Tax Revenue ---
  const taxRevenueObj = pick(d, 'taxRevenue', 'tax_revenue', 'taxImpact', 'tax_impact', 'fiscalImpact', 'fiscal_impact', 'revenueProjection', 'revenue_projection');
  const totalRevenue = (() => {
    // Try flat top-level numbers
    const flat = resolveNumeric(pick(d, 'totalRevenue', 'total_revenue', 'totalTaxRevenue', 'total_tax_revenue', 'estimatedRevenue', 'estimated_revenue', 'annualTaxRevenue', 'annual_tax_revenue'));
    if (flat > 0) return flat;
    // Try nested taxRevenue object at top level
    if (taxRevenueObj && typeof taxRevenueObj === 'object') {
      for (const key of ['annual', 'annualRevenue', 'annual_revenue', 'total', 'totalAnnual', 'postAbatement', 'post_abatement', 'propertyTax', 'property_tax', 'salesTax', 'overAbatementPeriod']) {
        const val = (taxRevenueObj as any)[key];
        if (val != null) { const n = resolveNumeric(val); if (n > 0) return n; }
      }
      for (const [, v] of Object.entries(taxRevenueObj)) { const n = resolveNumeric(v); if (n > 0) return n; }
    }
    if (typeof taxRevenueObj === 'string') return resolveNumeric(taxRevenueObj);
    // ★ Try extracting from impactAnalysis year data (object or array format)
    if (kpiYear) {
      const yearTax = pick(kpiYear, 'taxRevenue', 'tax_revenue', 'fiscalImpact', 'fiscal_impact');
      if (yearTax && typeof yearTax === 'object') {
        const sum = sumYearSection(yearTax);
        if (sum > 0) return sum;
      }
    }
    // Try all impact years for the highest tax value
    for (const yr of impactYearsList) {
      const yrTax = pick(yr, 'taxRevenue', 'tax_revenue', 'fiscalImpact', 'fiscal_impact');
      if (yrTax && typeof yrTax === 'object') {
        const sum = sumYearSection(yrTax);
        if (sum > 0) return sum;
      }
    }
    return 0;
  })();
  const taxRevenueDisplay = (() => {
    if (totalRevenue > 0) return fmtDollars(totalRevenue);
    if (taxRevenueObj && typeof taxRevenueObj === 'object') {
      const s = pick(taxRevenueObj, 'annual', 'total', 'postAbatement');
      if (s && typeof s === 'string') return s;
    }
    if (typeof taxRevenueObj === 'string') return taxRevenueObj;
    return '—';
  })();

  // --- Jobs Created ---
  const jobImpactObj = pick(d, 'jobImpact', 'job_impact', 'jobCreation', 'job_creation', 'employment', 'laborMarket', 'labor_market', 'jobs');
  const jobsCreated = (() => {
    // Try flat top-level
    const flat = resolveNumeric(pick(d, 'jobsCreated', 'jobs_created', 'totalJobs', 'total_jobs', 'totalJobsCreated', 'directJobs'));
    if (flat > 0) return flat;
    // Try structured job impact object at top level
    if (jobImpactObj && typeof jobImpactObj === 'object') {
      let total = 0;
      for (const key of ['constructionPhase', 'construction_phase', 'constructionJobs', 'construction', 'temporary', 'operationalPhase', 'operational_phase', 'permanentJobs', 'operational', 'permanent', 'secondaryJobs', 'secondary_jobs', 'indirectJobs', 'secondary', 'indirect']) {
        const phase = jobImpactObj[key];
        if (phase == null) continue;
        if (typeof phase === 'number') { total += phase; continue; }
        if (typeof phase === 'object') { total += extractValue(phase.jobs ?? phase); }
      }
      if (total > 0) return total;
      const directTotal = resolveNumeric(pick(jobImpactObj, 'total', 'totalJobs', 'mean'));
      if (directTotal > 0) return directTotal;
    }
    // ★ Try extracting from impactAnalysis year data (object or array format)
    // The AI may use "jobCreation", "jobs", "job_creation", etc.
    if (kpiYear) {
      const yearJobs = pick(kpiYear, 'jobCreation', 'job_creation', 'jobs', 'jobImpact', 'job_impact', 'employment');
      if (yearJobs && typeof yearJobs === 'object') {
        const sum = sumYearSection(yearJobs);
        if (sum > 0) return sum;
      }
    }
    // Find peak employment across all impact years
    let peakJobs = 0;
    for (const yr of impactYearsList) {
      const yrJobs = pick(yr, 'jobCreation', 'job_creation', 'jobs', 'jobImpact', 'job_impact', 'employment');
      if (yrJobs && typeof yrJobs === 'object') {
        const sum = sumYearSection(yrJobs);
        if (sum > peakJobs) peakJobs = sum;
      }
    }
    if (peakJobs > 0) return peakJobs;
    return 0;
  })();

  // --- ROI / Confidence ---
  const roi = resolveNumeric(pick(d, 'roi', 'returnOnInvestment', 'roiPercent', 'estimatedROI', 'return_on_investment', 'roi_percent', 'estimated_roi'));
  // Only pick explicit confidence fields — do NOT deepFind as it matches confidenceInterval95
  const confidenceLevelRaw = pick(d, 'confidenceLevel', 'confidence_level', 'confidence', 'confidenceRating', 'confidence_rating');
  const confidenceLevel = (() => {
    if (!confidenceLevelRaw) return null;
    if (typeof confidenceLevelRaw === 'string') return confidenceLevelRaw;
    if (typeof confidenceLevelRaw === 'number') return `${confidenceLevelRaw}%`;
    if (typeof confidenceLevelRaw === 'object') {
      return pick(confidenceLevelRaw, 'level', 'rating', 'overall', 'description', 'text', 'grade')
        || smartText(confidenceLevelRaw);
    }
    return String(confidenceLevelRaw);
  })();

  // --- Multiplier ---
  const multiplier = resolveNumeric(pick(d, 'fiscalMultiplier', 'fiscal_multiplier', 'multiplier', 'economicMultiplier', 'economic_multiplier', 'impactMultiplier', 'impact_multiplier'));

  // --- Assumptions ---
  const assumptions: any[] = (() => {
    const a = pick(d, 'assumptions', 'keyAssumptions', 'key_assumptions', 'modelAssumptions', 'model_assumptions');
    return Array.isArray(a) ? a : [];
  })();

  // --- Impact Analysis (for the scenario page, this is the big nested section) ---
  const impactAnalysis = pick(d, 'impactAnalysis', 'impact_analysis', 'impacts', 'economicImpact', 'economic_impact', 'impactAreas', 'impact_areas', 'impactSummary', 'impact_summary');
  const simulationResults = pick(d, 'simulationResults', 'simulation_results', 'results', 'simulation');
  const simulationParams = pick(d, 'simulationParameters', 'simulation_parameters', 'parameters', 'params', 'modelParameters', 'model_parameters');

  // Yearly projections — the AI might use many names
  const projections: any[] = (() => {
    // ★ Use our normalized impactYearsList (handles both array and object formats)
    if (impactYearsList.length > 0) {
      return impactYearsList.map((yr: any, i: number) => {
        const label = yr._yearKey ? labelify(yr._yearKey)
          : yr.horizonYears != null ? `Year ${yr.horizonYears}`
          : yr.horizon_years != null ? `Year ${yr.horizon_years}`
          : yr.horizon ? String(yr.horizon).slice(0, 20)
          : `Year ${i + 1}`;
        const flat = flattenForChart(yr);
        // Remove non-numeric metadata from chart data
        delete flat['Horizon Years']; delete flat['Horizon']; delete flat['Summary'];
        return { year: label, ...flat };
      });
    }
    // Fallback: check simulationResults or other locations
    const yearSource = simulationResults;
    if (yearSource && typeof yearSource === 'object' && !Array.isArray(yearSource)) {
      const yearEntries = Object.entries(yearSource).filter(([k]) => /year|yr|horizon/i.test(k));
      if (yearEntries.length > 0) {
        return yearEntries.map(([k, v]: [string, any]) => ({
          year: labelify(k),
          ...(typeof v === 'object' ? flattenForChart(v) : { value: v }),
        }));
      }
    }
    const rawProj = pick(d, 'yearlyProjection', 'annualProjection', 'yearlyForecast', 'forecast', 'yearlyData');
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
  const impacts = pick(d, 'impacts', 'economicImpact', 'economic_impact', 'impactAreas', 'impact_areas', 'impactSummary', 'impact_summary', 'sectorImpacts', 'sector_impacts');

  // Narrative
  const narrative = pick(d, 'narrative', 'analysis', 'summary', 'description', 'executiveSummary', 'executive_summary', 'conclusion', 'scenarioAnalysis', 'scenario_analysis');

  // Job impact, housing impact, utility impact, community benefit, risk factors (from API route type)
  const jobImpact = pick(d, 'jobImpact', 'job_impact', 'jobCreation', 'job_creation', 'employment', 'laborMarket', 'labor_market');
  const housingImpact = pick(d, 'housingImpact', 'housing_impact', 'housing', 'realEstate', 'real_estate');
  const utilityImpact = pick(d, 'utilityImpact', 'utility_impact', 'utilities', 'infrastructure');
  const communityBenefit = pick(d, 'communityBenefit', 'community_benefit', 'community', 'socialImpact', 'social_impact');
  const riskFactors: any[] = (() => {
    const r = pick(d, 'riskFactors', 'risk_factors', 'riskAssessment', 'risk_assessment', 'risks', 'challenges', 'threats', 'concerns');
    return Array.isArray(r) ? r : [];
  })();

  // Base data snapshot
  const baseData = pick(d, 'baseDataSnapshot', 'base_data_snapshot', 'baseData', 'base_data', 'contextData', 'context_data', 'marketData', 'market_data', 'baselineData', 'baseline_data');

  const handledKeys = new Set([
    'totalRevenue', 'total_revenue', 'revenue', 'totalTaxRevenue', 'total_tax_revenue', 'estimatedRevenue', 'estimated_revenue', 'fiscalImpact', 'fiscal_impact', 'taxRevenue', 'tax_revenue', 'totalEconomicImpact', 'total_economic_impact', 'taxImpact', 'tax_impact', 'revenueProjection', 'revenue_projection', 'revenueProjections', 'revenue_projections', 'annualTaxRevenue', 'annual_tax_revenue',
    'jobsCreated', 'jobs_created', 'jobs', 'totalJobs', 'total_jobs', 'jobCreation', 'job_creation', 'directJobs', 'direct_jobs', 'employment',
    'roi', 'returnOnInvestment', 'return_on_investment', 'roiPercent', 'roi_percent', 'estimatedROI', 'estimated_roi',
    'fiscalMultiplier', 'fiscal_multiplier', 'multiplier', 'economicMultiplier', 'economic_multiplier', 'impactMultiplier', 'impact_multiplier',
    'yearlyProjection', 'projections', 'annualProjection', 'yearlyForecast', 'forecast', 'yearlyData', 'timeline',
    'impacts', 'economicImpact', 'economic_impact', 'impactAreas', 'impact_areas', 'impactSummary', 'impact_summary', 'sectorImpacts', 'sector_impacts',
    'narrative', 'analysis', 'summary', 'description', 'executiveSummary', 'executive_summary', 'conclusion', 'scenarioAnalysis', 'scenario_analysis',
    'jobImpact', 'job_impact', 'laborMarket', 'labor_market', 'housingImpact', 'housing_impact', 'housing', 'realEstate', 'real_estate',
    'utilityImpact', 'utility_impact', 'utilities', 'infrastructure',
    'communityBenefit', 'community_benefit', 'community', 'socialImpact', 'social_impact',
    'riskFactors', 'risk_factors', 'riskAssessment', 'risk_assessment', 'risks', 'challenges', 'threats', 'concerns',
    'scenarioResult', 'simulation', 'scenario', 'data', 'modelUsed', 'model_used',
    'confidenceLevel', 'confidence_level', 'confidence', 'confidenceRating', 'confidence_rating', 'confidenceScore', 'confidence_score',
    'assumptions', 'keyAssumptions', 'key_assumptions', 'modelAssumptions', 'model_assumptions',
    'impactAnalysis', 'impact_analysis', 'simulationResults', 'simulation_results', 'results',
    'simulationParameters', 'simulation_parameters', 'parameters', 'params', 'modelParameters', 'model_parameters',
    'baseDataSnapshot', 'base_data_snapshot', 'baseData', 'base_data', 'contextData', 'context_data', 'marketData', 'market_data', 'baselineData', 'baseline_data',
    // Monte Carlo meta fields
    'simulationId', 'simulation_id', 'simulationName', 'simulation_name', 'simulationEngine', 'simulation_engine', 'timestamp',
    'analysisHorizonsYears', 'analysis_horizons_years', 'contextualInvestments', 'contextual_investments',
    'scenarioID', 'scenario_id', 'scenarioDetails', 'scenario_details', 'validationNotes', 'validation_notes',
    'communityBenefitAgreementRecommendations', 'community_benefit_agreement_recommendations',
    'communityBenefitRecommendations', 'community_benefit_recommendations',
    'comparableCityAnalysis', 'comparable_city_analysis',
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
                <StatCard label={roi > 0 ? "ROI" : confidenceLevel ? "Confidence" : "Projections"} value={roi > 0 ? `${roi}%` : confidenceLevel ? confidenceLevel : (projections.length > 0 ? `${projections.length} Periods` : '—')} icon={<TrendingUp className="w-4 h-4" />} color="text-compass-400" />
                <StatCard label={multiplier > 0 ? "Multiplier" : riskFactors.length > 0 ? "Risk Factors" : assumptions.length > 0 ? "Assumptions" : "Impact Areas"} value={multiplier > 0 ? `${multiplier}x` : riskFactors.length > 0 ? String(riskFactors.length) : assumptions.length > 0 ? String(assumptions.length) : '—'} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
              </div>

              {/* Executive Summary — at-a-glance key findings from impactAnalysis */}
              {(kpiYear || riskFactors.length > 0 || jobImpact || housingImpact) && (
                <div className="glass-card p-5 border-l-4 border-l-compass-500 bg-compass-500/5">
                  <h3 className="text-sm font-semibold text-compass-300 mb-3">Key Findings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Job Creation summary from impactAnalysis or top-level */}
                    {(() => {
                      // Try impactAnalysis year data first
                      const yearJobs = kpiYear ? pick(kpiYear, 'jobCreation', 'job_creation', 'jobImpact', 'job_impact') : null;
                      const jObj = yearJobs || jobImpact;
                      if (!jObj || typeof jObj !== 'object') return null;
                      const cpKey = Object.keys(jObj).find(k => /construct|temporary/i.test(k));
                      const opKey = Object.keys(jObj).find(k => /operat|permanent/i.test(k));
                      const secKey = Object.keys(jObj).find(k => /secondary|indirect/i.test(k));
                      const cpJobs = cpKey ? extractValue(jObj[cpKey]) : 0;
                      const opJobs = opKey ? extractValue(jObj[opKey]) : 0;
                      const secJobs = secKey ? extractValue(jObj[secKey]) : 0;
                      return (cpJobs > 0 || opJobs > 0 || secJobs > 0) ? (
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Job Creation</div>
                          {cpJobs > 0 && <div className="text-sm text-slate-300"><strong className="text-blue-400">{cpJobs.toLocaleString()}</strong> construction</div>}
                          {opJobs > 0 && <div className="text-sm text-slate-300"><strong className="text-emerald-400">{opJobs.toLocaleString()}</strong> permanent</div>}
                          {secJobs > 0 && <div className="text-sm text-slate-300"><strong className="text-purple-400">{secJobs.toLocaleString()}</strong> secondary/indirect</div>}
                        </div>
                      ) : null;
                    })()}
                    {/* Housing Impact */}
                    {(() => {
                      const yearHousing = kpiYear ? pick(kpiYear, 'housingMarket', 'housing_market', 'housingImpact', 'housing_impact') : null;
                      const hObj = yearHousing || housingImpact;
                      if (!hObj || typeof hObj !== 'object') return null;
                      const entries = Object.entries(hObj).filter(([, v]) => v != null).slice(0, 3);
                      return entries.length > 0 ? (
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Housing Impact</div>
                          {entries.map(([k, v]) => (
                            <div key={k} className="text-sm text-slate-300">{labelify(k)}: <strong className="text-amber-400">{typeof v === 'object' ? `${extractValue(v)}%` : String(v)}</strong></div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {/* Tax Revenue */}
                    {totalRevenue > 0 && (
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tax Revenue (Year 5)</div>
                        <div className="text-xl font-bold text-emerald-400">{fmtDollars(totalRevenue)}</div>
                      </div>
                    )}
                    {/* Top Risk */}
                    {riskFactors.length > 0 && (
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Top Risk ({riskFactors.length} total)</div>
                        <div className="text-sm text-amber-300">{typeof riskFactors[0] === 'string' ? riskFactors[0].slice(0, 120) : (pick(riskFactors[0], 'description', 'text', 'risk', 'factor', 'name', 'title') || smartText(riskFactors[0])).slice(0, 120)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                    {riskFactors.map((r: any, i: number) => {
                      const riskText = typeof r === 'string' ? r : (pick(r, 'description', 'text', 'risk', 'factor', 'name', 'title') || smartText(r));
                      const riskTitle = typeof r === 'object' ? pick(r, 'risk', 'name', 'title', 'category') : null;
                      const probability = typeof r === 'object' ? pick(r, 'probability', 'likelihood') : null;
                      const mitigation = typeof r === 'object' ? pick(r, 'mitigationStrategy', 'mitigation_strategy', 'mitigation', 'recommendation') : null;
                      return (
                        <div key={i} className="p-3 bg-slate-800/20 rounded-lg border border-amber-500/10">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">⚠</span>
                            <div className="flex-1">
                              {riskTitle && riskTitle !== riskText && <p className="text-sm font-semibold text-amber-300 mb-1">{riskTitle}</p>}
                              <p className="text-sm text-slate-300 leading-relaxed">{riskText}</p>
                              {probability && <p className="text-xs text-slate-500 mt-1">Probability: {probability}</p>}
                              {mitigation && <p className="text-xs text-emerald-400 mt-1">Mitigation: {mitigation}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
