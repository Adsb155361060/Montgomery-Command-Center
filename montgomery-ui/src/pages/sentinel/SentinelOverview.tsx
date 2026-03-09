import { useFetch } from '@/hooks/useFetch';
import { sentinel } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { StatCard, LoadingScreen, ErrorDisplay, ModuleHeader } from '@/components/shared';
import { Shield, Activity, Target, Users, Radio, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22d3ee', '#a855f7', '#ec4899', '#6366f1'];

export default function SentinelOverview() {
  const { data, loading, error, refetch } = useFetch(() => sentinel.stats(), []);

  if (loading) return <LoadingScreen message="Loading Sentinel MGM..." />;
  if (error || !data) return <ErrorDisplay error={error || 'Failed to load'} onRetry={refetch} />;

  return (
    <div className="space-y-8 animate-fade-in">
      <ModuleHeader
        title="Sentinel MGM"
        subtitle="AI Force Multiplier for Montgomery's 290-Officer Police Department"
        accentColor="bg-sentinel-500"
        icon={<Shield className="w-6 h-6" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Incidents"
          value={formatNumber(data.totalIncidents)}
          icon={<Activity className="w-5 h-5" />}
          color="text-sentinel-400"
        />
        <StatCard
          label="Critical Zones"
          value={data.criticalZones}
          icon={<Target className="w-5 h-5" />}
          color="text-amber-400"
        />
        <StatCard
          label="Current Officers"
          value={data.compliance.currentOfficers}
          trend={`Need ${data.compliance.requiredOfficers - data.compliance.currentOfficers} more`}
          icon={<Users className="w-5 h-5" />}
          color="text-white"
        />
        <StatCard
          label="911 Calls"
          value={formatNumber(data.total911Calls)}
          icon={<Radio className="w-5 h-5" />}
          color="text-blight-400"
        />
      </div>

      {/* Compliance Banner */}
      <div className={`glass-card p-5 border-l-4 ${data.compliance.status === 'compliant' ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">SB 298 Compliance Status</h3>
            <p className="text-xs text-slate-400 mt-1">
              Current ratio: {data.compliance.ratio?.toFixed(2)} officers per 1,000 residents
              (required: 2.0)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge text-xs ${data.compliance.status === 'compliant' ? 'badge-success' : 'badge-danger'}`}>
              {data.compliance.status?.toUpperCase()}
            </span>
            <Link to="/sentinel/compliance" className="text-xs text-amber-500 hover:text-amber-400">Details →</Link>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Type */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.incidentsByType?.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="type" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By District */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Incidents by District</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.byDistrict} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="count" nameKey="district" label={({ district }) => `D${district}`}>
                {data.byDistrict?.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.8} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/sentinel/incidents', icon: Activity, label: 'View Incidents', desc: 'Browse all incident records' },
          { to: '/sentinel/force-multiplier', icon: Target, label: 'Force Multiplier', desc: 'AI risk zone analysis' },
          { to: '/sentinel/deployment', icon: MapPin, label: 'Deployment Optimizer', desc: 'Optimize shift assignments' },
          { to: '/sentinel/recruitment', icon: Users, label: 'Recruitment ROI', desc: 'Model hiring impact' },
        ].map(action => (
          <Link key={action.to} to={action.to} className="glass-card-hover p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sentinel-500/20 flex items-center justify-center flex-shrink-0">
              <action.icon className="w-4 h-4 text-sentinel-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{action.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
