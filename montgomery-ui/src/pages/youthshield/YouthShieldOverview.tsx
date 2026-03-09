import { useFetch } from '@/hooks/useFetch';
import { youthshield } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { StatCard, LoadingScreen, ErrorDisplay, ModuleHeader } from '@/components/shared';
import { Users, School, Clock, MapPin, Heart, AlertTriangle, BookOpen, TreePine } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function YouthShieldOverview() {
  const { data, loading, error, refetch } = useFetch(() => youthshield.stats(), []);

  if (loading) return <LoadingScreen message="Loading YouthShield..." />;
  if (error || !data) return <ErrorDisplay error={error || 'Failed to load'} onRetry={refetch} />;

  const facilityData = [
    { name: 'Schools', count: data.facilities.schools, color: '#a855f7' },
    { name: 'Centers', count: data.facilities.communityCenters, color: '#c084fc' },
    { name: 'Parks', count: data.facilities.parks, color: '#7c3aed' },
    { name: 'Libraries', count: data.facilities.libraries, color: '#9333ea' },
    { name: 'Daycares', count: data.facilities.daycares, color: '#6d28d9' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <ModuleHeader
        title="YouthShield"
        subtitle="AI-Powered Youth Violence Prevention and Intervention Platform"
        accentColor="bg-youthshield-500"
        icon={<Users className="w-6 h-6" />}
      />

      {/* Key Metrics Banner */}
      <div className="glass-card p-5 border-l-4 border-l-youthshield-500 bg-youthshield-500/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold font-mono text-youthshield-400">{data.keyMetrics.homicideArrestsUnder21Pct}</p>
            <p className="text-[11px] text-slate-500">Homicide Arrests Under 21</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-amber-400">{data.keyMetrics.dangerWindowHours}</p>
            <p className="text-[11px] text-slate-500">Danger Window</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">{data.keyMetrics.interventionPrograms}</p>
            <p className="text-[11px] text-slate-500">Intervention Programs</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-red-400">{data.keyMetrics.gunViolenceRankNational}</p>
            <p className="text-[11px] text-slate-500">Gun Violence Rank</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Facilities" value={data.facilities.total} icon={<MapPin className="w-5 h-5" />} color="text-youthshield-400" />
        <StatCard label="High Risk Zones" value={data.riskAssessment.highRiskZones} icon={<AlertTriangle className="w-5 h-5" />} color="text-red-400" />
        <StatCard label="Critical Zones" value={data.riskAssessment.criticalZones} icon={<AlertTriangle className="w-5 h-5" />} color="text-amber-400" />
        <StatCard label="Avg Gap Score" value={data.riskAssessment.avgGapScore?.toFixed(1)} icon={<Clock className="w-5 h-5" />} color="text-blight-400" />
      </div>

      {/* Facilities Chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Youth Infrastructure</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={facilityData}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {facilityData.map((entry, i) => (
                <rect key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/youthshield/risk-zones', icon: AlertTriangle, label: 'Risk Zones', desc: 'Youth risk heat map' },
          { to: '/youthshield/gap-analysis', icon: Clock, label: 'Gap Analysis', desc: '3PM-8PM danger window' },
          { to: '/youthshield/resources', icon: BookOpen, label: 'Resources', desc: 'Community assets map' },
          { to: '/youthshield/intervention', icon: Heart, label: 'Intervention', desc: 'AI routing engine' },
        ].map(action => (
          <Link key={action.to} to={action.to} className="glass-card-hover p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-youthshield-500/20 flex items-center justify-center flex-shrink-0">
              <action.icon className="w-4 h-4 text-youthshield-400" />
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
