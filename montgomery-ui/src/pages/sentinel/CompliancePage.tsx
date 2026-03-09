import { useFetch } from '@/hooks/useFetch';
import { sentinel } from '@/lib/api';
import { LoadingScreen, ErrorDisplay, ModuleHeader, StatCard } from '@/components/shared';
import { FileBarChart, Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export default function CompliancePage() {
  const { data, loading, error, refetch } = useFetch(() => sentinel.compliance(), []);

  if (loading) return <LoadingScreen message="Loading SB 298 compliance data..." />;
  if (error || !data) return <ErrorDisplay error={error || 'Failed to load'} onRetry={refetch} />;

  const { current, projections, sb298 } = data as any;

  const compliancePct = current?.compliancePercent || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <ModuleHeader
        title="SB 298 Compliance Dashboard"
        subtitle="Track Montgomery's progress toward staffing requirements"
        accentColor="bg-sentinel-500"
        icon={<FileBarChart className="w-6 h-6" />}
      />

      {/* Status Banner */}
      <div className={`glass-card p-6 border-l-4 ${sb298?.status === 'compliant' ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className={`w-5 h-5 ${sb298?.status === 'compliant' ? 'text-emerald-400' : 'text-red-400'}`} />
          <h3 className="text-lg font-display font-bold text-white">
            {sb298?.status === 'compliant' ? 'Compliant' : 'Non-Compliant'}
          </h3>
        </div>
        <p className="text-sm text-slate-400">{sb298?.threshold}</p>
        <p className="text-xs text-slate-500 mt-1">{sb298?.consequence}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Current Officers" value={current?.officers || 0} icon={<Users className="w-5 h-5" />} color="text-white" />
        <StatCard label="Required Officers" value={current?.required || 0} icon={<Users className="w-5 h-5" />} color="text-sentinel-400" />
        <StatCard label="Officer Gap" value={current?.gap || 0} icon={<TrendingUp className="w-5 h-5" />} color="text-amber-400" />
        <StatCard label="Salary Gap vs Fire" value={formatCurrency(current?.salaryGap || 0)} icon={<DollarSign className="w-5 h-5" />} color="text-red-400" />
      </div>

      {/* Compliance Progress Bar */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Compliance Progress</h3>
          <span className="text-sm font-mono text-amber-400">{compliancePct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-1000 ${compliancePct >= 100 ? 'bg-emerald-500' : compliancePct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, compliancePct)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Current: {current?.ratio?.toFixed(2)} per 1K</span>
          <span>Required: {current?.requiredRatio} per 1K</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 mb-1">Population</p>
          <p className="text-xl font-bold font-mono text-white">{current?.population?.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 mb-1">Current Salary</p>
          <p className="text-xl font-bold font-mono text-white">{formatCurrency(current?.currentSalary || 0)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 mb-1">Weekly Attrition</p>
          <p className="text-xl font-bold font-mono text-red-400">{current?.weeklyAttrition} officers/week</p>
        </div>
      </div>

      {/* Scenarios Chart */}
      {projections?.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Compliance Scenarios</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projections}>
              <XAxis dataKey="scenario" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="monthsToCompliance" fill="#ef4444" name="Months to Compliance" radius={[6, 6, 0, 0]} />
              <Bar dataKey="netGainPerMonth" fill="#10b981" name="Net Gain/Month" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {projections.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <span className="text-sm text-slate-300">{p.scenario}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">Projected date: {p.projectedDate}</span>
                  <span className="text-xs font-mono text-amber-400">{formatCurrency(p.annualCostIncrease)}/yr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
