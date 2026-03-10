import { useFetch } from '@/hooks/useFetch';
import { compass } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Compass, DollarSign, FileText, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function CompassOverview() {
  const { data, loading, error, refetch } = useFetch(compass.stats);

  if (loading) return <LoadingScreen message="Loading compass data..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const s = data as any;
  const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  // API returns nested: { construction: { totalPermits, totalEstimatedCost, byType }, economy: { activeBusinessLicenses }, majorProjects: {...} }
  const totalPermits = s?.construction?.totalPermits ?? s?.totalPermits ?? 0;
  const totalInvestment = s?.construction?.totalEstimatedCost ?? s?.economicImpact ?? 0;
  const businessLicenses = s?.economy?.activeBusinessLicenses ?? s?.activeBusinessLicenses ?? 0;
  const majorProjects = s?.majorProjects ? Object.keys(s.majorProjects).length : (s?.activeProjects ?? 0);
  const permitsByType = s?.construction?.byType ?? s?.permitsByType ?? null;
  const majorProjectData = s?.majorProjects
    ? Object.entries(s.majorProjects).map(([key, val]: [string, any]) => ({
        name: val.status ? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c: string) => c.toUpperCase()) : key,
        investment: val.investment ?? '',
        jobs: val.permanentJobs ?? 0,
        status: val.status ?? 'Unknown',
      }))
    : null;

  const quickActions = [
    { title: 'Impact Dashboard', desc: 'Real-time fiscal impact analysis', link: '/compass/impact', color: 'border-compass-500/30 hover:border-compass-500/50' },
    { title: 'Scenario Modeler', desc: 'What-if economic scenarios', link: '/compass/scenario', color: 'border-blight-500/30 hover:border-blight-500/50' },
    { title: 'CBA Designer', desc: 'Cost-benefit analysis tool', link: '/compass/cba', color: 'border-youthshield-500/30 hover:border-youthshield-500/50' },
    { title: 'Permits', desc: 'Construction permit tracking', link: '/compass/permits', color: 'border-amber-500/30 hover:border-amber-500/50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="DataCenter Compass" subtitle="Guiding smart economic development decisions for Montgomery" accentColor="bg-compass-500" icon={<Compass className="w-6 h-6" />} />

      <div className="glass-card p-4 border-l-4 border-l-compass-500 bg-compass-500/5">
        <p className="text-sm text-compass-300 font-medium">Economic Intelligence Platform</p>
        <p className="text-xs text-slate-400 mt-0.5">Data-driven fiscal impact analysis for data center and economic development decisions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Permits" value={formatNumber(totalPermits)} icon={<FileText className="w-4 h-4" />} color="text-compass-400" />
        <StatCard label="Total Investment" value={formatCurrency(totalInvestment)} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-400" />
        <StatCard label="Major Projects" value={formatNumber(majorProjects)} icon={<BarChart3 className="w-4 h-4" />} color="text-blight-400" />
        <StatCard label="Business Licenses" value={formatNumber(businessLicenses)} icon={<TrendingUp className="w-4 h-4" />} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {permitsByType && Array.isArray(permitsByType) && permitsByType.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Permits by Type</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={permitsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {majorProjectData && majorProjectData.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Major Projects — Permanent Jobs</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={majorProjectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => `${v} jobs`} />
                <Bar dataKey="jobs" radius={[0, 4, 4, 0]}>
                  {majorProjectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map(a => (
          <Link key={a.link} to={a.link} className={`glass-card p-5 border ${a.color} transition-all duration-300 group flex items-center justify-between`}>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-compass-300 transition-colors">{a.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-compass-400 transition-all group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
