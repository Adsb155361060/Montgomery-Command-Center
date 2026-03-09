import { useFetch } from '@/hooks/useFetch';
import { compass } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, DollarSign, TrendingUp, Users, Building } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function ImpactPage() {
  const { data, loading, error, refetch } = useFetch(compass.impact);

  if (loading) return <LoadingScreen message="Loading impact dashboard..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const d = data as any;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader title="Impact Dashboard" subtitle="Real-time fiscal impact analysis for Montgomery's economic development" accentColor="bg-compass-500" icon={<Activity className="w-6 h-6" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(d?.totalRevenue ?? d?.revenue ?? 0)} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-400" />
        <StatCard label="Jobs Created" value={formatNumber(d?.totalJobs ?? d?.jobs ?? 0)} icon={<Users className="w-4 h-4" />} color="text-blight-400" />
        <StatCard label="Fiscal Multiplier" value={`${d?.fiscalMultiplier ?? d?.multiplier ?? 0}x`} icon={<TrendingUp className="w-4 h-4" />} color="text-compass-400" />
        <StatCard label="Projects" value={formatNumber(d?.activeProjects ?? d?.projects ?? 0)} icon={<Building className="w-4 h-4" />} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d?.revenueTrend && Array.isArray(d.revenueTrend) && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: any) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#compassGrad)" strokeWidth={2} />
                <defs>
                  <linearGradient id="compassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {d?.jobsByCategory && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Jobs by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={Object.entries(d.jobsByCategory).map(([k, v]) => ({ category: k, count: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {d?.highlights && Array.isArray(d.highlights) && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Key Highlights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {d.highlights.map((h: any, i: number) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-compass-500/5 rounded-lg border border-compass-500/10">
                <span className="w-6 h-6 rounded-full bg-compass-500/20 flex items-center justify-center text-xs font-bold text-compass-400 flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-slate-300">{typeof h === 'string' ? h : h.text || h.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {d?.summary && (
        <div className="glass-card p-6 border-l-4 border-l-compass-500">
          <h3 className="text-sm font-semibold text-compass-300 mb-2">Executive Summary</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{d.summary}</p>
        </div>
      )}
    </div>
  );
}
