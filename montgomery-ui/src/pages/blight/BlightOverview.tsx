import { useFetch } from '@/hooks/useFetch';
import { blight } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building, AlertTriangle, TrendingUp, MapPin, ArrowRight } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function BlightOverview() {
  const { data, loading, error, refetch } = useFetch(blight.stats);

  if (loading) return <LoadingScreen message="Loading blight statistics..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const raw = data as any;
  // API returns { totals: {...}, blightAnalysis: {...}, nuisanceByDistrict: [...], violationsByStatus: [...] }
  const totals = raw?.totals || {};
  const analysis = raw?.blightAnalysis || {};
  const nuisanceByDistrict = raw?.nuisanceByDistrict || [];
  const violationsByStatus = raw?.violationsByStatus || [];
  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const quickActions = [
    { title: 'Nuisance Cases', desc: 'Environmental nuisance reports', link: '/blight/nuisances', color: 'border-blight-500/30 hover:border-blight-500/50' },
    { title: 'Code Violations', desc: 'Building code violations', link: '/blight/violations', color: 'border-amber-500/30 hover:border-amber-500/50' },
    { title: 'City Properties', desc: 'City-owned property assets', link: '/blight/properties', color: 'border-compass-500/30 hover:border-compass-500/50' },
    { title: 'Blight Scores', desc: 'AI-powered blight scoring', link: '/blight/scores', color: 'border-youthshield-500/30 hover:border-youthshield-500/50' },
    { title: 'Regeneration', desc: 'Census tract blueprints', link: '/blight/regeneration', color: 'border-emerald-500/30 hover:border-emerald-500/50' },
    { title: 'Contagion Model', desc: 'Blight spread analysis', link: '/blight/contagion', color: 'border-red-500/30 hover:border-red-500/50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Blight-to-Bright" subtitle="Transforming Montgomery's urban landscape through data-driven renewal" accentColor="bg-blight-500" icon={<Building className="w-6 h-6" />} />

      <div className="glass-card p-4 border-l-4 border-l-blight-500 bg-blight-500/5">
        <p className="text-sm text-blight-300 font-medium">Urban Renewal Engine</p>
        <p className="text-xs text-slate-400 mt-0.5">Turn environmental nuisances and code violations into neighborhood regeneration opportunities</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Nuisances" value={formatNumber(totals.nuisances ?? 0)} icon={<AlertTriangle className="w-4 h-4" />} color="text-blight-400" />
        <StatCard label="Code Violations" value={formatNumber(totals.codeViolations ?? 0)} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
        <StatCard label="City Properties" value={formatNumber(totals.cityOwnedProperties ?? 0)} icon={<MapPin className="w-4 h-4" />} color="text-compass-400" />
        <StatCard label="Avg Blight Score" value={analysis.avgBlightScore ?? '-'} icon={<TrendingUp className="w-4 h-4" />} color="text-youthshield-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nuisanceByDistrict.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Nuisances by District</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={nuisanceByDistrict}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="district" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {violationsByStatus.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Violations by Status</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={violationsByStatus.map((v: any) => ({ name: v.status, value: v.count }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {violationsByStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {quickActions.map(a => (
          <Link key={a.link} to={a.link} className={`glass-card p-5 border ${a.color} transition-all duration-300 group flex items-center justify-between`}>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-blight-300 transition-colors">{a.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blight-400 transition-all group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
