import { useFetch } from '@/hooks/useFetch';
import { compass } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, DollarSign, TrendingUp, Users, Building, AlertTriangle, Lightbulb } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function ImpactPage() {
  const { data, loading, error, refetch } = useFetch(compass.impact);

  if (loading) return <LoadingScreen message="Loading impact dashboard..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const d = data as any;

  // API returns: { totalInvestment, projects[], combinedImpact: { totalConstructionJobs, totalPermanentJobs, ... }, confidenceIntervals, keyRisks[], opportunities[] }
  const totalInvestment = d?.totalInvestment ?? 0;
  const projects = Array.isArray(d?.projects) ? d.projects : [];
  const combined = d?.combinedImpact ?? {};
  const totalJobs = (combined.totalConstructionJobs ?? 0) + (combined.totalPermanentJobs ?? 0);
  const permanentJobs = combined.totalPermanentJobs ?? 0;
  const constructionJobs = combined.totalConstructionJobs ?? 0;
  const confidence = d?.confidenceIntervals ?? {};
  const keyRisks: string[] = d?.keyRisks ?? [];
  const opportunities: string[] = d?.opportunities ?? [];

  // Build chart data from projects array
  const jobsChartData = projects.map((p: any) => ({
    name: p.name?.replace('Data Center', 'DC').replace('(Intermodal)', '') || 'Project',
    construction: p.constructionJobs ?? 0,
    permanent: p.permanentJobs ?? 0,
  }));

  const investmentChartData = projects.map((p: any) => ({
    name: p.name?.replace('Data Center', 'DC').replace('(Intermodal)', '') || 'Project',
    investment: p.investment ?? 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Impact Dashboard" subtitle="Combined fiscal impact of Montgomery's major economic investments" accentColor="bg-compass-500" icon={<Activity className="w-6 h-6" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Investment" value={formatCurrency(totalInvestment)} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-400" />
        <StatCard label="Total Jobs" value={formatNumber(totalJobs)} icon={<Users className="w-4 h-4" />} color="text-blight-400" />
        <StatCard label="Permanent Jobs" value={formatNumber(permanentJobs)} icon={<TrendingUp className="w-4 h-4" />} color="text-compass-400" />
        <StatCard label="Projects" value={formatNumber(projects.length)} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
      </div>

      {/* Combined Impact Details */}
      {(combined.projectedUtilityCostIncrease || combined.taxRevenueProjection) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {combined.taxRevenueProjection && (
            <div className="glass-card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Tax Revenue</p>
              <p className="text-sm font-semibold text-emerald-400">{combined.taxRevenueProjection}</p>
            </div>
          )}
          {combined.projectedUtilityCostIncrease && (
            <div className="glass-card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Utility Cost Impact</p>
              <p className="text-sm font-semibold text-amber-400">{combined.projectedUtilityCostIncrease}</p>
            </div>
          )}
          {combined.projectedHousingPriceIncrease && (
            <div className="glass-card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Housing Price Change</p>
              <p className="text-sm font-semibold text-blight-400">{combined.projectedHousingPriceIncrease}</p>
            </div>
          )}
          {combined.projectedWaterDemandIncrease && (
            <div className="glass-card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Water Demand</p>
              <p className="text-sm font-semibold text-cyan-400">{combined.projectedWaterDemandIncrease}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Project */}
        {jobsChartData.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Jobs by Project</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={jobsChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="construction" fill="#f59e0b" name="Construction" stackId="jobs" radius={[0, 0, 0, 0]} />
                <Bar dataKey="permanent" fill="#10b981" name="Permanent" stackId="jobs" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Investment by Project */}
        {investmentChartData.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Investment by Project</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={investmentChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1e9).toFixed(1)}B`} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="investment" radius={[0, 4, 4, 0]}>
                  {investmentChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Project Details */}
      {projects.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Project Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p: any, i: number) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                <h4 className="text-sm font-semibold text-white mb-2">{p.name}</h4>
                <div className="space-y-1 text-xs text-slate-400">
                  <p><span className="text-slate-500">Investment:</span> {typeof p.investment === 'number' ? formatCurrency(p.investment) : p.investment}</p>
                  <p><span className="text-slate-500">Status:</span> <span className="capitalize">{p.status?.replace(/_/g, ' ')}</span></p>
                  <p><span className="text-slate-500">Construction Jobs:</span> {formatNumber(p.constructionJobs ?? 0)}</p>
                  <p><span className="text-slate-500">Permanent Jobs:</span> {formatNumber(p.permanentJobs ?? 0)}</p>
                  {p.timeline && <p><span className="text-slate-500">Timeline:</span> {p.timeline}</p>}
                  {p.utilityImpact && <p><span className="text-slate-500">Utility:</span> {p.utilityImpact}</p>}
                  {p.housingImpact && <p><span className="text-slate-500">Housing:</span> {p.housingImpact}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Intervals */}
      {Object.keys(confidence).length > 0 && (
        <div className="glass-card p-6 border-l-4 border-l-compass-500">
          <h3 className="text-sm font-semibold text-compass-300 mb-3">Monte Carlo Confidence Intervals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(confidence).map(([key, val]) => (
              <div key={key} className="text-sm">
                <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-slate-300">{String(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Risks */}
        {keyRisks.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Key Risks
            </h3>
            <div className="space-y-2">
              {keyRisks.map((r, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400 flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-slate-300">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" /> Opportunities
            </h3>
            <div className="space-y-2">
              {opportunities.map((o, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-slate-300">{o}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
