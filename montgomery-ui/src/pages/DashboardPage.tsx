import { useFetch } from '@/hooks/useFetch';
import { command } from '@/lib/api';
import { formatNumber, formatCurrency, timeAgo } from '@/lib/utils';
import { StatCard, LoadingScreen, ErrorDisplay, AlertCard } from '@/components/shared';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Users, Building2, Compass, Activity, AlertTriangle,
  TrendingUp, Target, Clock, Zap, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Link } from 'react-router-dom';

const MODULE_COLORS = {
  sentinel: '#ef4444',
  youthshield: '#a855f7',
  blight: '#3b82f6',
  compass: '#10b981',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => command.dashboard(), []);

  if (loading) return <LoadingScreen message="Loading command dashboard..." />;
  if (error || !data) return <ErrorDisplay error={error || 'Failed to load dashboard'} onRetry={refetch} />;

  const d = data;

  // Prepare chart data
  const moduleOverview = [
    { name: 'Incidents', value: d.sentinel.totalIncidents, color: MODULE_COLORS.sentinel },
    { name: 'Risk Zones', value: d.youthshield.highRiskZones, color: MODULE_COLORS.youthshield },
    { name: 'Nuisances', value: d.blight.nuisances, color: MODULE_COLORS.blight },
    { name: 'Permits', value: d.compass.constructionPermits, color: MODULE_COLORS.compass },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Command Center
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome back, {user?.name?.split(' ')[0]}. Here's your city at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">System Online</span>
          </div>
          <span className="text-xs text-slate-500">
            {new Date(d.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Module Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Sentinel */}
        <Link to="/sentinel" className="group">
          <div className="module-card group-hover:border-sentinel-500/50 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sentinel-500 to-sentinel-700 rounded-t-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sentinel-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-sentinel-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sentinel MGM</h3>
                <p className="text-[11px] text-slate-500">Public Safety</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="stat-value text-2xl text-sentinel-400">{formatNumber(d.sentinel.totalIncidents)}</p>
                <p className="text-[11px] text-slate-500">Total Incidents</p>
              </div>
              <div>
                <p className="stat-value text-2xl text-white">{d.sentinel.officerCount}</p>
                <p className="text-[11px] text-slate-500">Officers</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`badge text-[10px] ${d.sentinel.status?.toUpperCase() === 'COMPLIANT' ? 'badge-success' : 'badge-danger'}`}>
                SB 298: {d.sentinel.status}
              </span>
              <span className="text-[11px] text-slate-600">{d.sentinel.criticalZones} critical zones</span>
            </div>
          </div>
        </Link>

        {/* YouthShield */}
        <Link to="/youthshield" className="group">
          <div className="module-card group-hover:border-youthshield-500/50 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-youthshield-500 to-youthshield-700 rounded-t-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-youthshield-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-youthshield-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">YouthShield</h3>
                <p className="text-[11px] text-slate-500">Youth Violence Prevention</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="stat-value text-2xl text-youthshield-400">{d.youthshield.highRiskZones}</p>
                <p className="text-[11px] text-slate-500">High Risk Zones</p>
              </div>
              <div>
                <p className="stat-value text-2xl text-white">{d.youthshield.schools}</p>
                <p className="text-[11px] text-slate-500">Schools</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="badge-warning text-[10px]">{d.youthshield.dangerWindow}</span>
              <span className="text-[11px] text-slate-600">{d.youthshield.communityCenters} centers</span>
            </div>
          </div>
        </Link>

        {/* Blight */}
        <Link to="/blight" className="group">
          <div className="module-card group-hover:border-blight-500/50 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blight-500 to-blight-700 rounded-t-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blight-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blight-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Blight-to-Bright</h3>
                <p className="text-[11px] text-slate-500">Urban Regeneration</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="stat-value text-2xl text-blight-400">{formatNumber(d.blight.nuisances)}</p>
                <p className="text-[11px] text-slate-500">Nuisances</p>
              </div>
              <div>
                <p className="stat-value text-2xl text-white">{d.blight.cityOwnedProperties}</p>
                <p className="text-[11px] text-slate-500">City Properties</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="badge-danger text-[10px]">{d.blight.criticalParcels} critical</span>
              <span className="text-[11px] text-slate-600">{d.blight.codeViolations} violations</span>
            </div>
          </div>
        </Link>

        {/* Compass */}
        <Link to="/compass" className="group">
          <div className="module-card group-hover:border-compass-500/50 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-compass-500 to-compass-700 rounded-t-2xl" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-compass-500/20 flex items-center justify-center">
                <Compass className="w-5 h-5 text-compass-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">DataCenter Compass</h3>
                <p className="text-[11px] text-slate-500">Economic Intelligence</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="stat-value text-2xl text-compass-400">{formatNumber(d.compass.constructionPermits)}</p>
                <p className="text-[11px] text-slate-500">Permits</p>
              </div>
              <div>
                <p className="stat-value text-2xl text-white">{d.compass.activeBusinesses}</p>
                <p className="text-[11px] text-slate-500">Businesses</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="badge-compass text-[10px]">{d.compass.majorProjectsTotal}</span>
              <span className="text-[11px] text-slate-600">{formatCurrency(d.compass.totalInvestment)}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Distribution Chart */}
        <div className="glass-card p-6 lg:col-span-1">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" /> Module Overview
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={moduleOverview}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {moduleOverview.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.8} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {moduleOverview.map(m => (
              <div key={m.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-xs text-slate-400">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Module Alerts */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Cross-Module Alerts
              {d.crossModule.recentAlerts > 0 && (
                <span className="badge-danger text-[10px]">{d.crossModule.recentAlerts} active</span>
              )}
            </h3>
            <Link to="/alerts" className="text-xs text-amber-500 hover:text-amber-400">View all →</Link>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
            {d.crossModule.alerts?.length ? (
              d.crossModule.alerts.slice(0, 5).map(alert => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  severity={alert.severity}
                  modules={alert.modules || []}
                  time={timeAgo(alert.createdAt)}
                  recommendation={alert.recommendation}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No active alerts</p>
                <p className="text-xs text-slate-600">The system will generate convergence alerts automatically</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
