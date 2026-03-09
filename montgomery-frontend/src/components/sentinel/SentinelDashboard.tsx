import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Shield, AlertTriangle, MapPin, Phone, Users,
  RefreshCw, Loader2, Zap, Search, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { sentinelApi } from '../../api/sentinel';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import KPICard from '../shared/KPICard';
import { SkeletonCard, SkeletonTable } from '../shared/LoadingSkeleton';
import ErrorState from '../shared/ErrorState';
import Badge, { severityColor } from '../shared/Badge';
import Pagination from '../shared/Pagination';

interface OutletCtx { district: string }

const TABS = ['Overview', 'Incidents', 'Force Multiplier', 'Deployment', 'Compliance', 'ROI Calculator', 'Analysis'];
const ANALYSIS_TYPES = ['business_robbery', 'district_analysis', 'patrol_optimization'];
const SHIFTS = ['day', 'evening', 'night'];

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function SentinelDashboard() {
  const { district } = useOutletContext<OutletCtx>();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([]);
  const [incidentPagination, setIncidentPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [fmZones, setFmZones] = useState<Record<string, unknown>[]>([]);
  const [fmPagination, setFmPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Filters
  const [incidentType, setIncidentType] = useState('');
  const [fmShift, setFmShift] = useState('');
  const [incidentPage, setIncidentPage] = useState(1);
  const [fmPage, setFmPage] = useState(1);

  // Deployment form
  const [deployOfficers, setDeployOfficers] = useState(14);
  const [deployShift, setDeployShift] = useState('day');
  const [deployDistrict, setDeployDistrict] = useState('');
  const [deployResult, setDeployResult] = useState<Record<string, unknown> | null>(null);
  const [deploying, setDeploying] = useState(false);

  // ROI form
  const [roiOfficers, setRoiOfficers] = useState(10);
  const [roiDistrict, setRoiDistrict] = useState('');
  const [roiShift, setRoiShift] = useState('day');
  const [roiResult, setRoiResult] = useState<Record<string, unknown> | null>(null);
  const [calculatingRoi, setCalculatingRoi] = useState(false);

  // Analysis form
  const [analysisType, setAnalysisType] = useState('district_analysis');
  const [analysisQuery, setAnalysisQuery] = useState('Provide a comprehensive safety analysis for Montgomery, Alabama.');
  const [analysisDistrict, setAnalysisDistrict] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Compliance scenario
  const [complianceScenario, setComplianceScenario] = useState<Record<string, unknown> | null>(null);
  const [runningScenario, setRunningScenario] = useState(false);

  // FM recalculate
  const [recalculating, setRecalculating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const s = await sentinelApi.stats(district || undefined);
      setStats(s);
    } catch (e) { setErr(getErrorMessage(e)); }
  }, [district]);

  const fetchIncidents = useCallback(async (page = 1) => {
    try {
      const r = await sentinelApi.incidents({ district: district || undefined, page, limit: 50, type: incidentType || undefined });
      setIncidents(r.incidents || []);
      if (r.pagination) setIncidentPagination(r.pagination);
    } catch (e) { toastError('Incidents error', getErrorMessage(e)); }
  }, [district, incidentType, toastError]);

  const fetchFmZones = useCallback(async (page = 1) => {
    try {
      const r = await sentinelApi.forceMultiplier({ district: district || undefined, shift: fmShift || undefined, page, limit: 50 });
      setFmZones(r.zones || []);
      if (r.pagination) setFmPagination(r.pagination);
    } catch (e) { toastError('Force multiplier error', getErrorMessage(e)); }
  }, [district, fmShift, toastError]);

  const fetchCompliance = useCallback(async () => {
    try {
      const r = await sentinelApi.compliance();
      setCompliance(r);
    } catch (e) { toastError('Compliance error', getErrorMessage(e)); }
  }, [toastError]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchIncidents(), fetchFmZones(), fetchCompliance()])
      .finally(() => setLoading(false));
  }, [fetchStats, fetchIncidents, fetchFmZones, fetchCompliance]);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const r = await sentinelApi.deployment({ officerCount: deployOfficers, shift: deployShift, district: deployDistrict || undefined });
      setDeployResult(r);
      success('Deployment Plan Ready', 'AI optimized officer assignments');
    } catch (e) { toastError('Deployment failed', getErrorMessage(e)); }
    finally { setDeploying(false); }
  };

  const handleRoi = async () => {
    setCalculatingRoi(true);
    try {
      const r = await sentinelApi.recruitmentRoi({ additionalOfficers: roiOfficers, district: roiDistrict || undefined, shift: roiShift });
      setRoiResult(r);
      success('ROI Calculated', 'Recruitment impact analysis ready');
    } catch (e) { toastError('ROI calculation failed', getErrorMessage(e)); }
    finally { setCalculatingRoi(false); }
  };

  const handleAnalyze = async () => {
    if (!analysisQuery.trim()) return;
    setAnalyzing(true);
    setAnalysisResult('');
    try {
      const r = await sentinelApi.analyze({ analysisType, query: analysisQuery, district: analysisDistrict || undefined });
      setAnalysisResult(r.analysis || JSON.stringify(r, null, 2));
    } catch (e) { toastError('Analysis failed', getErrorMessage(e)); }
    finally { setAnalyzing(false); }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const r = await sentinelApi.recalculateZones();
      success('Zones Recalculated', r.message || 'Force multiplier zones updated');
      fetchFmZones();
    } catch (e) { toastError('Recalculation failed', getErrorMessage(e)); }
    finally { setRecalculating(false); }
  };

  const handleComplianceScenario = async () => {
    setRunningScenario(true);
    try {
      const r = await sentinelApi.complianceScenario({ targetOfficers: 402, timeline: '3years' });
      setComplianceScenario(r);
    } catch (e) { toastError('Scenario failed', getErrorMessage(e)); }
    finally { setRunningScenario(false); }
  };

  const complianceCurrent = (compliance?.current as Record<string, unknown>) || {};
  const kpis = [
    { label: 'Total Incidents', value: (stats?.totalIncidents as number) || 0, icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/20' },
    { label: 'Critical Zones', value: (stats?.criticalZones as number) || 0, icon: MapPin, color: 'text-orange-400', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/20' },
    { label: 'Police Stations', value: (stats?.policeStations as number) || 0, icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/15', borderColor: 'border-red-500/20' },
    { label: '911 Calls', value: (stats?.total911Calls as number) || 0, icon: Phone, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/20' },
    { label: 'Officers', value: (complianceCurrent.officers as number) || 290, icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/20', subtitle: `Gap: ${(complianceCurrent.gap as number) || 112} to comply` },
  ];

  const incidentChartData = (stats?.incidentsByType as { type: string; count: number }[]) || [];
  const districtChartData = (stats?.byDistrict as { district: string; count: number }[]) || [];

  if (err && !stats) return <ErrorState message={err} onRetry={fetchStats} />;

  return (
    <div className="space-y-6 animate-slide-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Sentinel MGM</h1>
            <p className="text-slate-400 text-sm">Public Safety Intelligence</p>
          </div>
        </div>
        <button onClick={() => { fetchStats(); fetchIncidents(incidentPage); fetchFmZones(fmPage); fetchCompliance(); }} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {loading ? Array.from({length:5}).map((_,i)=><SkeletonCard key={i}/>) :
          kpis.map((k,i)=>(
            <motion.div key={k.label} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
              <KPICard {...k} />
            </motion.div>
          ))
        }
      </div>

      {/* Compliance Status Bar */}
      {compliance && (
        <div className="glass rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">SB 298 Compliance</span>
            <Badge label={(complianceCurrent.status as string) || 'Non-Compliant'} color={severityColor((complianceCurrent.status as string) || 'non-compliant')} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((complianceCurrent.officers as number||290) / (complianceCurrent.required as number||402)) * 100)}%` }} />
            </div>
            <span className="text-xs text-slate-400">
              {complianceCurrent.officers as number || 290} / {complianceCurrent.required as number || 402} officers
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Incidents by Type</h3>
            {loading ? <div className="h-48 shimmer-bg rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incidentChartData.slice(0,10)}>
                  <XAxis dataKey="type" tick={{fontSize:10, fill:'#94a3b8'}} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                  <Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Incidents by District</h3>
            {loading ? <div className="h-48 shimmer-bg rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={districtChartData} layout="vertical">
                  <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}} />
                  <YAxis dataKey="district" type="category" tick={{fontSize:10,fill:'#94a3b8'}} width={70} />
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === 'Incidents' && (
        <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={incidentType} onChange={e => setIncidentType(e.target.value)} placeholder="Filter by type..."
                className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 w-48" />
            </div>
            <button onClick={() => fetchIncidents(1)} className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors">Filter</button>
          </div>
          {loading ? <SkeletonTable rows={8} /> : (
            <>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/60">
                    <tr>{['Date','Type','Category','District','H3 Index','Address'].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {incidents.map((inc) => (
                      <tr key={inc.id as string} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{inc.incidentDate ? new Date(inc.incidentDate as string).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-xs font-medium text-white">{(inc.incidentType as string) || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{(inc.category as string) || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{(inc.district as string) || '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500 truncate max-w-24">{(inc.h3Index as string) || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-40">{(inc.address as string) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={incidentPage} totalPages={incidentPagination.totalPages} total={incidentPagination.total} limit={50} onPageChange={p => { setIncidentPage(p); fetchIncidents(p); }} />
            </>
          )}
        </div>
      )}

      {tab === 'Force Multiplier' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">AI-calculated prevention scores for patrol zones</p>
            <div className="flex items-center gap-2">
              <select value={fmShift} onChange={e => setFmShift(e.target.value)}
                className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none">
                <option value="">All Shifts</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => fetchFmZones(1)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors">Filter</button>
              <button onClick={handleRecalculate} disabled={recalculating}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                {recalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                AI Recalculate
              </button>
            </div>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? <SkeletonTable /> : (
              <>
                <div className="overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>{['H3 Index','District','Shift','Prevention Score','Incidents','Nuisances','Last Updated'].map(h=>(
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {fmZones.map((z) => (
                        <tr key={z.id as string} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">{(z.h3Index as string)?.slice(0,12)}...</td>
                          <td className="px-4 py-3 text-xs text-white">{(z.district as string) || '—'}</td>
                          <td className="px-4 py-3"><Badge label={(z.shift as string) || 'all'} color="blue" /></td>
                          <td className="px-4 py-3 w-40"><ScoreBar score={z.preventionScore as number || 0} /></td>
                          <td className="px-4 py-3 text-xs text-slate-300">{z.incidentCount as number || 0}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{z.nuisanceCount as number || 0}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{z.calculatedAt ? new Date(z.calculatedAt as string).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={fmPage} totalPages={fmPagination.totalPages} total={fmPagination.total} limit={50} onPageChange={p => { setFmPage(p); fetchFmZones(p); }} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Deployment' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-5">
            <h3 className="font-semibold text-white">Deployment Optimizer</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Officer Count: <span className="text-white font-bold">{deployOfficers}</span></label>
              <input type="range" min={1} max={50} value={deployOfficers} onChange={e => setDeployOfficers(+e.target.value)}
                className="w-full accent-red-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Shift</label>
              <div className="flex gap-2">
                {SHIFTS.map(s => (
                  <button key={s} onClick={() => setDeployShift(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${deployShift===s ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">District (optional)</label>
              <input value={deployDistrict} onChange={e => setDeployDistrict(e.target.value)} placeholder="All districts"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
            </div>
            <button onClick={handleDeploy} disabled={deploying}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background: 'linear-gradient(135deg, #ef4444, #b91c1c)'}}>
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" />Optimizing...</> : <><Zap className="w-4 h-4" />Optimize Deployment</>}
            </button>
          </div>
          <div className="space-y-4">
            {deployResult ? (
              <>
                <div className="glass rounded-2xl border border-emerald-500/20 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white text-sm">Coverage</h4>
                    <span className="text-2xl font-black text-emerald-400">{Math.round(deployResult.totalCoverage as number || 0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${deployResult.totalCoverage as number || 0}%`}} />
                  </div>
                </div>
                <div className="glass rounded-2xl border border-slate-700/50 p-5">
                  <h4 className="font-semibold text-white text-sm mb-3">Assignments</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {((deployResult.assignments as Record<string,unknown>[]) || []).map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/30">
                        <span className="text-xs text-white">{a.district as string}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{a.officers as number} officers</span>
                          <Badge label={`${Math.round(a.coverage as number || 0)}%`} color="green" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {deployResult.recommendations && (
                  <div className="glass rounded-2xl border border-slate-700/50 p-5">
                    <h4 className="font-semibold text-white text-sm mb-3">Recommendations</h4>
                    <ul className="space-y-1.5">
                      {((deployResult.recommendations as string[]) || []).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-red-400 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Run optimization to see deployment plan</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Compliance' && compliance && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-slate-700/50 p-6">
              <h3 className="font-semibold text-white mb-4">Current Status</h3>
              {[
                { label: 'Current Officers', value: complianceCurrent.officers as number || 290 },
                { label: 'Required (SB298)', value: complianceCurrent.required as number || 402 },
                { label: 'Gap', value: complianceCurrent.gap as number || 112 },
                { label: 'Population', value: ((complianceCurrent.population as number || 200603)).toLocaleString() },
                { label: 'Ratio (per 1k)', value: ((complianceCurrent.ratio as number || 0)).toFixed(2) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-700/30">
                  <span className="text-sm text-slate-400">{row.label}</span>
                  <span className="text-sm font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={handleComplianceScenario} disabled={runningScenario}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-all disabled:opacity-50">
              {runningScenario ? <><Loader2 className="w-4 h-4 animate-spin" />Modeling...</> : <><Zap className="w-4 h-4" />Run Compliance Scenario</>}
            </button>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-slate-700/50 p-5">
              <h4 className="font-semibold text-white text-sm mb-4">Projections</h4>
              <div className="space-y-2 max-h-60 overflow-auto">
                {((compliance.projections as Record<string,unknown>[]) || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/30">
                    <span className="text-xs text-slate-400">Year {p.year as number}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{p.officers as number} officers</span>
                      <Badge label={p.compliant ? 'Compliant' : 'Non-Compliant'} color={p.compliant ? 'green' : 'red'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {complianceScenario && (
              <div className="glass rounded-2xl border border-emerald-500/20 p-5">
                <h4 className="font-semibold text-white text-sm mb-3">Scenario Results</h4>
                <pre className="text-xs text-slate-300 overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(complianceScenario, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ROI Calculator' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-5">
            <h3 className="font-semibold text-white">Recruitment ROI Calculator</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Additional Officers: <span className="text-white font-bold">{roiOfficers}</span></label>
              <input type="range" min={1} max={112} value={roiOfficers} onChange={e => setRoiOfficers(+e.target.value)} className="w-full accent-red-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">District</label>
                <input value={roiDistrict} onChange={e => setRoiDistrict(e.target.value)} placeholder="All districts"
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Shift</label>
                <select value={roiShift} onChange={e => setRoiShift(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none">
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleRoi} disabled={calculatingRoi}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#ef4444,#b91c1c)'}}>
              {calculatingRoi ? <><Loader2 className="w-4 h-4 animate-spin"/>Calculating...</> : <><Zap className="w-4 h-4"/>Calculate ROI</>}
            </button>
          </div>
          <div>
            {roiResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'ROI', value: `${roiResult.roi || 0}%`, color: 'text-emerald-400' },
                    { label: 'Incident Reduction', value: `${roiResult.projectedIncidentReduction || 0}%`, color: 'text-blue-400' },
                    { label: 'Monthly Savings', value: `$${((roiResult.monthlySavings as number)||0).toLocaleString()}`, color: 'text-amber-400' },
                    { label: 'Annual Savings', value: `$${((roiResult.annualSavings as number)||0).toLocaleString()}`, color: 'text-emerald-400' },
                  ].map(stat => (
                    <div key={stat.label} className="glass rounded-xl border border-slate-700/50 p-4">
                      <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                      <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                {roiResult.breakdownByCategory && (
                  <div className="glass rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Breakdown by Category</h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={roiResult.breakdownByCategory as Record<string,unknown>[]}>
                        <XAxis dataKey="category" tick={{fontSize:10,fill:'#94a3b8'}} />
                        <YAxis tick={{fontSize:10,fill:'#94a3b8'}} />
                        <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',color:'#f1f5f9',fontSize:'12px'}} />
                        <Bar dataKey="reduction" fill="#ef4444" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Enter parameters and calculate to see ROI analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Analysis' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-slate-700/50 p-6 space-y-4">
            <h3 className="font-semibold text-white">AI Analysis Engine</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Analysis Type</label>
              <div className="flex gap-2 flex-wrap">
                {ANALYSIS_TYPES.map(t => (
                  <button key={t} onClick={() => setAnalysisType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${analysisType===t ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'}`}>
                    {t.replace('_',' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">District (optional)</label>
              <input value={analysisDistrict} onChange={e => setAnalysisDistrict(e.target.value)} placeholder="Leave blank for city-wide"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Query</label>
              <textarea value={analysisQuery} onChange={e => setAnalysisQuery(e.target.value)} rows={5}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 resize-none"
                placeholder="Describe what you want to analyze..." />
            </div>
            <button onClick={handleAnalyze} disabled={analyzing}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#ef4444,#b91c1c)'}}>
              {analyzing ? <><Loader2 className="w-4 h-4 animate-spin"/>Analyzing...</> : <><Zap className="w-4 h-4"/>Run Analysis</>}
            </button>
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 p-6">
            <h3 className="font-semibold text-white mb-4">AI Response</h3>
            {analyzing && (
              <div className="flex items-center gap-3 text-red-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Gemini AI is analyzing...</span>
              </div>
            )}
            {analysisResult ? (
              <div className="prose-dark text-xs leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">{analysisResult}</div>
            ) : !analyzing && (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">AI response will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Missing import
function TrendingUp(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
}
